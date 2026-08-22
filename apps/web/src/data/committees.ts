import { daysFromNow } from '@/lib/time'

/**
 * Board committee cadence — chairs and meeting dates relative to the frozen demo
 * NOW. Shared by the PFRDA Pack (full register) and the Executive board-prep view
 * (next-meeting roll-up) so both read one source. `lastDays` / `nextDays` are day
 * offsets from NOW; resolve to ISO via `committeeDates`.
 */
export interface Committee {
  name: string
  short: string
  cadence: string
  chair: string
  lastDays: number
  nextDays: number
  quorum?: string // the constitutional quorum for the meeting
  members?: string[] // person ids on the committee (chair first)
}

// The five board committees, each with a cadence, a quorum, a membership and a
// next meeting. Minutes double as evidence on the obligations they cover — the
// IISC minutes anchor the investment-research review; the Audit Committee minutes
// evidence the related-party approvals. Agenda-from-registers and a resolutions
// register are the next governance build on top of this.
export const COMMITTEES: Committee[] = [
  { name: 'Investment Sub-Committee (IISC)', short: 'IISC', cadence: 'Twice a week + monthly review', chair: 'arvind', lastDays: -3, nextDays: 4, quorum: '3 (incl. chair)', members: ['arvind', 'sanjay', 'meera', 'aditya', 'sneha'] },
  { name: 'Risk Management Committee', short: 'Risk', cadence: 'Quarterly', chair: 'meera', lastDays: -35, nextDays: 55, quorum: '3 (majority independent)', members: ['meera', 'rajesh', 'sunita', 'arvind'] },
  { name: 'Audit Committee', short: 'Audit', cadence: 'Quarterly', chair: 'sunita', lastDays: -14, nextDays: 76, quorum: '3 (majority independent)', members: ['sunita', 'lakshmi', 'vikram', 'meera'] },
  { name: 'Nomination & Remuneration Committee', short: 'NRC', cadence: 'Half-yearly', chair: 'vikram', lastDays: -88, nextDays: 92, quorum: '2 (majority independent)', members: ['vikram', 'meera', 'sunita'] },
  { name: 'Compliance Committee', short: 'Compliance', cadence: 'Quarterly', chair: 'anjali', lastDays: -28, nextDays: 62, quorum: '3 (incl. chair)', members: ['anjali', 'priya', 'vikram', 'arvind'] },
]

/** Resolve a committee's relative-day offsets to ISO last/next meeting dates. */
export function committeeDates(c: Committee): { last: string; next: string } {
  return { last: daysFromNow(c.lastDays), next: daysFromNow(c.nextDays) }
}

/** Committees ordered by soonest next meeting — for the board-prep next-up view. */
export function committeesByNextMeeting(): Committee[] {
  return [...COMMITTEES].sort((a, b) => a.nextDays - b.nextDays)
}
