import { ForbiddenException, Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import type { Actor } from '../identity/identity.types'
import { evaluateAuthority, type AuthorityCheck } from './authority'

export type { AuthorityCheck }

/**
 * The single authority check (spec 4.10, BR-AUT-01), fetching the rows for an
 * action and handing them to the pure gate in `authority.ts`.
 *
 * Every governed action resolves through here. The matrix is DATA in
 * ActionAuthority, not conditionals scattered across handlers: that scattering
 * is precisely how a system ends up with one screen that lets the maker approve
 * their own filing.
 */
@Injectable()
export class AuthorityService {
  constructor(private readonly prisma: PrismaService) {}

  /** Throws ForbiddenException with a reason, or returns. */
  async assert(actor: Actor, check: AuthorityCheck): Promise<void> {
    const rows = await this.prisma.actionAuthority.findMany({ where: { action: check.action } })
    const result = evaluateAuthority(rows, actor, check)
    if (!result.ok) throw new ForbiddenException(result.message)
  }

  /** Non-throwing form, for deciding whether to offer an action in the UI. */
  async can(actor: Actor, check: AuthorityCheck): Promise<boolean> {
    try {
      await this.assert(actor, check)
      return true
    } catch {
      return false
    }
  }

  /**
   * R-002: the governed actions a caller may perform on a named record, as a
   * set. One named function realising what clause and provision detail
   * responses have so far built ad hoc, per action, in the controller
   * (platform.md R-002, SCR-082-071). The client renders what comes back; it
   * never decides it (SCR-082-070, SCR-082-072).
   */
  async capabilities(actor: Actor, actions: string[], makerId?: string | null): Promise<Record<string, boolean>> {
    const entries = await Promise.all(
      actions.map(async (action) => [action, await this.can(actor, { action, makerId })] as const),
    )
    return Object.fromEntries(entries)
  }
}
