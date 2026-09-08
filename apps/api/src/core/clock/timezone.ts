/**
 * The pure calendar-and-zone arithmetic behind the one clock service, ENG-09
 * (CLK-001, CLK-003). Moved here from `core/ladder/timezone.ts` unchanged:
 * `startOfDayInZone`, `calendarDateOf` and `addCalendarDays` were already
 * correct and unit-tested, and this slice absorbs a correct half of itself
 * behind the clock service rather than rewriting it (CLAUDE.md rule 5).
 *
 * A rung's moment is the start of its own day in the organisation's operating
 * time zone (LDR-011, BR-SCH-09), not a fixed 24-hour offset from the due
 * instant: the two agree everywhere except across a daylight-saving
 * transition, which India's zone never has, but the calculation is written to
 * be correct for any IANA zone rather than assuming that.
 */

/** The UTC offset, in minutes, a time zone keeps at a given instant. */
function offsetMinutesAt(instant: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(instant)
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? '0')
  // If this instant were read as UTC wall-clock time, it would show these
  // digits. The gap between that reading and the real instant is the offset.
  const asIfUtc = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second'))
  return (asIfUtc - instant.getTime()) / 60000
}

/**
 * The UTC instant of local midnight on the given calendar date, in the given
 * time zone. One refinement pass: the first guess's offset is computed at the
 * guess itself, which can be wrong by a day's worth of offset drift right at
 * a transition, so it is recomputed once at the corrected instant.
 */
export function startOfDayInZone(year: number, month: number, day: number, timeZone: string): Date {
  let guess = new Date(Date.UTC(year, month - 1, day))
  for (let i = 0; i < 2; i++) {
    const offset = offsetMinutesAt(guess, timeZone)
    guess = new Date(Date.UTC(year, month - 1, day) - offset * 60000)
  }
  return guess
}

/** A calendar date, timezone-independent: the Y/M/D a `@db.Date` column holds. */
export interface CalendarDate {
  year: number
  month: number
  day: number
}

/** Reads the calendar date a Prisma `@db.Date` value round-trips as (UTC midnight). */
export function calendarDateOf(d: Date): CalendarDate {
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate() }
}

/**
 * The calendar date a real instant (the current moment, never a `@db.Date`
 * value) falls on in the given time zone (CLK-001). Distinct from
 * `calendarDateOf`, which reads a date column's own UTC-midnight encoding:
 * "now" is not UTC midnight, so it must be read through the zone's own wall
 * clock instead.
 */
export function calendarDateInZone(instant: Date, timeZone: string): CalendarDate {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(instant)
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? '0')
  return { year: get('year'), month: get('month'), day: get('day') }
}

/** The calendar date `offsetDays` away (negative is earlier). */
export function addCalendarDays(d: CalendarDate, offsetDays: number): CalendarDate {
  const asDate = new Date(Date.UTC(d.year, d.month - 1, d.day))
  asDate.setUTCDate(asDate.getUTCDate() + offsetDays)
  return calendarDateOf(asDate)
}
