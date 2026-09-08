import { Injectable, Logger, type OnModuleInit } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { isOverdueOn } from './overdue'
import { addCalendarDays, calendarDateInZone, startOfDayInZone, type CalendarDate } from './timezone'

/**
 * ENG-09, the one clock service (CLK-001, `BR-SCH-09`, CLAUDE.md rule 5).
 *
 * Answers four things and nothing else: the current instant, the
 * organisation's operating time zone, the calendar date that instant falls
 * on in that zone, and the instant a given calendar date ends in that zone.
 * Every server-side read of the present goes through it (CLK-004), except
 * the three named in `AuditService`, `SessionService` and `HealthController`
 * (CLK-005), which read `new Date()` directly for their own stated reasons.
 */
@Injectable()
export class ClockService implements OnModuleInit {
  private readonly logger = new Logger(ClockService.name)
  private zone: string | null = null

  constructor(private readonly prisma: PrismaService) {}

  /**
   * CLK-002: the zone comes from `Organization.timezone`, read once per
   * process, never a hard-coded fallback. A platform with no organisation
   * row has a setup failure, not a time zone, so this refuses to start
   * rather than guess one.
   */
  async onModuleInit(): Promise<void> {
    const org = await this.prisma.organization.findFirst({ select: { timezone: true } })
    if (!org) {
      throw new Error('ClockService: no Organization row exists. The platform has a setup failure, not a time zone to fall back to.')
    }
    this.zone = org.timezone
    this.logger.log(`operating time zone: ${this.zone}`)
  }

  /** The current instant. */
  now(): Date {
    return new Date()
  }

  /** The organisation's operating time zone, e.g. "Asia/Kolkata". */
  timezone(): string {
    if (!this.zone) {
      throw new Error('ClockService: timezone read before onModuleInit resolved it.')
    }
    return this.zone
  }

  /** The calendar date the current instant falls on, in the organisation's zone. */
  today(): CalendarDate {
    return calendarDateInZone(this.now(), this.timezone())
  }

  /** The instant the given calendar date ends in the organisation's zone: the start of the next one. */
  endOfDate(date: CalendarDate): Date {
    const next = addCalendarDays(date, 1)
    return startOfDayInZone(next.year, next.month, next.day, this.timezone())
  }

  /** DRV-17: whether a calendar date has passed, as at today, in the organisation's zone. */
  isPastDate(date: CalendarDate): boolean {
    return isOverdueOn(date, this.today())
  }
}
