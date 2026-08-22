import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { SESSION_COOKIE, type Actor } from './identity.types'
import { SessionService } from './session.service'

export const PUBLIC_ROUTE = 'onegrc:public'

/**
 * Resolves the session cookie into an Actor on every request.
 *
 * Applied globally and opt-OUT rather than opt-in: a new endpoint is protected
 * by default, because the failure mode of the opposite arrangement is an
 * unauthenticated route nobody noticed.
 */
@Injectable()
export class ActorGuard implements CanActivate {
  constructor(
    private readonly sessions: SessionService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(PUBLIC_ROUTE, [
      ctx.getHandler(),
      ctx.getClass(),
    ])
    if (isPublic) return true

    const req = ctx.switchToHttp().getRequest<{ cookies?: Record<string, string>; actor?: Actor }>()
    req.actor = await this.sessions.resolve(req.cookies?.[SESSION_COOKIE])
    return true
  }
}
