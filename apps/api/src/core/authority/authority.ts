import type { ActionAuthority, Department, LineOfDefence } from '@prisma/client'
import { DEPARTMENT_LABEL } from '../identity/scope'
import { ROLE_LABEL } from '../../setup/reference-data'
import { renderRefusal, type RefusalId } from '../refusals/catalogue'

export interface AuthorityCheck {
  action: string
  /** Who made the item, for separation of duties. */
  makerId?: string | null
}

export interface AuthorityActor {
  personId: string
  roles: string[]
  department: Department
  lineOfDefence: LineOfDefence
}

export type AuthorityRow = Pick<
  ActionAuthority,
  'roleCode' | 'requiresDepartment' | 'requiresLineOfDefence' | 'separationOfDuties'
>

export type AuthorityResult = { ok: true } | { ok: false; ref: RefusalId; message: string }

/** REFU-005: the interface's own name for a role, never its code. Falls back to the code for one this reference data does not carry. */
function roleLabel(code: string): string {
  return ROLE_LABEL[code] ?? code
}

/**
 * The single authority check (spec 4.10, BR-AUT-01), as a pure function over
 * the rows for one action. Pulled out of AuthorityService so the gate can be
 * exercised directly in a test, the way computeViews already is.
 *
 * Every governed action resolves through here. The matrix is DATA in
 * ActionAuthority, not conditionals scattered across handlers: that scattering
 * is precisely how a system ends up with one screen that lets the maker approve
 * their own filing.
 *
 * The message each refusal carries comes from the one catalogue (ENG-15):
 * this function decides WHICH rule fired and resolves its parameters into the
 * words the interface already uses elsewhere (a role's name, a department's
 * name, never a role code or a Prisma enum member, REFU-005, REFU-006); the
 * catalogue only turns those parameters into the sentence `platform.md`
 * section 6 gives it.
 */
export function evaluateAuthority(
  rows: AuthorityRow[],
  actor: AuthorityActor,
  check: AuthorityCheck,
): AuthorityResult {
  if (rows.length === 0) {
    // An unknown action is refused rather than allowed. A typo in an action
    // name must not become an unguarded endpoint. REF-01, BR-AUT-01.
    return { ok: false, ref: 'REF-01', message: renderRefusal('REF-01', { action: check.action }) }
  }

  const permitted = rows.filter((r) => actor.roles.includes(r.roleCode))
  if (permitted.length === 0) {
    const allowed = [...new Set(rows.map((r) => r.roleCode))].map(roleLabel).join(', ')
    const held = actor.roles.length > 0 ? actor.roles.map(roleLabel).join(', ') : 'no roles'
    // REF-02, BR-AUT-03.
    return { ok: false, ref: 'REF-02', message: renderRefusal('REF-02', { action: check.action, allowed, held }) }
  }

  // Department gate (BR-AUT-02, AUTH-G3, D-046). Evaluated per row: a caller
  // is permitted when at least one row they hold is satisfied completely -
  // the row names no department, or they are in the one it names. Asking
  // whether EVERY held row names a department (the pre-D-046 reading) was
  // correct only while every action's rows were uniform; instrument.create
  // is the first that is not (D-037).
  const satisfied = permitted.filter(
    (r) => r.requiresDepartment === null || r.requiresDepartment === actor.department,
  )
  if (satisfied.length === 0) {
    // REF-03 names the department of the rows the caller holds, not of every
    // row for the action, BR-AUT-02.
    const need = [
      ...new Set(permitted.map((r) => r.requiresDepartment).filter((d): d is Department => d !== null)),
    ].map((d) => DEPARTMENT_LABEL[d]).join(', ')
    return {
      ok: false,
      ref: 'REF-03',
      message: renderRefusal('REF-03', {
        action: check.action,
        needDepartment: need,
        actorDepartment: DEPARTMENT_LABEL[actor.department],
      }),
    }
  }

  // Line of defence (BR-AUT-10, AUTH-G1, D-047). A row a caller satisfied may
  // bar one line from checking. The column is empty for every action in this
  // release (SCR-088-070), so `barred` is never found and REF-05 is reachable
  // but fires for nothing (SCR-088-071, SCR-088-072).
  const barred = satisfied.find(
    (r) => r.requiresLineOfDefence !== null && r.requiresLineOfDefence === actor.lineOfDefence,
  )
  if (barred) {
    return {
      ok: false,
      ref: 'REF-05',
      message: renderRefusal('REF-05', { action: check.action, line: barred.requiresLineOfDefence as string }),
    }
  }

  // Separation of duties (BR-AUT-05, SCR-088-061): applies when any row the
  // caller SATISFIED, not merely held, carries the flag.
  if (satisfied.some((r) => r.separationOfDuties) && check.makerId && check.makerId === actor.personId) {
    return { ok: false, ref: 'REF-04', message: renderRefusal('REF-04', { action: check.action }) }
  }

  return { ok: true }
}
