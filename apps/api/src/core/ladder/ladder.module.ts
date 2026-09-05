import { Logger, Module, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common'
import { transportFromEnv } from './delivery'
import { LADDER_TRANSPORT } from './delivery.token'
import { LadderController } from './ladder.controller'
import { LadderService } from './ladder.service'

/**
 * LDR-050: the tick interval, in milliseconds. No external scheduler, no cron
 * service and no hosted queue (CON-01, CON-03): it runs inside this process.
 * The build's own choice, one minute, named here rather than invented in the
 * plan; `LADDER_TICK_MS` overrides it for a faster demonstration or a slower
 * production cadence without a code change.
 */
const DEFAULT_TICK_MS = 60_000

@Module({
  controllers: [LadderController],
  providers: [
    LadderService,
    { provide: LADDER_TRANSPORT, useFactory: () => transportFromEnv(process.env) },
  ],
  exports: [LadderService],
})
export class LadderModule implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(LadderModule.name)
  private timer?: NodeJS.Timeout

  constructor(private readonly ladder: LadderService) {}

  onModuleInit(): void {
    const ms = Number(process.env.LADDER_TICK_MS) || DEFAULT_TICK_MS
    this.timer = setInterval(() => {
      this.ladder.runTick().catch((err) => this.logger.error(`ladder tick failed: ${String(err)}`))
    }, ms)
    this.logger.log(`ladder engine ticking every ${ms}ms`)
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer)
  }
}
