import { Inject, Injectable, Logger } from '@nestjs/common'
import type { Department, NotificationChannel, PreferenceChannel, DigestCadence } from '@prisma/client'
import { AuditService } from '../audit/audit.service'
import { PrismaService } from '../prisma/prisma.service'
import { contentFor, severityFor } from './content'
import { deliveryStateOf, type DeliveryState } from './derive'
import { LADDER_TRANSPORT } from './delivery.token'
import type { DeliveryTransport } from './delivery'
import { activeCycleSubjects, activeTaskSubjects, type LadderSubject } from './registry'
import { resolveRecipients, type DepartmentHeadRow } from './recipients'
import { computeRungs, type Rung, type RungKind } from './rungs'

/** LDR-085, the build's own choice, named in the final report rather than invented in the plan. */
const MAX_DELIVERY_ATTEMPTS = 5
const DIGEST_INTERVAL_MS: Record<'daily' | 'weekly', number> = {
  daily: 24 * 3600000,
  weekly: 7 * 24 * 3600000,
}

function channelRowsFor(
  pref: { channels: PreferenceChannel[]; digest: DigestCadence } | undefined,
  rungKind: RungKind,
): NotificationChannel[] {
  const rows: NotificationChannel[] = ['inApp']
  const wantsEmail = (pref?.channels ?? ['inApp']).includes('email')
  if (!wantsEmail) return rows
  // An escalation rung is never digested and never held (LDR-073): only a
  // reminder's email can become a digest row, and only under a non-immediate
  // cadence.
  if (rungKind === 'reminder' && pref && pref.digest !== 'immediate') rows.push('digest')
  else rows.push('email')
  return rows
}

function worstDeliveryState(states: DeliveryState[]): DeliveryState {
  const order: DeliveryState[] = ['failed', 'retrying', 'pending', 'delivered']
  return order.find((s) => states.includes(s)) ?? 'delivered'
}

export interface LadderRungView {
  offsetDays: number
  intervalLabel: string
  targetRoleLabel: string
  state: 'fired' | 'scheduled' | 'ended'
  moment: string
  recipients: string[]
  delivery: DeliveryState | null
  unresolvedDepartment: string | null
}

/**
 * ENG-01, the one reminder and escalation ladder, built real (LDR-050 to
 * LDR-095). One tick, run on an interval and on demand through the same
 * function (LDR-090 to LDR-092): fires every rung whose moment has passed
 * and which has not already fired, writes its recipients and its one audit
 * entry in one transaction (LDR-053), then attempts delivery, retries a
 * failed one and runs the digest.
 */
@Injectable()
export class LadderService {
  private readonly logger = new Logger(LadderService.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    @Inject(LADDER_TRANSPORT) private readonly transport: DeliveryTransport,
  ) {}

  /** The on-demand run and the interval tick call this same function (LDR-092). */
  async runTick(): Promise<{ fired: number }> {
    const now = new Date()
    const org = await this.prisma.organization.findFirstOrThrow()
    const heads = await this.departmentHeads()

    const [cycles, tasks] = await Promise.all([
      activeCycleSubjects(this.prisma),
      activeTaskSubjects(this.prisma),
    ])

    let fired = 0
    for (const subject of [...cycles, ...tasks]) {
      const rungs = computeRungs(subject.dueDate, org.timezone)
      for (const rung of rungs) {
        // A rung whose moment has not arrived does not fire, and is not
        // written (LDR-038). A rung whose moment passed while the platform
        // was not running fires on this, the next tick after it starts
        // (LDR-039): there is no separate catch-up path, only this same
        // check against the real clock.
        if (rung.moment.getTime() > now.getTime()) continue
        try {
          if (await this.fireRung(subject, rung, heads)) fired++
        } catch (err) {
          // The database's own uniqueness is what makes a rung fire exactly
          // once (LDR-052), so a conflict here means a concurrent tick won
          // the race for this exact rung: it fired once, just not through
          // this call. Any other failure is logged and the tick moves on to
          // the next rung, rather than losing every remaining subject to one
          // bad row.
          this.logger.warn(
            `could not fire ${subject.entityType} ${subject.entityId} ${rung.eventType} offset ${rung.offsetDays}: ${String(err)}`,
          )
        }
      }
    }

    await this.retryFailedDeliveries(now)
    await this.runDigests(now)
    return { fired }
  }

  private async departmentHeads(): Promise<DepartmentHeadRow[]> {
    return this.prisma.departmentHead.findMany({
      select: { department: true, personId: true, effectiveFrom: true },
    })
  }

