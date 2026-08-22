import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common'
import { Pool } from 'pg'

/**
 * The process-wide database handle.
 *
 * P0-02 uses `pg` directly, because Prisma cannot generate a client until the
 * schema has models — those land at P0-03. From P0-03 Prisma owns the domain
 * queries and this pool stays only for liveness probes and migration checks.
 *
 * Nothing outside `core` opens its own connection: every governed mutation
 * must be able to run inside one transaction with its audit entry (spec 17.5,
 * BR-AUD-01), and that is only possible with a single shared handle.
 */
@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DatabaseService.name)
  private readonly pool: Pool

  constructor() {
    const connectionString = process.env.DATABASE_URL
    if (!connectionString) {
      // Fail loudly at construction. A server that starts without a database
      // and reports itself healthy is worse than one that refuses to start.
      throw new Error('DATABASE_URL is not set — see .env.example')
    }
    this.pool = new Pool({ connectionString, max: 10 })
  }

  async onModuleInit(): Promise<void> {
    await this.ping()
    this.logger.log('Database connection established')
  }

  async onModuleDestroy(): Promise<void> {
    await this.pool.end()
  }

  /** A real round trip. Never cached — see HealthController. */
  async ping(): Promise<boolean> {
    const result = await this.pool.query<{ ok: number }>('SELECT 1 AS ok')
    return result.rows.length === 1 && Number(result.rows[0].ok) === 1
  }

  /**
   * Server-side Postgres version, for the health payload.
   * `SHOW` cannot be aliased, so read it through current_setting().
   */
  async serverVersion(): Promise<string> {
    const result = await this.pool.query<{ v: string }>(
      "SELECT current_setting('server_version') AS v",
    )
    return result.rows[0]?.v ?? 'unknown'
  }
}
