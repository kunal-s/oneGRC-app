import { Injectable, UnauthorizedException } from '@nestjs/common'
import { AuditService } from '../audit/audit.service'
import { PrismaService } from '../prisma/prisma.service'
import type { Actor } from './identity.types'

const SESSION_HOURS = 12

/**
 * Server-side sessions.
 *
 * The cookie carries an opaque id and nothing else: no roles, no department,
 * no claims. Authority is re-resolved from the database on every request, so
 * revoking a role takes effect immediately rather than at next login, and a
 * tampered cookie buys nothing.
 *
 * This is the one session engine: every path that opens or ends a session,
 * federated sign-in and development impersonation alike, goes through here,
 * so AUD-04's two entry kinds are written once rather than duplicated per
 * caller.
 */
@Injectable()
export class SessionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  /** Opens a session and writes the "session opened" AUD-04 entry, in one transaction. */
  async create(personId: string): Promise<string> {
    const expiresAt = new Date(Date.now() + SESSION_HOURS * 3600_000)
    return this.prisma.$transaction(async (tx) => {
      const s = await tx.session.create({ data: { personId, expiresAt } })
      await this.audit.append(tx, {
        actorId: personId,
        action: 'session.opened',
        entityType: 'Session',
        entityId: s.id,
      })
      return s.id
    })
  }

  async resolve(sessionId: string | undefined): Promise<Actor> {
    if (!sessionId) throw new UnauthorizedException('no session')

    const s = await this.prisma.session.findUnique({
      where: { id: sessionId },
      include: { person: { include: { roles: true } } },
    })
    if (!s || s.revokedAt || s.expiresAt < new Date()) {
      throw new UnauthorizedException('session expired or revoked')
    }
    if (s.person.status === 'Suspended') {
      throw new UnauthorizedException('person suspended')
    }

    return {
      personId: s.person.id,
      fullName: s.person.fullName,
      jobTitle: s.person.jobTitle,
      department: s.person.department,
      lineOfDefence: s.person.lineOfDefence,
      roles: s.person.roles.map((r) => r.roleCode),
    }
  }

  /** Ends a session and writes the "session ended" AUD-04 entry, in one transaction. GAP-SCR-011-014. */
  async revoke(sessionId: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const s = await tx.session.findUnique({ where: { id: sessionId } })
      if (!s || s.revokedAt) return

      await tx.session.update({ where: { id: sessionId }, data: { revokedAt: new Date() } })
      await this.audit.append(tx, {
        actorId: s.personId,
        action: 'session.ended',
        entityType: 'Session',
        entityId: s.id,
      })
    })
  }
}
