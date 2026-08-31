import { Controller, Get } from '@nestjs/common'
import { CurrentActor } from '../core/identity/actor.decorator'
import type { Actor } from '../core/identity/identity.types'
import { SetupService, type SampleStatus } from './setup.service'

@Controller('setup')
export class SetupController {
  constructor(private readonly setup: SetupService) {}

  /** Drives the "sample data present, purge before go-live" banner. */
  @Get('sample-status')
  status(@CurrentActor() _actor: Actor): Promise<SampleStatus> {
    return this.setup.sampleStatus()
  }
}