  /**
   * One rung, one transaction (LDR-053): the notification rows for its
   * recipients and its one system-actor audit entry commit together or not
   * at all (LDR-054, LDR-057). Returns false without writing anything when
   * the rung already fired.
   */
  private async fireRung(subject: LadderSubject, rung: Rung, heads: DepartmentHeadRow[]): Promise<boolean> {
    const already = await this.prisma.notification.findFirst({
      where: {
        entityType: subject.entityType,
        entityId: subject.entityId,
        eventType: rung.eventType,
        rungOffsetDays: rung.offsetDays,
      },
      select: { id: true },
    })
    if (already) return false

    const { recipientIds, unresolvedDepartment } = resolveRecipients(
      rung,
      { ownerId: subject.ownerId, ownerDepartment: subject.ownerDepartment },
      heads,
    )

    const people = recipientIds.length
      ? await this.prisma.person.findMany({ where: { id: { in: recipientIds } }, select: { id: true, fullName: true, email: true } })
      : []
    const personById = new Map(people.map((p) => [p.id, p]))
    const prefs = recipientIds.length
      ? await this.prisma.notificationPreference.findMany({ where: { personId: { in: recipientIds }, eventType: rung.eventType } })
      : []
    const prefById = new Map(prefs.map((p) => [p.personId, p]))

    const { title, body } = contentFor(rung, { shortTitle: subject.shortTitle, ownerName: subject.ownerName }, unresolvedDepartment)
    const severity = severityFor(rung)

    const created: Array<{ id: string; channel: NotificationChannel; recipientEmail: string | null }> = []

    await this.prisma.$transaction(async (tx) => {
      for (const recipientId of recipientIds) {
        const channels = channelRowsFor(prefById.get(recipientId), rung.kind)
        for (const channel of channels) {
          const row = await tx.notification.create({
            data: {
              recipientId,
              eventType: rung.eventType,
              title,
              body,
              severity,
              entityType: subject.entityType,
              entityId: subject.entityId,
              channel,
              rungOffsetDays: rung.offsetDays,
              dueAt: rung.moment,
              // The in-app channel is delivered by the row existing, and its
              // confirmation is stamped in this same transaction (LDR-081).
              // Email and digest confirm afterwards, so a network call never
              // holds this transaction open.
              deliveredAt: channel === 'inApp' ? new Date() : null,
            },
          })
          created.push({ id: row.id, channel, recipientEmail: personById.get(recipientId)?.email ?? null })
        }
      }

      // A system event, not a governed mutation: it never calls
      // AuthorityService.assert and writes through AuditService.append
      // directly, inside its own transaction, the way sample.purge's system
      // entry already does (LDR-057).
      await this.audit.append(tx, {
        actorId: null,
        actorLabel: 'system',
        action: 'ladder.fire',
        entityType: subject.entityType,
        entityId: subject.entityId,
        detail: {
          intervalLabel: rung.intervalLabel,
          targetRoleLabel: rung.targetRoleLabel,
          recipients: recipientIds.map((id) => personById.get(id)?.fullName ?? id),
          channels: created.map((c) => c.channel),
          dueAt: rung.moment.toISOString(),
          ...(unresolvedDepartment ? { unresolvedDepartment } : {}),
        },
      })
    })

    for (const row of created) {
      if (row.channel === 'email') await this.attemptDelivery(row.id, row.recipientEmail, title, body)
    }
    return true
  }

  private async attemptDelivery(id: string, recipientEmail: string | null, title: string, body: string): Promise<void> {
    const result = await this.transport.send({ recipientEmail, title, body })
    await this.prisma.notification.update({
      where: { id },
      data: result.ok
        ? { deliveredAt: new Date(), deliveryAttempts: { increment: 1 }, lastAttemptAt: new Date(), lastError: null }
        : { deliveryAttempts: { increment: 1 }, lastAttemptAt: new Date(), lastError: result.error ?? 'delivery failed' },
    })
  }

  /**
   * A failed delivery is retried with an increasing gap between attempts, up
   * to a bounded number, after which the failure moment and the last error
   * are recorded and the retrying stops (LDR-085). A retry never re-fires
   * the rung: it is another attempt at delivering the row that already
   * exists (LDR-086).
   */
  private async retryFailedDeliveries(now: Date): Promise<void> {
    const candidates = await this.prisma.notification.findMany({
      where: { channel: 'email', deliveredAt: null, failedAt: null, deliveryAttempts: { gt: 0, lt: MAX_DELIVERY_ATTEMPTS } },
      include: { recipient: { select: { email: true } } },
    })
    for (const row of candidates) {
      const gapMinutes = Math.min(2 ** row.deliveryAttempts, 60)
      const eligibleAt = new Date((row.lastAttemptAt ?? row.at).getTime() + gapMinutes * 60000)
      if (eligibleAt > now) continue

      const result = await this.transport.send({ recipientEmail: row.recipient.email, title: row.title, body: row.body ?? '' })
      if (result.ok) {
        await this.prisma.notification.update({
          where: { id: row.id },
          data: { deliveredAt: new Date(), deliveryAttempts: { increment: 1 }, lastAttemptAt: new Date(), lastError: null },
        })
        continue
      }
      const attempts = row.deliveryAttempts + 1
      await this.prisma.notification.update({
        where: { id: row.id },
        data:
          attempts >= MAX_DELIVERY_ATTEMPTS
            ? { deliveryAttempts: attempts, lastAttemptAt: new Date(), lastError: result.error, failedAt: new Date() }
            : { deliveryAttempts: attempts, lastAttemptAt: new Date(), lastError: result.error },
      })
    }
  }

