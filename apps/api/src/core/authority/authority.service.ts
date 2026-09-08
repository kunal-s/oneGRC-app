import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import type { Actor } from '../identity/identity.types'
import { httpRefusal } from '../refusals/http'
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

  /** Throws the refusal from the catalogue (REFU-007: with its identifier on the wire), or returns. */
  async assert(actor: Actor, check: AuthorityCheck): Promise<void> {
    const result = await this.evaluate(actor, check)
    if (!result.ok) throw httpRefusal(403, result.message, result.ref)
  }

  /** Non-throwing form, for deciding whether to offer an action in the UI. */
  async can(actor: Actor, check: AuthorityCheck): Promise<boolean> {
    return (await this.evaluate(actor, check)).ok
  }

  /**
   * STATE-040: the catalogue text a caller would be refused with, without
   * throwing, so a screen can render the real reason a control is
   * unavailable instead of hand-writing a paragraph that can drift from the
   * authority matrix. `null` when the caller is authorised.
   */
  async reason(actor: Actor, check: AuthorityCheck): Promise<string | null> {
    const result = await this.evaluate(actor, check)
    return result.ok ? null : result.message
  }

  private async evaluate(actor: Actor, check: AuthorityCheck) {
    const rows = await this.prisma.actionAuthority.findMany({ where: { action: check.action } })
    return evaluateAuthority(rows, actor, check)
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
