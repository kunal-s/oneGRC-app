/**
 * The one reminder and escalation ladder (ENG-01, BR-ESC-01, workflows.md
 * section 5). Six rungs, identical for every kind of deadline: reminders to
 * the owner at seven, three and one days before due; escalation at one day
 * overdue to the owner and their department head, at three days to the
 * Compliance Officer, at seven days to the executive.
 *
 * A pure function of a deadline and the six configured intervals (LDR-009),
 * computable without reading what fired, so a reviewer can recompute the
 * ladder for any deadline and check it against the log. Unit-tested directly
 * the way `evaluateAuthority()` is, in `rungs.spec.ts`.
 *
 * Labels are taken verbatim from `apps/web/src/lib/reminders.ts`, the
 * prototype's own wording and what the client approved (LDR-008, D-042).
 */
import { addCalendarDays, calendarDateOf, startOfDayInZone } from './timezone'

export type RungKind = 'reminder' | 'escalation'

/**
 * One of the nineteen FRD 11.3 event types, held as text rather than a native
 * enum (see the `Notification` model comment for why). This slice writes
 * exactly these four.
 */
export type LadderEventType = 'duty.approaching' | 'duty.overdue.day1' | 'duty.overdue.day3' | 'duty.overdue.day7'

export interface Rung {
  /** Negative before due (a reminder), positive overdue (an escalation). */
  offsetDays: number
  kind: RungKind
  eventType: LadderEventType
  /** Verbatim from reminders.ts: "7 days before due", "1 day overdue". */
  intervalLabel: string
  /** Verbatim from reminders.ts: "Owner", "Owner and line manager", ... */
  targetRoleLabel: string
  /** The start of this rung's own day, in the organisation's zone (LDR-011). */
  moment: Date
}

/** The prototype's own plural rule (LDR-008): "1 day", "3 days". */
const dayWord = (n: number) => `${n} day${n === 1 ? '' : 's'}`

/** The six rungs, LDR-002 to LDR-007, fixed and identical for every deadline. */
const LADDER: ReadonlyArray<{
  offsetDays: number
  kind: RungKind
  eventType: LadderEventType
  intervalLabel: string
  targetRoleLabel: string
}> = [
  { offsetDays: -7, kind: 'reminder', eventType: 'duty.approaching', intervalLabel: `${dayWord(7)} before due`, targetRoleLabel: 'Owner' },
  { offsetDays: -3, kind: 'reminder', eventType: 'duty.approaching', intervalLabel: `${dayWord(3)} before due`, targetRoleLabel: 'Owner' },
  { offsetDays: -1, kind: 'reminder', eventType: 'duty.approaching', intervalLabel: `${dayWord(1)} before due`, targetRoleLabel: 'Owner' },
  { offsetDays: 1, kind: 'escalation', eventType: 'duty.overdue.day1', intervalLabel: `${dayWord(1)} overdue`, targetRoleLabel: 'Owner and line manager' },
  { offsetDays: 3, kind: 'escalation', eventType: 'duty.overdue.day3', intervalLabel: `${dayWord(3)} overdue`, targetRoleLabel: 'Compliance Officer' },
  { offsetDays: 7, kind: 'escalation', eventType: 'duty.overdue.day7', intervalLabel: `${dayWord(7)} overdue`, targetRoleLabel: 'CRO / executive' },
]

/**
 * The whole ladder for one deadline: LDR-011, a rung's moment is the start of
 * its own day, `offsetDays` away from the due date's own calendar date, read
 * in the organisation's zone. The intervals are configurable in principle
 * (LDR-010) and held as one reference row per rung here; this slice builds no
 * editing surface over them (that is a later administration slice's SCR-074).
 */
export function computeRungs(dueDate: Date, timezone: string): Rung[] {
  const dueCalendar = calendarDateOf(dueDate)
  return LADDER.map((spec) => {
    const rungCalendar = addCalendarDays(dueCalendar, spec.offsetDays)
    return {
      ...spec,
      moment: startOfDayInZone(rungCalendar.year, rungCalendar.month, rungCalendar.day, timezone),
    }
  })
}

export function ladderEventTypes(): LadderEventType[] {
  return Array.from(new Set(LADDER.map((r) => r.eventType)))
}

/**
 * A rung's interval label and target-role label off the fixed ladder alone,
 * with no deadline needed: neither ever varies with the deadline, only with
 * which of the six rungs it is. Used to label a row read back from storage,
 * which keeps only the offset and not the whole rung.
 */
export function labelsForOffset(offsetDays: number): { intervalLabel: string; targetRoleLabel: string } | null {
  const spec = LADDER.find((r) => r.offsetDays === offsetDays)
  return spec ? { intervalLabel: spec.intervalLabel, targetRoleLabel: spec.targetRoleLabel } : null
}
