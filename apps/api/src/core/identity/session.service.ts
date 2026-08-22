import { Injectable, UnauthorizedException } from '@nestjs/common'
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
 */
@Injectable()
export class SessionService {
  constructor(private readonly prisma: PrismaService) {}

  async create(personId: string): Promise<string> {
    const expiresAt = new Date(Date.now() + SESSION_HOURS * 3600_000)
    const s = await this.prisma.session.create({ data: { personId, expiresAt } })
    return s.id
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
      department: s.person.department,
      lineOfDefence: s.person.lineOfDefence,
      roles: s.person.roles.map((r) => r.roleCode),
    }
  }

  async revoke(sessionId: string): Promise<void> {
    await this.prisma.session.updateMany({
      where: { id: sessionId, revokedAt: null },
      data: { revokedAt: new Date() },
    })
  }
}
