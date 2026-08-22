// Department dimension and access boundary (enhancement plan 1.1).
//
// Department is DERIVED from the owner's function — a record takes its department
// from whoever owns it. A user sees only the records in their own department;
// Compliance and the administrator keep the all-departments view. This module is
// the single place that decides "can the current user see this record".
//
// Nothing here mutates state — it is pure derivation over the seed plus the
// active role. Detail pages stay reachable by direct link / command search; the
// boundary applies to the list and queue surfaces (where work is discovered).
import { useApp } from '@/store'
import { departmentOfPerson } from '@/data/people'
import { WORLD, getControl } from '@/data'
import { provisionsForInstrument } from '@/lib/sources'
import type { Department } from '@/types'

export { departmentOfPerson }

export const DEPARTMENTS: Department[] = [
  'Compliance and Company Secretarial',
  'Risk',
  'IT and Information Security',
  'Investment Compliance',
  'Data Protection',
  'Finance and Tax',
  'HR and Labour',
  'Internal Audit',
]

// The cross-department authority: the Compliance function keeps the overall view.
export const COMPLIANCE_DEPT: Department = 'Compliance and Company Secretarial'

export interface Scope {
  personId: string
  department?: Department
  // Compliance + the administrator see every department; everyone else is scoped.
  seesAll: boolean
  label: string
}

/** The active user's access scope, derived from the role switcher. */
export function useScope(): Scope {
  const role = useApp((s) => s.role)
  const personId = useApp((s) => s.personId)
  const department = departmentOfPerson(personId)
  const seesAll = role === 'ADMIN' || department === COMPLIANCE_DEPT
  return { personId, department, seesAll, label: seesAll ? 'All departments' : (department ?? 'Unassigned') }
}

/** True when an owner-derived record is visible under the given scope. */
export function ownerInScope(ownerId: string | undefined, scope: Scope): boolean {
  if (scope.seesAll) return true
  if (!scope.department) return false
  return departmentOfPerson(ownerId) === scope.department
}

// ── Source acts: visible to the departments that own records deriving from them
// (per 1.1). Computed once from the seed and cached — it does not depend on the
// session. Acts no department derives from are visible to Compliance only (they
// fall through to seesAll). Explicit act->department routing arrives in E0.6.
let INSTRUMENT_DEPTS: Map<string, Set<Department>> | null = null

function instrumentDepts(): Map<string, Set<Department>> {
  if (INSTRUMENT_DEPTS) return INSTRUMENT_DEPTS
  const map = new Map<string, Set<Department>>()
  for (const inst of WORLD.instruments) {
    const provIds = new Set(provisionsForInstrument(inst.id).map((p) => p.id))
    const out = new Set<Department>()
    const add = (ownerId?: string) => {
      const d = departmentOfPerson(ownerId)
      if (d) out.add(d)
    }
    const cites = (refs?: string[]) => (refs ?? []).some((r) => provIds.has(r))
    for (const o of WORLD.obligations) if (cites(o.sourceRefs)) add(o.owner)
    for (const c of WORLD.controls) {
      if (cites(c.sourceRefs) || c.mappedFrameworkRefs.some((m) => m.sourceRef && provIds.has(m.sourceRef))) add(c.owner)
    }
    for (const p of WORLD.policies) if (cites(p.sourceRefs)) add(p.owner)
    for (const pr of provisionsForInstrument(inst.id)) if (pr.linkedControlId) add(getControl(pr.linkedControlId)?.owner)
    map.set(inst.id, out)
  }
  INSTRUMENT_DEPTS = map
  return map
}

export function departmentsForInstrument(instrumentId: string): Set<Department> {
  return instrumentDepts().get(instrumentId) ?? new Set()
}

/** True when a source act is visible under the given scope. */
export function instrumentInScope(instrumentId: string, scope: Scope): boolean {
  if (scope.seesAll) return true
  if (!scope.department) return false
  return departmentsForInstrument(instrumentId).has(scope.department)
}

// ── Department selector (replaces the verbose scope banner) ───────────────────
// A compact dropdown communicates the scope and (for Compliance / admin) lets
// them narrow to one department. A department-locked user sees only their own
// department, so the control is fixed to it.
export const ALL_DEPARTMENTS_LABEL = 'All departments'

export function departmentFilterOptions(scope: Scope): string[] {
  return scope.seesAll ? [ALL_DEPARTMENTS_LABEL, ...DEPARTMENTS] : [scope.department ?? 'Unassigned']
}

/** Owner-derived records: passes the hard boundary AND the selected filter. */
export function passesDeptFilter(ownerId: string | undefined, scope: Scope, selected: string): boolean {
  if (!ownerInScope(ownerId, scope)) return false
  if (!scope.seesAll || selected === ALL_DEPARTMENTS_LABEL) return true
  return departmentOfPerson(ownerId) === selected
}

/** Source acts: passes the hard boundary AND the selected department filter. */
export function passesInstrumentDeptFilter(instrumentId: string, scope: Scope, selected: string): boolean {
  if (!instrumentInScope(instrumentId, scope)) return false
  if (!scope.seesAll || selected === ALL_DEPARTMENTS_LABEL) return true
  return departmentsForInstrument(instrumentId).has(selected as Department)
}
