import { BadRequestException, Controller, Get, Post, Query } from '@nestjs/common'
import type { NotificationChannel, NotificationSeverity, Prisma } from '@prisma/client'
import { parseCycleId } from '@onegrc/domain'
import { CurrentActor } from '../identity/actor.decorator'
import type { Actor } from '../identity/identity.types'
import { DEPARTMENTS, DEPARTMENT_LABEL } from '../identity/scope'
import { GovernedMutationService } from '../governed/governed-mutation.service'
import { PrismaService } from '../prisma/prisma.service'
import { deliveryStateOf, type DeliveryState } from './derive'
import { headOf } from './recipients'
import { labelsForOffset } from './rungs'
import { LadderService } from './ladder.service'

const NOTIFICATION_SORT_FIELDS = ['at', 'title', 'entityId', 'rungOffsetDays', 'channel', 'delivery'] as const
type NotificationSortField = (typeof NOTIFICATION_SORT_FIELDS)[number]

const DELIVERY_WHERE: Record<DeliveryState, Prisma.NotificationWhereInput> = {
  delivered: { deliveredAt: { not: null } },
  failed: { deliveredAt: null, failedAt: { not: null } },
  retrying: { deliveredAt: null, failedAt: null, deliveryAttempts: { gt: 0 } },
  pending: { deliveredAt: null, failedAt: null, deliveryAttempts: 0 },
}

