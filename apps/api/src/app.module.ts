import { Module } from '@nestjs/common'
import { DatabaseModule } from './core/database/database.module'
import { HealthModule } from './health/health.module'

/**
 * Root module.
 *
 * `core/*` holds the one-engine-per-concern services every feature module
 * points at (spec 2): the database handle now; the clock, identity, authority,
 * audit trail, id allocator, reminder ladder and evidence vault as they land.
 * Feature modules must never grow private copies of those.
 */
@Module({
  imports: [DatabaseModule, HealthModule],
})
export class AppModule {}
