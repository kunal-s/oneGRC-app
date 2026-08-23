import { Module } from '@nestjs/common'
import { AuditModule } from "./core/audit/audit.module"
import { GovernedModule } from "./core/governed/governed.module"
import { DatabaseModule } from './core/database/database.module'
import { EnrichmentModule } from "./enrichment/enrichment.module"
import { DocumentsModule } from './core/documents/documents.module'
import { IdsModule } from './core/ids/ids.module'
import { PrismaModule } from './core/prisma/prisma.module'
import { IdentityModule } from "./core/identity/identity.module"
import { HealthModule } from './health/health.module'
import { ChainModule } from "./chain/chain.module"
import { ClausesModule } from "./clauses/clauses.module"
import { IngestionModule } from './ingestion/ingestion.module'
import { ProvisionsModule } from "./provisions/provisions.module"
import { SetupModule } from "./setup/setup.module"
import { InstrumentsModule } from './instruments/instruments.module'

/**
 * Root module.
 *
 * `core/*` holds the one-engine-per-concern services every feature module
 * points at (spec 2): the database handles, the document store and the id
 * allocator now; the clock, identity, authority, audit trail and reminder
 * ladder as they land. Feature modules must never grow private copies.
 */
@Module({
  imports: [
    DatabaseModule,
    PrismaModule,
    DocumentsModule,
    IdsModule,
    IdentityModule,
    AuditModule,
    GovernedModule,
    HealthModule,
    InstrumentsModule,
    IngestionModule,
    ClausesModule,
    ChainModule,
    EnrichmentModule,
    SetupModule,
    ProvisionsModule,
  ],
})
export class AppModule {}
