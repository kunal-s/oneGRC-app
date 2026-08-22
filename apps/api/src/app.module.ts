import { Module } from '@nestjs/common'
import { DatabaseModule } from './core/database/database.module'
import { DocumentsModule } from './core/documents/documents.module'
import { PrismaModule } from './core/prisma/prisma.module'
import { HealthModule } from './health/health.module'

/**
 * Root module.
 *
 * `core/*` holds the one-engine-per-concern services every feature module
 * points at (spec 2): the database handles and the document store now; the
 * clock, identity, authority, audit trail, id allocator and reminder ladder as
 * they land. Feature modules must never grow private copies of those.
 */
@Module({
  imports: [DatabaseModule, PrismaModule, DocumentsModule, HealthModule],
})
export class AppModule {}
