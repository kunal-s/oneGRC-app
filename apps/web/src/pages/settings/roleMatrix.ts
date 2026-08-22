// The role × module permission matrix, and the segregation-of-duties rules.
//
// This is DERIVED from src/lib/gating.ts rather than hand-written, so the screen
// shows the authority the platform actually enforces. If a role's rights change
// in `ABLE`, this table changes with it — a matrix that can drift from the code
// is worse than no matrix, because it documents a control that may not hold.
import { canAct, type GrcAction } from '@/lib/gating'
import { ROLES } from '@/data/people'
import type { RoleKey } from '@/types'

export type PermissionLevel = 'None' | 'View' | 'Edit' | 'Approve' | 'Administer'

const RANK: Record<PermissionLevel, number> = { None: 0, View: 1, Edit: 2, Approve: 3, Administer: 4 }

export interface ModuleSpec {
  key: string
  label: string
  /** Actions that constitute "edit" on this module. */
  edit?: GrcAction[]
  /** Actions that constitute "approve" (sign-off) on this module. */
  approve?: GrcAction[]
  /** Actions that constitute full administration. */
  administer?: GrcAction[]
}

// Modules present in the platform today. Vendor and Whistleblower are absent by
// design — they are not built yet, and listing rights over a module that does
// not exist would misstate what the platform enforces.
export const MODULES: ModuleSpec[] = [
  { key: 'risk', label: 'Risk', edit: [{ kind: 'risk.submit' }, { kind: 'risk.action.advance' }], approve: [{ kind: 'risk.approve' }, { kind: 'risk.accept' }] },
  { key: 'control', label: 'Control', edit: [{ kind: 'control.retest' }] },
  { key: 'policy', label: 'Policy' },
  { key: 'incident', label: 'Incident', approve: [{ kind: 'incident.fileTrack' }] },
  { key: 'obligation', label: 'Obligation', edit: [{ kind: 'obligation.submit' }], approve: [{ kind: 'obligation.approve' }] },
  { key: 'source', label: 'Source & clause', edit: [{ kind: 'clause.applicability' }], approve: [{ kind: 'clause.save' }] },
  { key: 'regchange', label: 'Reg. change', edit: [{ kind: 'regchange.acknowledge' }] },
  { key: 'audit', label: 'Audit' },
  { key: 'issue', label: 'Issue', edit: [{ kind: 'issue.resolve' }] },
  { key: 'exception', label: 'Exception', edit: [{ kind: 'exception.raise' }], approve: [{ kind: 'exception.approve' }] },
  { key: 'evidence', label: 'Evidence', edit: [{ kind: 'obligation.submit' }] },
  { key: 'dpdp', label: 'DPDP / DSAR', edit: [{ kind: 'dsar.advance' }] },
  { key: 'settings', label: 'Settings', administer: [{ kind: 'admin.configure' }] },
]

/** The representative person the switcher loads for a role — needed because
 *  clause authority resolves against the person's department, not just the role. */
const personFor = (role: RoleKey) => ROLES.find((r) => r.key === role)?.person ?? ''

function levelFor(role: RoleKey, m: ModuleSpec): PermissionLevel {
  const self = personFor(role)
  const any = (actions?: GrcAction[]) => (actions ?? []).some((a) => canAct(role, self, a))
  // Highest right wins; every persona can read every module today (department
  // scoping narrows the rows they see, not the modules they may open).
  if (any(m.administer)) return 'Administer'
  if (any(m.approve)) return 'Approve'
  if (any(m.edit)) return 'Edit'
  return 'View'
}

export interface MatrixRow {
  role: RoleKey
  label: string
  cells: { module: string; level: PermissionLevel }[]
}

export function roleMatrix(): MatrixRow[] {
  return ROLES.map((r) => ({
    role: r.key,
    label: r.label,
    cells: MODULES.map((m) => ({ module: m.key, level: levelFor(r.key, m) })),
  }))
}

export const LEVEL_ORDER = (l: PermissionLevel) => RANK[l]

// ── Segregation of duties ────────────────────────────────────────────────────
// Each rule is PROBED against the live gating function rather than asserted, so
// the panel reports what the platform does, not what it intends to do.

export interface SodRule {
  label: string
  detail: string
  /** True when the rule is actually enforced by `canAct`. */
  enforced: boolean
}

function probe(role: RoleKey, action: (makerId: string) => GrcAction): boolean {
  const self = personFor(role)
  // Same person as maker → must be refused; a different person → must be allowed.
  const asSelf = canAct(role, self, action(self))
  const asOther = canAct(role, self, action('__someone_else__'))
  return asSelf === false && asOther === true
}

export function sodRules(): SodRule[] {
  return [
    {
      label: 'Risk treatment approval',
      detail: 'The owner who prepared a treatment plan cannot approve it.',
      enforced: probe('RISK', (makerId) => ({ kind: 'risk.approve', makerId })),
    },
    {
      label: 'Risk acceptance',
      detail: 'A risk owner cannot sign off acceptance of their own exposure.',
      enforced: probe('EXEC', (makerId) => ({ kind: 'risk.accept', makerId })),
    },
    {
      label: 'Obligation filing',
      detail: 'The maker who prepared a filing cannot approve and file it.',
      enforced: probe('CCO', (makerId) => ({ kind: 'obligation.approve', makerId })),
    },
    {
      label: 'Regulator-track filing',
      detail: 'The incident owner cannot both prepare and file the regulator report.',
      enforced: probe('CTRLOWNER', (makerId) => ({ kind: 'incident.fileTrack', makerId })),
    },
    {
      label: 'Exception approval',
      detail: 'The person who requested a deviation cannot approve it.',
      enforced: probe('CCO', (makerId) => ({ kind: 'exception.approve', makerId })),
    },
    {
      label: 'Exception renewal',
      detail: 'Extending a deviation carries the same separation as approving one.',
      enforced: probe('CCO', (makerId) => ({ kind: 'exception.renew', makerId })),
    },
  ]
}
