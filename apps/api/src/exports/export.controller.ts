import { Controller, Get, Query, Res } from '@nestjs/common'
import type { FastifyReply } from 'fastify'
import { CurrentActor } from '../core/identity/actor.decorator'
import type { Actor } from '../core/identity/identity.types'
import { ExportService } from './export.service'

@Controller('exports')
export class ExportController {
  constructor(private readonly exports: ExportService) {}

  @Get('control-library/preview')
  previewControlLibrary(@CurrentActor() actor: Actor, @Query('department') department?: string) {
    return this.exports.previewControlLibrary(actor, department)
  }

  @Get('control-library.csv')
  async csvControlLibrary(
    @CurrentActor() actor: Actor,
    @Res() reply: FastifyReply,
    @Query('department') department?: string,
  ) {
    const { filename, body } = await this.exports.csvControlLibrary(actor, department)
    return reply
      .header('Content-Type', 'text/csv')
      .header('Content-Disposition', `attachment; filename="${filename}"`)
      .send(body)
  }

  @Get('source-library/preview')
  previewSourceLibrary() {
    return this.exports.previewSourceLibrary()
  }

  @Get('source-library.csv')
  async csvSourceLibrary(@CurrentActor() actor: Actor, @Res() reply: FastifyReply) {
    const { filename, body } = await this.exports.csvSourceLibrary(actor)
    return reply
      .header('Content-Type', 'text/csv')
      .header('Content-Disposition', `attachment; filename="${filename}"`)
      .send(body)
  }
}
