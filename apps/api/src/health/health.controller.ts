import { Controller, Get } from '@nestjs/common'
import { Public } from '../core/identity/public.decorator'
import { DatabaseService } from '../core/database/database.service'
import { PrismaService } from '../core/prisma/prisma.service'

interface HealthResponse {
  status: 'ok' | 'degraded'
  db: 'ok' | 'down'
  dbVersion?: string
  /** Applied migrations. Zero means the schema is not deployed. */
  migrations?: number
  /** Server time, ISO-8601. From P0-06 this comes from ClockService. */
  at: string
}

@Controller('health')
export class HealthController {
  constructor(
    private readonly db: DatabaseService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Liveness plus a genuine database round trip.
   *
   * This queries the database rather than reporting a cached flag: a health
   * endpoint that cannot fail is not a health endpoint, and a silently broken
   * connection is indistinguishable from a working one (spec 17.6).
   */
  // Liveness must answer without a session, or a load balancer cannot use it.
  @Public()
  @Get()
  async check(): Promise<HealthResponse> {
    try {
      const ok = await this.db.ping()
      if (!ok) return { status: 'degraded', db: 'down', at: new Date().toISOString() }

      return {
        status: 'ok',
        db: 'ok',
        dbVersion: await this.db.serverVersion(),
        migrations: await this.prisma.appliedMigrations(),
        at: new Date().toISOString(),
      }
    } catch {
      return { status: 'degraded', db: 'down', at: new Date().toISOString() }
    }
  }
}
