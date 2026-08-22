import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common'
import { PrismaClient } from '@prisma/client'

/**
 * The domain database handle.
 *
 * Every governed mutation runs inside a transaction opened here, so that a
 * change and its audit entry commit together or not at all (spec 17.5,
 * BR-AUD-01). Nothing outside `core` constructs its own client.
 *
 * `DatabaseService` (raw pg) remains alongside this for liveness probing —
 * a health check should exercise the connection, not the ORM.
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name)

  async onModuleInit(): Promise<void> {
    await this.$connect()
    this.logger.log('Prisma connected')
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect()
  }

  /** How many migrations have been applied. Surfaced on the health endpoint. */
  async appliedMigrations(): Promise<number> {
    const rows = await this.$queryRaw<Array<{ n: bigint }>>`
      SELECT count(*)::bigint AS n FROM "_prisma_migrations" WHERE finished_at IS NOT NULL
    `
    return Number(rows[0]?.n ?? 0)
  }
}
