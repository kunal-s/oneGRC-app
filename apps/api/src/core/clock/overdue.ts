import type { CalendarDate } from './timezone'

/**
 * DRV-17: a calendar date has passed once `today` is later than it, compared
 * as a calendar date rather than as an instant. Pure and DB-free, proven the
 * way `evaluateAuthority()` and `computeScope()` are (CLK-007): a duty due
 * today is never overdue at any hour of today, and is overdue from the first
 * instant of tomorrow, in whatever zone `today` was read in.
 */
export function isOverdueOn(dueDate: CalendarDate, today: CalendarDate): boolean {
  if (today.year !== dueDate.year) return today.year > dueDate.year
  if (today.month !== dueDate.month) return today.month > dueDate.month
  return today.day > dueDate.day
}
