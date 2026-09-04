import { ForbiddenException, Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import type { Actor } from '../identity/identity.types'

export interface AuthorityCheck {
  action: string
  /** Who made the item, for separation of duties. */
  makerId?: string | null
}

/**
 * The single authority check (spec 4.10, BR-AUT-01).
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

    if (rows.length === 0) {
      // An unknown action is refused rather than allowed. A typo in an action
      // name must not become an unguarded endpoint.
      throw new ForbiddenException(`no authority is defined for "${check.action}"`)
    }

    const permitted = rows.filter((r) => actor.roles.includes(r.roleCode))
    if (permitted.length === 0) {
      const allowed = [...new Set(rows.map((r) => r.roleCode))].join(', ')
      throw new ForbiddenException(
        `${check.action} requires one of [${allowed}]; you hold [${actor.roles.join(', ') || 'no roles'}]`,
      )
    }

    // Department gate (BR-AUT-02): some authority belongs to a function, not a
    // role. Four people hold Compliance Manager; only two sit in Compliance and
    // Company Secretarial, and only they may decide that a clause binds the firm.
    const deptGated = permitted.filter((r) => r.requiresDepartment !== null)
    if (deptGated.length === permitted.length) {
      const ok = deptGated.some((r) => r.requiresDepartment === actor.department)
      if (!ok) {
        const need = [...new Set(deptGated.map((r) => r.requiresDepartment))].join(', ')
        throw new ForbiddenException(
          `${check.action} is reserved to the ${need} department; you are in ${actor.department}`,
        )
      }
    }

    // Separation of duties (BR-AUT-05): the person who performed an action may
    // not be the person who approves it.
    if (permitted.some((r) => r.separationOfDuties) && check.makerId) {
      if (check.makerId === actor.personId) {
        throw new ForbiddenException(
          `${check.action} enforces separation of duties: you submitted this, so you cannot approve it`,
        )
      }
    }
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
