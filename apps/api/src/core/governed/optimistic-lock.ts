import { ConflictException, NotFoundException } from '@nestjs/common'
import type { Prisma } from '@prisma/client'

/**
 * Entities carrying a version marker (SLICE-01D, CON-001). Scoped to the
 * entities that are ever the NAMED subject of a governed update today.
 * ObligationCycle and Evidence change only as a side effect inside a Task's
 * own governed write, never as the named entity of one, so they carry no
 * marker of their own yet: there is no independent edit path for a second
 * writer to race against.
 */
export const VERSIONED_ENTITIES = new Set(['SourceProvision', 'ProvisionFlag', 'SourceClause', 'Task'])

/**
 * Confidential modules: a conflict names the act, never the content
 * (CON-014, platform.md AUD-06, BR-AUD-05). Empty until a confidential
 * module exists (M-14); the gate is built now so nothing has to change
 * when one does.
 */
export const CONFIDENTIAL_ENTITIES = new Set<string>([])

type Row = Record<string, unknown>

function delegateFor(tx: Prisma.TransactionClient, entityType: string) {
  const key = entityType.charAt(0).toLowerCase() + entityType.slice(1)
  const delegate = (tx as unknown as Record<string, unknown>)[key]
  if (!delegate) throw new Error(`no Prisma delegate for entityType "${entityType}"`)
  return delegate as {
    findUnique: (args: { where: { id: string } }) => Promise<Row | null>
    updateMany: (args: {
      where: { id: string; version: number }
      data: { version: { increment: number } }
    }) => Promise<{ count: number }>
  }
}

/**
 * CON-004 to CON-007: checked inside the transaction, after authority and
 * before the work, and atomically via the update's own WHERE clause so a
 * conflict is judged against the row as it stands at commit, not as it
 * stood when the caller read it. Returns the pre-write row, for the
 * before/after diff CON-013 needs.
 *
 * Throws (rolling back the transaction, CON-007) when the row is gone or
 * the version does not match.
 */
export async function checkAndBumpVersion(
  tx: Prisma.TransactionClient,
  entityType: string,
  entityId: string,
  expectedVersion: number,
): Promise<Row> {
  const delegate = delegateFor(tx, entityType)
  const before = await delegate.findUnique({ where: { id: entityId } })
  if (!before) throw new NotFoundException(`no ${entityType} ${entityId}`)

  const bump = await delegate.updateMany({
    where: { id: entityId, version: expectedVersion },
    data: { version: { increment: 1 } },
  })
  if (bump.count === 0) {
    throw await buildConflictError(tx, entityType, entityId)
  }
  return before
}

/** The row after work() ran, for the same diff. */
export async function readAfter(tx: Prisma.TransactionClient, entityType: string, entityId: string): Promise<Row | null> {
  return delegateFor(tx, entityType).findUnique({ where: { id: entityId } })
}

/**
 * Which scalar fields differ between two snapshots of the same row.
 * Confidential entities report only that a change happened, never its
 * shape (CON-014).
 */
export function diffFields(entityType: string, before: Row, after: Row): Record<string, { before: unknown; after: unknown }> | null {
  if (CONFIDENTIAL_ENTITIES.has(entityType)) return null
  const changed: Record<string, { before: unknown; after: unknown }> = {}
  for (const key of Object.keys(after)) {
    if (key === 'version') continue
    const b = (before as Row)[key]
    const a = after[key]
    if (JSON.stringify(b) !== JSON.stringify(a)) changed[key] = { before: b, after: a }
  }
  return changed
}

/**
 * REF-25, built from the audit entry the intervening writer's own governed
 * write already left behind (CON-010 to CON-013): the person's full name
 * (already the audit entry's actorLabel), the time in the organisation's
 * time zone (read directly, ENG-09 is not built, see the work order's
 * section 8), and the fields that entry's own before/after diff recorded.
 */
async function buildConflictError(tx: Prisma.TransactionClient, entityType: string, entityId: string): Promise<ConflictException> {
  const last = await tx.auditEntry.findFirst({
    where: { entityType, entityId },
    orderBy: { seq: 'desc' },
  })
  const org = await tx.organization.findFirst({ select: { timezone: true } })
  const timezone = org?.timezone ?? 'Asia/Kolkata'

  const person = last?.actorLabel ?? 'Someone'
  const at = last
    ? new Intl.DateTimeFormat('en-IN', {
        timeZone: timezone,
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(last.at)
    : 'an earlier time'

  const detail = last?.detail as { fieldChanges?: Record<string, unknown> } | null
  const fields = detail?.fieldChanges ? Object.keys(detail.fieldChanges) : []
  const whatChanged = CONFIDENTIAL_ENTITIES.has(entityType)
    ? 'the record'
    : fields.length > 0
      ? fields.join(', ')
      : 'the record'

  return new ConflictException(`${person} changed this record at ${at}: ${whatChanged}. Review and try again.`)
}
