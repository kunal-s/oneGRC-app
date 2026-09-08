import { Controller, Get, Query } from '@nestjs/common'
import { CurrentActor } from '../identity/actor.decorator'
import type { Actor } from '../identity/identity.types'
import { SearchService } from './search.service'

@Controller()
export class SearchController {
  constructor(private readonly search: SearchService) {}

  /**
   * R-006, SRCH-001: the one search read. No `department` parameter: the
   * boundary comes from the caller's own session (SRCH-037), never from
   * anything the client can set, so there is nothing here to widen.
   */
  @Get('search')
  async run(@CurrentActor() actor: Actor, @Query('q') q?: string) {
    return this.search.search(actor, q ?? '')
  }
}
