// The shared core behind the two speak-up modules.
//
// Whistleblower and fraud are separate modules on purpose — different intakes,
// different investigation processes, different regulatory duties. What they
// share is exactly three things, and they live here so neither module owns a
// private copy:
//
//   1. Confidentiality — who may open a case body at all.
//   2. The action plan — remediation goes through the one Issues engine.
//   3. The push into the risk register — a case that changes nothing is noise.
import type { Confidential, Issue, RoleKey, Severity } from '@/types'
import { PEOPLE_BY_ID, personName } from '@/data/people'
import { NOW } from '@/lib/time'

const DAY = 86400000

// ── confidentiality ──────────────────────────────────────────────────────────

/**
 * The ethics office. Membership is by person, not by role, because the whole
 * point is that a persona switch does not open a sealed case: the Compliance
 * Officer holds the channel, the DPO handles data-misuse reports, the Head of
 * Internal Audit gives the Audit Committee its statutory direct access.
 */
export const ETHICS_OFFICE = ['anjali', 'sunita', 'priya'] as const

/** Roles that may see that a case exists, without necessarily opening it. */
const OVERSIGHT_ROLES: RoleKey[] = ['ARC', 'AUDITOR', 'CCO']

export type AccessVerdict = { canOpen: boolean; canList: boolean; reason: string }

/**
 * The single access decision for both modules.
 *
 * An unrestricted case behaves like any other record. A restricted one opens
 * only for someone on its access list — and never for someone recused from it,
 * whatever their role. Recusal beats clearance, which is the rule that makes
 * the model worth having.
 */
export function accessTo(c: Confidential, personId: string, role: RoleKey): AccessVerdict {
  if (c.recusals.includes(personId)) {
    return { canOpen: false, canList: false, reason: 'You are recused from this case — you are named in it or you sit in the subject’s reporting line.' }
  }
  if (!c.restricted) return { canOpen: true, canList: true, reason: '' }
  if (c.accessList.includes(personId)) return { canOpen: true, canList: true, reason: '' }
  if (OVERSIGHT_ROLES.includes(role)) {
    return {
      canOpen: false,
      canList: true,
      reason: 'Restricted to the ethics office. You can see that the case exists and its stage; the body, the reporter and the subject are sealed.',
    }
  }
  return { canOpen: false, canList: false, reason: 'Restricted to the ethics office.' }
}

export const canOpenCase = (c: Confidential, personId: string, role: RoleKey) => accessTo(c, personId, role).canOpen
export const canListCase = (c: Confidential, personId: string, role: RoleKey) => accessTo(c, personId, role).canList

/** Split a set of cases into what this persona may work on and what it may only
 *  count. Both numbers are shown — pretending a sealed case does not exist is
 *  its own kind of dishonesty. */
export function partitionByAccess<T extends Confidential>(cases: T[], personId: string, role: RoleKey): { open: T[]; sealed: T[]; hidden: number } {
  const open: T[] = []
  const sealed: T[] = []
  let hidden = 0
  for (const c of cases) {
    const v = accessTo(c, personId, role)
    if (v.canOpen) open.push(c)
    else if (v.canList) sealed.push(c)
    else hidden++
  }
  return { open, sealed, hidden }
}

/**
 * Who must stand down from a case. Anyone named in the access list who sits in
 * the subject's department leadership is conflicted; so is anyone the
 * allegation points at.
 */
export function recusalsFor(subjectDepartments: string[], named: string[] = []): string[] {
  const out = new Set(named)
  for (const p of Object.values(PEOPLE_BY_ID)) {
    if (subjectDepartments.includes(p.department) && /head|chief/i.test(p.title)) out.add(p.id)
  }
  return [...out]
}

// ── the shared action plan ───────────────────────────────────────────────────

/**
 * Remediation from either module is an Issue in the one register, not a private
 * to-do list. `source: 'Incident'` is deliberate: an investigation outcome is
 * an event-driven finding, and reusing the existing member keeps the Issue
 * union closed and the /issues filters unchanged.
 */
export function buildRemediationIssue(args: {
  id: string
  caseId: string
  title: string
  owner: string
  severity: Severity
  dueInDays: number
  linkedControls?: string[]
  /** Shown on the Issue so a reader knows where it came from without needing
   *  access to the case body. */
  provenance: string
}): Issue {
  return {
    id: args.id,
    title: args.title,
    source: 'Incident',
    sourceRef: args.caseId,
    severity: args.severity,
    owner: args.owner,
    dueDate: new Date(NOW.getTime() + args.dueInDays * DAY).toISOString(),
    ageDays: 0,
    status: 'Open',
    linkedControls: args.linkedControls ?? [],
  }
}

/** How an investigation's severity maps onto a remediation deadline — the more
 *  serious the finding, the shorter the rope. */
export const remediationDays = (s: Severity): number => (s === 'Critical' ? 14 : s === 'High' ? 30 : s === 'Medium' ? 60 : 90)

// ── shared presentation ──────────────────────────────────────────────────────

export const outcomeTone = (o?: string): 'ok' | 'warn' | 'danger' | 'neutral' =>
  o === 'Substantiated'
    ? 'danger'
    : o === 'Partially substantiated'
      ? 'warn'
      : o === 'Unsubstantiated' || o === 'Out of scope'
        ? 'ok'
        : 'neutral'

/** A person rendered for a sealed context — a role, never a name. */
export const maskedActor = (personId: string): string => {
  const p = PEOPLE_BY_ID[personId]
  return p ? `${p.title}, ${p.department}` : personName(personId)
}
