import { BadRequestException, Injectable, Logger } from '@nestjs/common'
import type { Prisma } from '@prisma/client'
import { AuditService } from '../audit/audit.service'
import { AuthorityService } from '../authority/authority.service'
import type { Actor } from '../identity/identity.types'
import { PrismaService } from '../prisma/prisma.service'
import { checkAndBumpVersion, diffFields, readAfter, VERSIONED_ENTITIES } from './optimistic-lock'

export interface GovernedMutation<T> {
  actor: Actor
  /** The action name in the authority matrix, e.g. clause.save. */
  action: string
  entityType: string
  entityId?: string | null
  /** Who submitted the item, when the action approves someone else work. */
  makerId?: string | null
  /**
   * The version the caller read the entity at (SLICE-01D, CON-003, CON-004).
   * Required whenever entityType names one of VERSIONED_ENTITIES; a write
   * that omits it is refused rather than silently skipping the check.
   */
  expectedVersion?: number
  /** Recorded on the audit entry. Never the substance of a confidential case. */
  detail?: Prisma.InputJsonValue
  /** The change itself. Receives the transaction. */
  work: (tx: Prisma.TransactionClient) => Promise<T>
}

/**
 * The one path every governed change takes (spec 4.10, 17.5).
 *
 * Order matters and is fixed:
 *   1. authority, including the department gate and separation of duties
 *   2. the optimistic-lock check, against a versioned entity (SLICE-01D,
 *      CON-006)
 *   3. the change and its audit entry, in ONE transaction
 *
 * Because both happen in a single transaction, a change that cannot be logged
 * does not commit, and a rejected change leaves no trace of having been
 * attempted beyond the refusal itself. Handlers never write directly.
 */
@Injectable()
export class GovernedMutationService {
  private readonly logger = new Logger(GovernedMutationService.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly authority: AuthorityService,
    private readonly audit: AuditService,
  ) {}

  async run<T>(m: GovernedMutation<T>): Promise<{ result: T; auditId: string }> {
    await this.authority.assert(m.actor, { action: m.action, makerId: m.makerId })

    const versioned = m.entityType && m.entityId && VERSIONED_ENTITIES.has(m.entityType)
    if (versioned && m.expectedVersion === undefined) {
      // CON-004: a client that has not been updated to send a version cannot
      // bypass the check by simply omitting it.
      throw new BadRequestException(
        `${m.action} requires the version you read ${m.entityType} ${m.entityId} at`,
      )
    }

    return this.prisma.$transaction(async (tx) => {
      let before: Record<string, unknown> | null = null
      if (versioned) {
        // CON-005 to CON-007: checked inside this transaction, after
        // authority, before the work, against the row as it stands at
        // commit.
        before = await checkAndBumpVersion(tx, m.entityType, m.entityId as string, m.expectedVersion as number)
      }

      const result = await m.work(tx)

      let fieldChanges: Record<string, { before: unknown; after: unknown }> | null = null
      if (versioned && before) {
        const after = await readAfter(tx, m.entityType, m.entityId as string)
        // CON-013: recorded on THIS entry, so a future conflicting writer can
        // read what this write changed.
        fieldChanges = after ? diffFields(m.entityType, before, after) : null
      }

      const auditId = await this.audit.append(tx, {
        actorId: m.actor.personId,
        actorLabel: m.actor.fullName,
        action: m.action,
        entityType: m.entityType,
        entityId: m.entityId ?? null,
        detail: fieldChanges && Object.keys(fieldChanges).length > 0
          ? ({ ...(m.detail as object ?? {}), fieldChanges } as Prisma.InputJsonValue)
          : m.detail,
      })
      this.logger.log(`${m.action} by ${m.actor.fullName} -> ${auditId}`)
      return { result, auditId }
    })
  }
}
