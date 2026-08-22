import { createHash } from 'node:crypto'
import { Injectable } from '@nestjs/common'
import { formatId } from '@onegrc/domain'
import type { Prisma } from '@prisma/client'

export interface AuditInput {
  actorId?: string | null
  actorLabel?: string | null
  action: string
  entityType: string
  entityId?: string | null
  /**
   * What changed. For confidential modules this records the ACT and never the
   * content (BR-AUD-05): that a report was triaged and by whom, not the
   * allegation itself.
   */
  detail?: Prisma.InputJsonValue
}

/**
 * The tamper-evident trail (spec 16, BR-AUD-01, BR-AUD-02).
 *
 * Each entry hashes its own content together with the previous hash, so any
 * later edit or deletion breaks the chain from that point and is detectable by
 * replaying it. The sequence is monotonic, so a removed row leaves a gap that
 * is itself evidence.
 *
 * Entries are ALWAYS written inside the caller transaction. A change that is
 * not logged must not commit (spec 17.5).
 */
@Injectable()
export class AuditService {
  /** Canonical serialisation: the hash must not depend on key order. */
  private static canonical(v: unknown): string {
    if (v === null || v === undefined) return 'null'
    if (Array.isArray(v)) return '[' + v.map((x) => AuditService.canonical(x)).join(',') + ']'
    if (typeof v === 'object') {
      const o = v as Record<string, unknown>
      const body = Object.keys(o)
        .sort()
        .map((k) => JSON.stringify(k) + ':' + AuditService.canonical(o[k]))
        .join(',')
      return '{' + body + '}'
    }
    return JSON.stringify(v)
  }

  static hashOf(parts: {
    seq: bigint
    at: Date
    actorId?: string | null
    action: string
    entityType: string
    entityId?: string | null
    detail?: unknown
    prevHash: string | null
  }): string {
    const payload = [
      parts.prevHash ?? '',
      parts.seq.toString(),
      parts.at.toISOString(),
      parts.actorId ?? '',
      parts.action,
      parts.entityType,
      parts.entityId ?? '',
      AuditService.canonical(parts.detail ?? null),
    ].join(' ')
    return createHash('sha256').update(payload).digest('hex')
  }

  /**
   * Append one entry inside an open transaction.
   *
   * The sequence comes from IdSequence, whose row lock serialises concurrent
   * writers for the remainder of their transactions. That is what guarantees
   * the chain has one unambiguous order rather than two writers both believing
   * they follow the same predecessor.
   */
  async append(tx: Prisma.TransactionClient, input: AuditInput): Promise<string> {
    const seqRows = await tx.$queryRawUnsafe<Array<{ value: number }>>(
      'INSERT INTO "IdSequence" ("scope", "value") VALUES (\'LOG\', 1) ' +
        'ON CONFLICT ("scope") DO UPDATE SET "value" = "IdSequence"."value" + 1 RETURNING "value"',
    )
    const seqNum = seqRows[0]?.value
    if (seqNum === undefined) throw new Error('could not allocate an audit sequence')
    const seq = BigInt(seqNum)

    const prev = await tx.auditEntry.findFirst({
      orderBy: { seq: 'desc' },
      select: { hash: true },
    })

    const at = new Date()
    const hash = AuditService.hashOf({
      seq,
      at,
      actorId: input.actorId ?? null,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId ?? null,
      detail: input.detail ?? null,
      prevHash: prev?.hash ?? null,
    })

    const id = formatId('LOG', seqNum)
    await tx.auditEntry.create({
      data: {
        id,
        seq,
        at,
        actorId: input.actorId ?? null,
        actorLabel: input.actorLabel ?? null,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId ?? null,
        detail: input.detail ?? undefined,
        prevHash: prev?.hash ?? null,
        hash,
      },
    })
    return id
  }
}