  /**
   * A digest cadence of daily or weekly holds the email channel as `digest`
   * instead, and the digest run delivers those rows together as one message,
   * stamping each with its confirmation (LDR-074).
   */
  private async runDigests(now: Date): Promise<void> {
    const held = await this.prisma.notification.findMany({
      where: { channel: 'digest', deliveredAt: null, failedAt: null },
      include: { recipient: { select: { email: true } } },
      orderBy: { at: 'asc' },
    })
    if (held.length === 0) return

    const byRecipient = new Map<string, typeof held>()
    for (const row of held) {
      const list = byRecipient.get(row.recipientId) ?? []
      list.push(row)
      byRecipient.set(row.recipientId, list)
    }

    for (const [recipientId, rows] of byRecipient) {
      const pref = await this.prisma.notificationPreference.findUnique({
        where: { personId_eventType: { personId: recipientId, eventType: 'duty.approaching' } },
      })
      const cadence: 'daily' | 'weekly' = pref?.digest === 'weekly' ? 'weekly' : 'daily'
      const oldest = rows[0]!
      if (oldest.at.getTime() + DIGEST_INTERVAL_MS[cadence] > now.getTime()) continue

      const combinedBody = rows.map((r) => `${r.title}: ${r.body ?? ''}`).join('\n')
      const result = await this.transport.send({
        recipientEmail: oldest.recipient.email,
        title: `${rows.length} reminder${rows.length === 1 ? '' : 's'}`,
        body: combinedBody,
      })
      const stamp = new Date()
      for (const r of rows) {
        await this.prisma.notification.update({
          where: { id: r.id },
          data: result.ok
            ? { deliveredAt: stamp, deliveryAttempts: { increment: 1 }, lastAttemptAt: stamp, lastError: null }
            : { deliveryAttempts: { increment: 1 }, lastAttemptAt: stamp, lastError: result.error },
        })
      }
    }
  }

  /**
   * SCR-049-003: the whole ladder for one subject, fired rungs and scheduled
   * ones alike, because LDR-009 keeps the ladder derivable. A rung not yet
   * due reads as scheduled; once the subject is terminal, an unfired rung
   * reads as ended rather than scheduled forever (LDR-034, LDR-035, SCR-049-006).
   */
  async ladderViewFor(
    entityType: 'ObligationCycle' | 'Task',
    entityId: string,
    dueDate: Date,
    ownerId: string,
    ownerDepartment: Department,
    active: boolean,
  ): Promise<LadderRungView[]> {
    const org = await this.prisma.organization.findFirstOrThrow()
    const heads = await this.departmentHeads()
    const rungs = computeRungs(dueDate, org.timezone)
    const fired = await this.prisma.notification.findMany({
      where: { entityType, entityId },
      include: { recipient: { select: { fullName: true } } },
    })

    return Promise.all(
      rungs.map(async (rung): Promise<LadderRungView> => {
        const rows = fired.filter((f) => f.eventType === rung.eventType && f.rungOffsetDays === rung.offsetDays)
        if (rows.length > 0) {
          return {
            offsetDays: rung.offsetDays,
            intervalLabel: rung.intervalLabel,
            targetRoleLabel: rung.targetRoleLabel,
            state: 'fired',
            moment: rows[0]!.at.toISOString(),
            recipients: Array.from(new Set(rows.map((r) => r.recipient.fullName))),
            delivery: worstDeliveryState(rows.map(deliveryStateOf)),
            unresolvedDepartment: null,
          }
        }
        const { recipientIds, unresolvedDepartment } = resolveRecipients(rung, { ownerId, ownerDepartment }, heads)
        const people = recipientIds.length
          ? await this.prisma.person.findMany({ where: { id: { in: recipientIds } }, select: { fullName: true } })
          : []
        return {
          offsetDays: rung.offsetDays,
          intervalLabel: rung.intervalLabel,
          targetRoleLabel: rung.targetRoleLabel,
          state: active ? 'scheduled' : 'ended',
          moment: rung.moment.toISOString(),
          recipients: people.map((p) => p.fullName),
          delivery: null,
          unresolvedDepartment: unresolvedDepartment ?? null,
        }
      }),
    )
  }
}
