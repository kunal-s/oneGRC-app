import { Injectable, Logger } from '@nestjs/common'
import type { Prisma } from '@prisma/client'
import { AuditService } from '../audit/audit.service'
import { AuthorityService } from '../authority/authority.service'
import type { Actor } from '../identity/identity.types'
import { PrismaService } from '../prisma/prisma.service'

export interface GovernedMutation<T> {
  actor: Actor
  /** The action name in the authority matrix, e.g. clause.save. */
  action: string
  entityType: string
  entityId?: string | null
  /** Who submitted the item, when the action approves someone else work. */
  makerId?: string | null
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
 *   2. the change and its audit entry, in ONE transaction
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

    return this.prisma.$transaction(async (tx) => {
      const result = await m.work(tx)
      const auditId = await this.audit.append(tx, {
        actorId: m.actor.personId,
        actorLabel: m.actor.fullName,
        action: m.action,
        entityType: m.entityType,
        entityId: m.entityId ?? null,
        detail: m.detail,
      })
      this.logger.log(`${m.action} by ${m.actor.fullName} -> ${auditId}`)
      return { result, auditId }
    })
  }
}
