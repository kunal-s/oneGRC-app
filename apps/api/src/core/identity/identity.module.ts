import { Global, Module } from '@nestjs/common'
import { IdentityController } from './identity.controller'
import { OidcService } from './oidc.service'
import { SessionService } from './session.service'
import { ActorGuard } from './actor.guard'

@Global()
@Module({
  controllers: [IdentityController],
  providers: [SessionService, ActorGuard, OidcService],
  exports: [SessionService, ActorGuard],
})
export class IdentityModule {}
