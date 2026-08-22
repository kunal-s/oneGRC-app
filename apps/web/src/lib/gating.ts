import { useApp } from '@/store'
import { departmentOfPerson } from '@/data/people'
import type { RoleKey } from '@/types'

const COMPLIANCE_DEPT = 'Compliance and Company Secretarial'

/**
 * Central role + maker-checker gating. Replaces ad hoc `role === 'X'` checks
 * scattered across pages so authority lives in one place (spec Section 10:
 * role-based, least-privilege, separation of duties).
 *
 * An action is described declaratively; `canAct` resolves it against the active
 * persona and, where relevant, the maker-checker rule (a maker may not approve
 * their own work). Phase 2+ adds more action kinds; the contract stays stable.
 */
export type GrcAction =
  // Accepting a clause as a tracked obligation / sending to a specialist is
  // restricted to the compliance-accountable persona (spec 4: Compliance + CoSec,
  // unified here as Compliance Manager).
  | { kind: 'clause.save' }
  | { kind: 'clause.specialist' }
  | { kind: 'clause.applicability' }
  // Maker-checker: submitting is the maker's act; approving is the checker's and
  // must not be the maker (separation of duties).
  | { kind: 'obligation.submit'; makerId?: string }
  | { kind: 'obligation.approve'; makerId?: string }
  | { kind: 'control.retest' }
  | { kind: 'incident.fileTrack'; makerId?: string }
  | { kind: 'issue.resolve' }
  | { kind: 'regchange.acknowledge' }
  | { kind: 'dsar.advance' }
  | { kind: 'admin.configure' }
  // Risk treatment: the owner progresses remediation actions and submits the
  // plan; a different person approves it. `risk.approve` ends in "approve", so
  // the separation-of-duties rule below applies to it automatically.
  | { kind: 'risk.action.advance' }
  | { kind: 'risk.submit'; makerId?: string }
  | { kind: 'risk.approve'; makerId?: string }
  | { kind: 'risk.accept'; makerId?: string }
  // Exceptions: the owner of a failing control or a late obligation raises the
  // deviation; a different person approves, renews or closes it.
  | { kind: 'exception.raise' }
  | { kind: 'exception.approve'; makerId?: string }
  | { kind: 'exception.renew'; makerId?: string }
  | { kind: 'exception.close' }
  // Speak-up and fraud. Role membership is necessary but never sufficient —
  // `accessTo()` in lib/investigations.ts decides whether a *specific* case
  // opens, and a recusal beats a role every time.
  | { kind: 'wb.triage' }
  | { kind: 'wb.investigate' }
  | { kind: 'wb.close'; makerId?: string }
  | { kind: 'wb.unseal'; makerId?: string }
  | { kind: 'fraud.open' }
  | { kind: 'fraud.investigate' }
  | { kind: 'fraud.fileTrack'; makerId?: string }
  | { kind: 'fraud.close'; makerId?: string }

// Which personas may perform each action kind.
const ABLE: Record<GrcAction['kind'], RoleKey[]> = {
  'clause.save': ['CCO'],
  'clause.specialist': ['CCO'],
  'clause.applicability': ['CCO'],
  'obligation.submit': ['CCO', 'ANALYST'],
  'obligation.approve': ['CCO', 'EXEC'],
  'control.retest': ['CTRLOWNER', 'AUDITOR', 'EXEC'],
  'incident.fileTrack': ['CTRLOWNER', 'EXEC'],
  'issue.resolve': ['CTRLOWNER', 'AUDITOR', 'CCO'],
  'regchange.acknowledge': ['CCO', 'ANALYST', 'RISK'],
  'dsar.advance': ['CCO', 'ANALYST'],
  'admin.configure': ['ADMIN'],
  'risk.action.advance': ['RISK', 'CTRLOWNER', 'CCO'],
  'risk.submit': ['RISK', 'CTRLOWNER', 'CCO'],
  'risk.approve': ['RISK', 'EXEC'],
  'risk.accept': ['EXEC', 'RISK'],
  'exception.raise': ['CTRLOWNER', 'CCO', 'ANALYST', 'RISK'],
  'exception.approve': ['CCO', 'RISK', 'EXEC'],
  'exception.renew': ['CCO', 'RISK', 'EXEC'],
  'exception.close': ['CTRLOWNER', 'CCO', 'AUDITOR'],
  // The ethics office and the Audit Committee, and nobody else. The Executive
  // is deliberately absent: the CRO may be the subject of a report.
  'wb.triage': ['CCO'],
  'wb.investigate': ['CCO', 'AUDITOR'],
  'wb.close': ['CCO', 'AUDITOR', 'ARC'],
  'wb.unseal': ['CCO', 'ARC'],
  'fraud.open': ['CCO', 'AUDITOR', 'RISK', 'CTRLOWNER'],
  'fraud.investigate': ['AUDITOR', 'CCO', 'CTRLOWNER'],
  'fraud.fileTrack': ['CCO', 'CTRLOWNER', 'EXEC'],
  'fraud.close': ['CCO', 'RISK', 'EXEC', 'ARC'],
}

/** Resolve an action against a persona + the current person (for maker-checker). */
export function canAct(role: RoleKey, selfId: string, action: GrcAction): boolean {
  // Clause authority (accept / specialist / applicability) is restricted to the
  // Compliance & Company Secretarial department (spec 4 / enhancement plan 1.6),
  // not merely the CCO role — Investment Compliance and the DPO also hold CCO.
  if (action.kind === 'clause.save' || action.kind === 'clause.specialist' || action.kind === 'clause.applicability') {
    return departmentOfPerson(selfId) === COMPLIANCE_DEPT
  }
  const allowed = ABLE[action.kind]?.includes(role)
  if (!allowed) return false
  // Separation of duties: the maker cannot approve / sign off their own item.
  if ('makerId' in action && action.makerId && action.kind.endsWith('approve')) {
    return action.makerId !== selfId
  }
  if (action.kind === 'incident.fileTrack' && action.makerId) {
    return action.makerId !== selfId
  }
  // A risk acceptance is a sign-off on someone else's exposure, so the owner may
  // not accept their own risk (the kind does not end in "approve", so it needs
  // the rule stated explicitly).
  if (action.kind === 'risk.accept' && action.makerId) {
    return action.makerId !== selfId
  }
  // Renewing an exception extends a deviation, so it carries the same
  // separation of duties as approving one in the first place.
  if (action.kind === 'exception.renew' && action.makerId) {
    return action.makerId !== selfId
  }
  // Closing an investigation, filing a regulator notification on one, and
  // unsealing a reporter's identity are all sign-offs on someone else's work.
  // None of the kinds end in "approve", so each is stated.
  if ((action.kind === 'wb.close' || action.kind === 'fraud.close' || action.kind === 'wb.unseal' || action.kind === 'fraud.fileTrack') && action.makerId) {
    return action.makerId !== selfId
  }
  return true
}

/** Hook form: gate UI affordances against the active persona. */
export function useCanAct(action: GrcAction): boolean {
  const role = useApp((s) => s.role)
  const selfId = useApp((s) => s.personId)
  return canAct(role, selfId, action)
}
