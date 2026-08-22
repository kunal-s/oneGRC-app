import { Global, Module } from '@nestjs/common'
import { IdentityController } from './identity.controller'
import { SessionService } from './session.service'
import { ActorGuard } from './actor.guard'

@Global()
@Module({
  controllers: [IdentityController],
  providers: [SessionService, ActorGuard],
  exports: [SessionService, ActorGuard],
})
export class IdentityModule {}