@Controller()
export class LadderController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ladder: LadderService,
    private readonly governed: GovernedMutationService,
  ) {}

  /**
   * R-065: who heads each department, so escalation resolves to a name.
   * Readable by every signed-in person: a person is entitled to know who
   * their escalation reaches (LDR-020, LDR-021).
   */
  @Get('department-heads')
  async departmentHeads() {
    const heads = await this.prisma.departmentHead.findMany({
      select: { department: true, personId: true, effectiveFrom: true },
    })
    const now = new Date()
    const personIds = Array.from(
      new Set(DEPARTMENTS.map((d) => headOf(d, now, heads)).filter((id): id is string => id !== null)),
    )
    const people = personIds.length
      ? await this.prisma.person.findMany({ where: { id: { in: personIds } }, select: { id: true, fullName: true, jobTitle: true } })
      : []
    const personById = new Map(people.map((p) => [p.id, p]))
    return DEPARTMENTS.map((department) => {
      const headId = headOf(department, now, heads)
      const head = headId ? personById.get(headId) : undefined
      return {
        department,
        label: DEPARTMENT_LABEL[department],
        head: head ? { personId: head.id, fullName: head.fullName, jobTitle: head.jobTitle } : null,
      }
    })
  }

  /**
   * R-007: fired reminders and escalations for the caller, with their
   * delivery state. The recipient is always the caller (LDR-068): a
   * notification is scoped by recipient, not by department, so the boundary
   * is narrower than a register's and never widened by a query parameter.
   *
   * Server-side filter, sort and paging (GAP-SCR-010-031, FLR-09, D-035),
   * reusing the shape [[SLICE-01C]] set on `GET /controls`.
   */
  @Get('notifications')
  async notifications(
    @CurrentActor() actor: Actor,
    @Query('unreadOnly') unreadOnly?: string,
    @Query('limit') limit?: string,
    @Query('severity') severity?: string,
    @Query('rung') rung?: string,
    @Query('channel') channel?: string,
    @Query('delivery') delivery?: string,
    @Query('read') read?: string,
    @Query('search') search?: string,
    @Query('sort') sort?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    const where: Prisma.NotificationWhereInput = { recipientId: actor.personId }
    if (unreadOnly === 'true') where.readAt = null
    if (severity) where.severity = severity as NotificationSeverity
    if (rung) where.rungOffsetDays = Number(rung)
    if (channel) where.channel = channel as NotificationChannel
    if (read === 'unread') where.readAt = null
    else if (read === 'read') where.readAt = { not: null }
    if (delivery) {
      const key = delivery as DeliveryState
      if (!DELIVERY_WHERE[key]) throw new BadRequestException(`unknown delivery state "${delivery}"`)
      Object.assign(where, DELIVERY_WHERE[key])
    }
    if (search?.trim()) {
      const q = search.trim()
      where.OR = [{ title: { contains: q, mode: 'insensitive' } }, { body: { contains: q, mode: 'insensitive' } }]
    }

    const [sortFieldRaw, sortDirRaw] = (sort ?? 'at:desc').split(':')
    const sortField = (sortFieldRaw ?? 'at') as NotificationSortField
    if (!NOTIFICATION_SORT_FIELDS.includes(sortField)) throw new BadRequestException(`unknown sort field "${sortField}"`)
    const dir = sortDirRaw === 'asc' ? 'asc' : 'desc'
    const orderBy: Prisma.NotificationOrderByWithRelationInput[] =
      sortField === 'delivery'
        ? [{ deliveredAt: dir }, { failedAt: dir }, { deliveryAttempts: dir }]
        : [{ [sortField]: dir } as Prisma.NotificationOrderByWithRelationInput]

    const take = limit ? Math.min(Number(limit), 200) : Math.min(Math.max(Number(pageSize) || 40, 1), 200)
    const pageNum = Math.max(Number(page) || 1, 1)

    const [rows, total] = await Promise.all([
      this.prisma.notification.findMany({ where, orderBy, skip: limit ? 0 : (pageNum - 1) * take, take }),
      this.prisma.notification.count({ where }),
    ])

    const routes = await this.routesFor(rows)

    return {
      total,
      items: rows.map((n) => ({
        id: n.id,
        at: n.at.toISOString(),
        title: n.title,
        body: n.body,
        severity: n.severity,
        entityType: n.entityType,
        entityId: n.entityId,
        route: n.entityId ? routes.get(n.entityId) ?? null : null,
        rung: n.rungOffsetDays !== null ? labelsForOffset(n.rungOffsetDays)?.intervalLabel ?? null : null,
        sentTo: n.rungOffsetDays !== null ? labelsForOffset(n.rungOffsetDays)?.targetRoleLabel ?? null : null,
        channel: n.channel,
        delivery: deliveryStateOf(n),
        isUnread: n.readAt === null,
      })),
    }
  }

  /** Opening the bell marks the rows it shows as read (SCR-083-012, kept from the prototype). */
  @Post('notifications/mark-read')
  async markRead(@CurrentActor() actor: Actor) {
    await this.prisma.notification.updateMany({
      where: { recipientId: actor.personId, readAt: null },
      data: { readAt: new Date() },
    })
    return { ok: true }
  }

  /**
   * The on-demand run (LDR-091, LDR-092): the same function the interval
   * calls. Governed as `ladder.run`, Administrator only (LDR-093).
   */
  @Post('ladder/run')
  async run(@CurrentActor() actor: Actor) {
    const { result, auditId } = await this.governed.run({
      actor,
      action: 'ladder.run',
      entityType: 'Ladder',
      work: async () => this.ladder.runTick(),
    })
    return { ...result, auditId }
  }

  /** Cycle and task subjects route to the one obligation detail that renders them (SCR-049). */
  private async routesFor(rows: Array<{ entityType: string | null; entityId: string | null }>): Promise<Map<string, string>> {
    const map = new Map<string, string>()
    const taskIds = rows.filter((r) => r.entityType === 'Task' && r.entityId).map((r) => r.entityId as string)
    const tasks = taskIds.length
      ? await this.prisma.task.findMany({ where: { id: { in: taskIds } }, select: { id: true, cycle: { select: { obligationId: true } } } })
      : []
    const taskToObligation = new Map(tasks.map((t) => [t.id, t.cycle?.obligationId]))

    for (const row of rows) {
      if (!row.entityId) continue
      if (row.entityType === 'ObligationCycle') {
        try {
          map.set(row.entityId, `/obligations/${parseCycleId(row.entityId).dutyId}`)
        } catch {
          // Not a cycle id shape; leave unrouted rather than guess.
        }
      } else if (row.entityType === 'Task') {
        const obligationId = taskToObligation.get(row.entityId)
        if (obligationId) map.set(row.entityId, `/obligations/${obligationId}`)
      }
    }
    return map
  }
}
