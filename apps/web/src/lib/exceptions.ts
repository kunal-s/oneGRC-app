// The exception register — approved, time-boxed deviations from a control or an
// obligation.
//
// An exception is an Issue with `source === 'Exception'` rather than a parallel
// object, so it inherits the whole remediation apparatus for free: an owner, a
// due date, the /issues list, bulk actions, the audit trail and closure. What it
// adds is the deviation record itself — reason, compensating control, approver
// and an expiry that is always enforced.
//
// Nothing here schedules anything. Expiry chasing is the SAME 7/3/1 ladder the
// obligations use, pointed at `expiresOn`.
import type { Issue, IssueException } from '@/types'
import { WORLD } from '@/data'
import { NOW_MS } from '@/lib/time'
import { ladderFor, latestFired, type ReminderEvent } from '@/lib/reminders'

/** Days before expiry at which an exception starts reading as "Expiring soon" —
 *  the same window the reminder ladder's first rung fires in. */
export const EXPIRY_WARNING_DAYS = 7

export type ExpiryState = 'Active' | 'Expiring soon' | 'Expired' | 'Closed'

/** Shared expiry band. Risk acceptance and control/obligation exceptions are
 *  different records but the same governance idea, so they age identically. */
export function expiryState(expiresOn: string, closed = false, warningDays = EXPIRY_WARNING_DAYS): ExpiryState {
  if (closed) return 'Closed'
  const days = (new Date(expiresOn).getTime() - NOW_MS) / 86400000
  if (days < 0) return 'Expired'
  return days <= warningDays ? 'Expiring soon' : 'Active'
}

export function isException(i: Issue): boolean {
  return i.source === 'Exception' && !!i.exception
}

/** The derived state of an exception. Closed wins (it was remediated), then the
 *  expiry band. A rejected request never becomes active. */
export function exceptionState(i: Issue): ExpiryState | undefined {
  const e = i.exception
  if (!e) return undefined
  if (e.approvalState === 'Rejected') return 'Closed'
  return expiryState(e.expiresOn, !!e.closedOn || i.status === 'Resolved')
}

/** Live exceptions only — approved, not closed, not lapsed. */
export function isLive(i: Issue): boolean {
  const s = exceptionState(i)
  return i.exception?.approvalState === 'Approved' && (s === 'Active' || s === 'Expiring soon')
}

export function exceptionsFrom(issues: Issue[]): Issue[] {
  return issues.filter(isException)
}

/** The 7/3/1-before / 1/3/7-after ladder on an exception's expiry date. The
 *  requester is chased; the approver is the escalation counterparty. */
export function exceptionLadder(i: Issue): ReminderEvent[] {
  const e = i.exception
  if (!e || e.approvalState !== 'Approved' || e.closedOn || i.status === 'Resolved') return []
  return ladderFor(`${i.id}-expiry`, e.expiresOn, e.requestedBy, e.approvedBy)
}

export function exceptionFollowUp(i: Issue): ReminderEvent | undefined {
  return latestFired(exceptionLadder(i))
}

export interface ExceptionSummary {
  total: number
  active: number
  expiringSoon: number
  expired: number
  closed: number
  awaitingApproval: number
  renewals: number
}

export function exceptionSummary(issues: Issue[]): ExceptionSummary {
  const list = exceptionsFrom(issues)
  const s: ExceptionSummary = { total: list.length, active: 0, expiringSoon: 0, expired: 0, closed: 0, awaitingApproval: 0, renewals: 0 }
  for (const i of list) {
    const e = i.exception!
    s.renewals += e.renewalCount
    if (e.approvalState === 'Requested') s.awaitingApproval++
    switch (exceptionState(i)) {
      case 'Active':
        s.active++
        break
      case 'Expiring soon':
        s.expiringSoon++
        break
      case 'Expired':
        s.expired++
        break
      case 'Closed':
        s.closed++
        break
    }
  }
  return s
}

/** Where an exception was raised from — a control or an obligation record. */
export function exceptionOrigin(i: Issue): { kind: 'Control' | 'Obligation'; id: string; route: string } | undefined {
  if (!isException(i)) return undefined
  const ref = i.sourceRef
  if (ref.startsWith('OBL-')) return { kind: 'Obligation', id: ref, route: `/obligations/${ref}` }
  if (ref.startsWith('CTRL-')) return { kind: 'Control', id: ref, route: `/controls/${ref}` }
  return undefined
}

/** Live exceptions raised against a given control or obligation — so the record
 *  itself shows that a deviation is on file rather than only the register. */
export function exceptionsForRef(issues: Issue[], refId: string): Issue[] {
  return exceptionsFrom(issues).filter((i) => i.sourceRef === refId)
}

/** Fired expiry reminders and escalations, in the shape the audit log renders. */
export function exceptionAuditRows(): { id: string; at: string; actor: string; action: string; object: string; detail: string }[] {
  const rows: { id: string; at: string; actor: string; action: string; object: string; detail: string }[] = []
  let seq = 0
  for (const i of exceptionsFrom(WORLD.issues)) {
    for (const e of exceptionLadder(i)) {
      if (!e.fired) continue
      rows.push({
        id: `LOG-EX-${String(++seq).padStart(3, '0')}`,
        at: e.at,
        actor: 'system',
        action:
          e.kind === 'reminder'
            ? `Exception ${i.id} expiry reminder — ${e.intervalLabel}`
            : `Exception ${i.id} lapsed — escalated to ${e.targetRole}, ${e.intervalLabel}`,
        object: i.id,
        detail: `${i.title} · expires ${i.exception!.expiresOn.slice(0, 10)}`,
      })
    }
  }
  return rows
}

/** A new exception request, ready to be pushed into the session issue list. */
export function buildExceptionRequest(args: {
  id: string
  refId: string
  refTitle: string
  requestedBy: string
  approvedBy: string
  reason: string
  compensatingControl?: string
  expiresOn: string
  severity: Issue['severity']
}): Issue {
  const kind = args.refId.startsWith('OBL-') ? 'obligation' : 'control'
  return {
    id: args.id,
    title: `Exception — ${args.refTitle}`,
    source: 'Exception',
    sourceRef: args.refId,
    severity: args.severity,
    owner: args.requestedBy,
    dueDate: args.expiresOn,
    ageDays: 0,
    status: 'Open',
    linkedControls: kind === 'control' ? [args.refId] : args.compensatingControl ? [args.compensatingControl] : [],
    exception: {
      reason: args.reason,
      compensatingControl: args.compensatingControl,
      requestedBy: args.requestedBy,
      approvedBy: args.approvedBy,
      approvalState: 'Requested',
      requestedOn: new Date().toISOString(),
      expiresOn: args.expiresOn,
      renewalCount: 0,
    },
  }
}

export type { IssueException }
