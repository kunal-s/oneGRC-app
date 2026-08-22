import { Module } from '@nestjs/common'
import { DatabaseModule } from './core/database/database.module'
import { PrismaModule } from './core/prisma/prisma.module'
import { HealthModule } from './health/health.module'

/**
 * Root module.
 *
 * `core/*` holds the one-engine-per-concern services every feature module
 * points at (spec 2): the database handles now; the clock, identity, authority,
 * audit trail, id allocator, document store and reminder ladder as they land.
 * Feature modules must never grow private copies of those.
 */
@Module({
  imports: [DatabaseModule, PrismaModule, HealthModule],
})
export class AppModule {}
