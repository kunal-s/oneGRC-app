// Reminder and escalation engine (enhancement plan 1.2; E-C1/C2/C3/C4).
//
// Deterministic, no scheduler: every reminder and escalation is DERIVED from an
// obligation's due date relative to the frozen demo NOW. An event has "fired" if
// its scheduled time is at or before NOW. The ladder is fixed:
//   reminders   at 7, 3 and 1 days BEFORE due  -> the owner
//   escalations at 1 day overdue  -> owner + line manager (department head)
//               at 3 days overdue -> the Compliance Officer
//               at 7 days overdue -> the CRO / executive
// Fired events are written to the audit log (the trail to prove it) and surfaced
// on the obligation, in Notifications and on My Queue.
import type { Obligation, ObligationSubStep } from '@/types'
import { NOW_MS } from '@/lib/time'
import { WORLD } from '@/data'
import { personName, lineManagerOf, COMPLIANCE_OFFICER, CRO } from '@/data/people'

const DAY = 86400000

export type ReminderKind = 'reminder' | 'escalation'

export interface ReminderEvent {
  obligationId: string
  kind: ReminderKind
  offsetDays: number // negative = before due (reminder); positive = overdue (escalation)
  intervalLabel: string
  at: string // ISO — when it fired / is scheduled
  actor: string // the engine
  target: string // primary person notified
  targets: string[] // everyone notified at this rung
  targetRole: string // 'Owner' | 'Owner and line manager' | 'Compliance Officer' | 'CRO / executive'
  fired: boolean // at <= NOW
}

export const REMINDER_OFFSETS = [-7, -3, -1]
export const ESCALATION_LADDER: { days: number; targetRole: string; resolve: (ownerId: string, checkerId: string) => string[] }[] = [
  { days: 1, targetRole: 'Owner and line manager', resolve: (ownerId, checkerId) => [ownerId, lineManagerOf(ownerId) ?? checkerId] },
  { days: 3, targetRole: 'Compliance Officer', resolve: () => [COMPLIANCE_OFFICER] },
  { days: 7, targetRole: 'CRO / executive', resolve: () => [CRO] },
]

const dayWord = (n: number) => `${n} day${n === 1 ? '' : 's'}`

// The ladder for any (refId, due, owner, checker) — reused by obligations, by
// individual sub-steps and by tasks, so each owner gets chased on its own due date.
export function ladderFor(refId: string, dueIso: string, ownerId: string, checkerId: string): ReminderEvent[] {
  const due = new Date(dueIso).getTime()
  const events: ReminderEvent[] = []
  for (const off of REMINDER_OFFSETS) {
    const at = due + off * DAY
    events.push({
      obligationId: refId,
      kind: 'reminder',
      offsetDays: off,
      intervalLabel: `${dayWord(Math.abs(off))} before due`,
      at: new Date(at).toISOString(),
      actor: 'system',
      target: ownerId,
      targets: [ownerId],
      targetRole: 'Owner',
      fired: at <= NOW_MS,
    })
  }
  for (const step of ESCALATION_LADDER) {
    const at = due + step.days * DAY
    const targets = Array.from(new Set(step.resolve(ownerId, checkerId)))
    events.push({
      obligationId: refId,
      kind: 'escalation',
      offsetDays: step.days,
      intervalLabel: `${dayWord(step.days)} overdue`,
      at: new Date(at).toISOString(),
      actor: 'system',
      target: targets[0],
      targets,
      targetRole: step.targetRole,
      fired: at <= NOW_MS,
    })
  }
  return events.sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime())
}

/** The full reminder/escalation ladder for one obligation (fired + scheduled). */
export function reminderEvents(o: Obligation): ReminderEvent[] {
  // Only active duties carry a live ladder; Filed / In review are out of scope.
  if (o.status !== 'Due' && o.status !== 'Overdue') return []
  return ladderFor(o.id, o.dueDate, o.owner, o.makerChecker.checker)
}

/** The ladder for one sub-step (its own maker is chased on its own due date). */
export function subStepLadder(step: ObligationSubStep): ReminderEvent[] {
  if (step.status === 'Done') return []
  return ladderFor(step.id, step.dueDate, step.maker, step.checker)
}

/** The most recent fired event in a ladder (events are sorted ascending). */
export function latestFired(events: ReminderEvent[]): ReminderEvent | undefined {
  const fired = events.filter((e) => e.fired)
  return fired.length ? fired[fired.length - 1] : undefined
}

function actionText(e: ReminderEvent): string {
  return e.kind === 'reminder'
    ? `Reminder sent to ${personName(e.target)} — ${e.intervalLabel}`
    : `Escalated to ${e.targetRole} (${e.targets.map(personName).join(', ')}) — ${e.intervalLabel}`
}

// ── Audit-log rows for every fired event across active obligations ───────────
export interface ReminderAuditRow {
  id: string
  at: string
  actor: string
  action: string
  object: string // obligation id — clickable
  detail: string
}

export function reminderAuditRows(): ReminderAuditRow[] {
  const rows: ReminderAuditRow[] = []
  let seq = 0
  for (const o of WORLD.obligations) {
    for (const e of reminderEvents(o)) {
      if (!e.fired) continue
      rows.push({
        id: `LOG-RE-${String(++seq).padStart(3, '0')}`,
        at: e.at,
        actor: 'system',
        action: actionText(e),
        object: o.id,
        detail: `${o.title} · ${e.kind === 'reminder' ? 'reminder' : 'escalation'} interval ${e.intervalLabel}`,
      })
    }
    // Per-sub-step follow-up (deduction-type duties) is trailed too, so each
    // action's owner is provably chased on its own due date.
    for (const step of o.subSteps ?? []) {
      for (const e of subStepLadder(step)) {
        if (!e.fired) continue
        rows.push({
          id: `LOG-RE-${String(++seq).padStart(3, '0')}`,
          at: e.at,
          actor: 'system',
          action: actionText(e),
          object: o.id,
          detail: `${o.title} · step ${step.seq} (${step.title}) · ${e.intervalLabel}`,
        })
      }
    }
  }
  return rows
}

/** Seed notifications for the most recent fired escalations (the bell). */
export function escalationSeedNotifications(limit = 3) {
  const fired = WORLD.obligations
    .flatMap((o) => reminderEvents(o).filter((e) => e.fired && e.kind === 'escalation').map((e) => ({ e, o })))
    .sort((a, b) => new Date(b.e.at).getTime() - new Date(a.e.at).getTime())
  return fired.slice(0, limit).map(({ e, o }) => ({
    at: e.at,
    title: `Overdue obligation escalated to ${e.targetRole}`,
    body: `${o.id} ${o.title} — ${e.intervalLabel}; notified ${e.targets.map(personName).join(', ')}.`,
    severity: (e.offsetDays >= 7 ? 'critical' : 'warn') as 'critical' | 'warn',
    entityId: o.id,
    route: `/obligations/${o.id}`,
  }))
}

/** Counts of fired reminders and escalations this period (for the My Queue strip). */
export function reminderEngineSummary(): { reminders: number; escalations: number } {
  let reminders = 0
  let escalations = 0
  for (const o of WORLD.obligations) {
    for (const e of reminderEvents(o)) {
      if (!e.fired) continue
      if (e.kind === 'reminder') reminders++
      else escalations++
    }
  }
  return { reminders, escalations }
}
