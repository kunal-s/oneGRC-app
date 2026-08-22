import { createParamDecorator, ExecutionContext, UnauthorizedException } from '@nestjs/common'
import type { Actor } from './identity.types'

/**
 * Injects the resolved Actor into a handler. Throws if the request never
 * passed through ActorGuard, so a route cannot accidentally run anonymously.
 */
export const CurrentActor = createParamDecorator((_: unknown, ctx: ExecutionContext): Actor => {
  const req = ctx.switchToHttp().getRequest<{ actor?: Actor }>()
  if (!req.actor) throw new UnauthorizedException('no actor on request')
  return req.actor
})
