import { BadRequestException, Body, Controller, Get, Post, Query, Req, Res } from '@nestjs/common'
import '@fastify/cookie'
import type { FastifyReply, FastifyRequest } from 'fastify'
import { PrismaService } from '../prisma/prisma.service'
import { CurrentActor } from './actor.decorator'
import { SESSION_COOKIE, type Actor } from './identity.types'
import { OidcService, OidcUnavailableError } from './oidc.service'
import { Public } from './public.decorator'
import { SessionService } from './session.service'

const webOrigin = () => process.env.WEB_ORIGIN ?? 'http://localhost:5173'

/** Only a same-origin relative path is ever followed. GAP-SCR-011-004, and no open redirect. */
function safeReturnTo(raw: unknown): string {
  if (typeof raw !== 'string' || !raw.startsWith('/') || raw.startsWith('//') || raw.includes('://')) {
    return '/'
  }
  return raw
}

function setSessionCookie(reply: FastifyReply, sessionId: string): void {
  reply.setCookie(SESSION_COOKIE, sessionId, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    secure: process.env.NODE_ENV === 'production',
  })
}

@Controller()
export class IdentityController {
  constructor(
    private readonly sessions: SessionService,
    private readonly prisma: PrismaService,
    private readonly oidc: OidcService,
  ) {}

  /** Who the server thinks you are. The client never asserts this. R-001. */
  @Get('whoami')
  whoami(@CurrentActor() actor: Actor): Actor {
    return actor
  }

  /**
   * Sends the browser to the customer's identity provider, preserving the
   * route originally requested. GAP-SCR-011-002, GAP-SCR-011-004, D-044.
   *
   * When no provider is configured, the platform has no local sign-in path to
   * fall back to (GAP-SCR-011-001), so this sends the browser to the error
   * state instead. GAP-SCR-011-030.
   */
  @Public()
  @Get('auth/login')
  async login(@Query('returnTo') returnTo: unknown, @Res({ passthrough: true }) reply: FastifyReply) {
    try {
      const url = await this.oidc.authorizationUrl(safeReturnTo(returnTo))
      reply.redirect(url, 302)
    } catch (err) {
      if (err instanceof OidcUnavailableError) {
        reply.redirect(`${webOrigin()}/auth/unavailable`, 302)
        return
      }
      throw err
    }
  }

  /**
   * Exchanges the provider's assertion for a platform session.
   * GAP-SCR-011-003, GAP-SCR-011-010, GAP-SCR-011-011.
   *
   * An assertion for a subject the platform holds no Person for, or whose
   * Person is not Active, is refused and no Person is created. Rule 7.
   * GAP-SCR-011-020, GAP-SCR-011-021, GAP-SCR-011-022.
   */
  @Public()
  @Get('auth/callback')
  async callback(
    @Query() query: { code?: string; state?: string; error?: string; error_description?: string },
    @Res({ passthrough: true }) reply: FastifyReply,
  ) {
    let claims: Record<string, unknown>
    let returnTo: string
    try {
      const result = await this.oidc.handleCallback(query)
      claims = result.claims
      returnTo = result.returnTo
    } catch {
      reply.redirect(`${webOrigin()}/auth/unavailable`, 302)
      return
    }

    const subject = claims[this.oidc.subjectClaimName()]
    const person =
      typeof subject === 'string' ? await this.prisma.person.findUnique({ where: { email: subject } }) : null

    if (!person || person.status !== 'Active') {
      reply.redirect(`${webOrigin()}/auth/refused`, 302)
      return
    }

    const sessionId = await this.sessions.create(person.id)
    setSessionCookie(reply, sessionId)
    reply.redirect(`${webOrigin()}${returnTo}`, 302)
  }

  /** Ends the session server side. GAP-SCR-011-012, GAP-SCR-011-014. */
  @Public()
  @Post('auth/logout')
  async signOut(@Req() req: FastifyRequest, @Res({ passthrough: true }) reply: FastifyReply) {
    const sessionId = req.cookies?.[SESSION_COOKIE]
    if (sessionId) await this.sessions.revoke(sessionId)
    reply.clearCookie(SESSION_COOKIE, { path: '/' })
    return { ok: true }
  }

  /** The browser-navigable form of sign-out, for a plain link rather than a script. */
  @Public()
  @Get('auth/logout')
  async signOutAndRedirect(@Req() req: FastifyRequest, @Res({ passthrough: true }) reply: FastifyReply) {
    const sessionId = req.cookies?.[SESSION_COOKIE]
    if (sessionId) await this.sessions.revoke(sessionId)
    reply.clearCookie(SESSION_COOKIE, { path: '/' })
    reply.redirect(webOrigin(), 302)
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
    setSessionCookie(reply, id)
    return { personId: person.id, fullName: person.fullName }
  }

  @Public()
  @Post('dev/logout')
  async logout(@Res({ passthrough: true }) reply: FastifyReply) {
    reply.clearCookie(SESSION_COOKIE, { path: '/' })
    return { ok: true }
  }
}
