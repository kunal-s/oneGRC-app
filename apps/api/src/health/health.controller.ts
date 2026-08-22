import { Controller, Get } from '@nestjs/common'
import { DatabaseService } from '../core/database/database.service'

interface HealthResponse {
  status: 'ok' | 'degraded'
  db: 'ok' | 'down'
  dbVersion?: string
  /** Server time, ISO-8601. From P0-06 this comes from ClockService (BR-SCH-09). */
  at: string
}

@Controller('health')
export class HealthController {
  constructor(private readonly db: DatabaseService) {}

  /**
   * Liveness plus a genuine database round trip.
   *
   * This queries the database rather than reporting a cached flag: a health
   * endpoint that cannot fail is not a health endpoint, and a silently broken
   * connection is indistinguishable from a working one (spec 17.6).
   */
  @Get()
  async check(): Promise<HealthResponse> {
    try {
      const ok = await this.db.ping()
      return {
        status: ok ? 'ok' : 'degraded',
        db: ok ? 'ok' : 'down',
        dbVersion: ok ? await this.db.serverVersion() : undefined,
        at: new Date().toISOString(),
      }
    } catch {
      return { status: 'degraded', db: 'down', at: new Date().toISOString() }
    }
  }
}
