import { BadRequestException, Body, Controller, Get, Post, Res } from '@nestjs/common'
import '@fastify/cookie'
import type { FastifyReply } from 'fastify'
import { PrismaService } from '../prisma/prisma.service'
import { CurrentActor } from './actor.decorator'
import { SESSION_COOKIE, type Actor } from './identity.types'
import { Public } from './public.decorator'
import { SessionService } from './session.service'

@Controller()
export class IdentityController {
  constructor(
    private readonly sessions: SessionService,
    private readonly prisma: PrismaService,
  ) {}

  /** Who the server thinks you are. The client never asserts this. */
  @Get('whoami')
  whoami(@CurrentActor() actor: Actor): Actor {
    return actor
  }

  /**
   * Development impersonation.
   *
   * This is the persona switcher made honest: it sets the SERVER identity
   * rather than filtering the client. It exists only while AUTH_MODE=dev; in
   * production the identity arrives from the customer IdP and this endpoint
   * refuses (ADR-002, G-02).
   */
  @Public()
  @Post('dev/impersonate')
  async impersonate(
    @Body() body: { personId?: string; email?: string },
    @Res({ passthrough: true }) reply: FastifyReply,
  ) {
    if (process.env.AUTH_MODE !== 'dev') {
      throw new BadRequestException('impersonation is disabled outside AUTH_MODE=dev')
    }
    const person = body.personId
      ? await this.prisma.person.findUnique({ where: { id: body.personId } })
      : body.email
        ? await this.prisma.person.findUnique({ where: { email: body.email } })
        : null
    if (!person) throw new BadRequestException('no such person')

    const id = await this.sessions.create(person.id)
    reply.setCookie(SESSION_COOKIE, id, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      secure: process.env.NODE_ENV === 'production',
    })
    return { personId: person.id, fullName: person.fullName }
  }

  @Public()
  @Post('dev/logout')
  async logout(@Res({ passthrough: true }) reply: FastifyReply) {
    reply.clearCookie(SESSION_COOKIE, { path: '/' })
    return { ok: true }
  }
}
