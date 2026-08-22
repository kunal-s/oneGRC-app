import { Global, Module } from '@nestjs/common'
import { AuthorityService } from '../authority/authority.service'
import { GovernedMutationService } from './governed-mutation.service'

@Global()
@Module({
  providers: [AuthorityService, GovernedMutationService],
  exports: [AuthorityService, GovernedMutationService],
})
export class GovernedModule {}
