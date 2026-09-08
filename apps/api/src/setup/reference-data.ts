import type { Department, LineOfDefence } from '@prisma/client'

/**
 * Reference data: ships with EVERY install, including production (ADR-012).
 *
 * This is not seed data and not sample data. The platform does not function
 * without it: there is nothing to check authority against until the roles and
 * the matrix exist.
 */

export const ROLES = [
  { code: 'EXEC', name: 'Executive', description: 'Board cockpit, appetite, approvals of last resort, risk acceptance' },
  { code: 'RISK_MGR', name: 'Risk Manager', description: 'Risk register, heat map, treatment plans, indicators, appetite' },
  { code: 'COMPLIANCE_MGR', name: 'Compliance Manager', description: 'Obligations, clause decisions, approvals, regulatory change, the ethics channel' },
  { code: 'COMPLIANCE_ANALYST', name: 'Compliance Analyst', description: 'Performing duties, attaching evidence, clause-pipeline preparation' },
  { code: 'CONTROL_OWNER', name: 'Control Owner', description: 'Control tests, continuous monitoring, evidence, incident response' },
  { code: 'AUDITOR', name: 'Auditor', description: 'Audit plan, working papers, findings, remediation follow-up' },
  { code: 'ADMIN', name: 'Administrator', description: 'Configuration: users, roles, frameworks, thresholds, connected systems' },
  { code: 'AUDIT_CTTEE', name: 'Audit Committee Chair', description: 'Reviews the assurance chain. Does not operate the platform' },
  { code: 'RISK_CTTEE', name: 'Risk Committee Chair', description: 'Reviews exposure. Does not operate the platform' },
] as const

/** REFU-005: a refusal names a role the way the interface names it, never the role code. */
export const ROLE_LABEL: Record<string, string> = Object.fromEntries(ROLES.map((r) => [r.code, r.name]))

const CS: Department = 'ComplianceAndSecretarial'

/**
 * The action-authority matrix of spec 4.10, as data (ADR-007, BR-AUT-01).
 *
 * `sod` marks an action whose actor may not be the person who made the item.
 * `dept` gates on department rather than role: deciding that a provision binds
 * the firm is the accountability of Compliance and Company Secretarial
 * specifically, and four people hold the Compliance Manager role while only
 * two sit in that function (BR-AUT-02).
 *
 * Committee chairs deliberately hold no close authority: they review, they do
 * not operate (ADR-010).
 *
 * `lod` bars a line of defence from checking the action (BR-AUT-10, D-047).
 * No entry below sets it: the column exists and the gate reads it, but which
 * actions get it is a later decision the plan defers on purpose.
 */
export const AUTHORITY: Array<{
  action: string
  roles: string[]
  sod?: boolean
  dept?: Department
  lod?: LineOfDefence
}> = [
  { action: 'clause.save', roles: ['COMPLIANCE_MGR'], dept: CS },
  { action: 'clause.specialist', roles: ['COMPLIANCE_MGR'], dept: CS },
  { action: 'clause.notApplicable', roles: ['COMPLIANCE_MGR'], dept: CS },
  { action: 'clause.resolveFlag', roles: ['COMPLIANCE_MGR', 'COMPLIANCE_ANALYST'], dept: CS },

  // instrument.create (D-037): the first action whose rows are not uniform.
  // The Compliance Manager row is department-gated; the Administrator row is
  // not, which is what AUTH-G3's per-row evaluation makes safe (SCR-088-080).
  { action: 'instrument.create', roles: ['COMPLIANCE_MGR'], dept: CS },
  { action: 'instrument.create', roles: ['ADMIN'] },

  { action: 'obligation.submit', roles: ['COMPLIANCE_MGR', 'COMPLIANCE_ANALYST'] },
  { action: 'obligation.approve', roles: ['COMPLIANCE_MGR', 'EXEC'], sod: true },

  { action: 'task.attachEvidence', roles: ['COMPLIANCE_MGR', 'COMPLIANCE_ANALYST', 'CONTROL_OWNER'] },
  { action: 'task.submit', roles: ['COMPLIANCE_MGR', 'COMPLIANCE_ANALYST', 'CONTROL_OWNER'] },
  { action: 'task.verify', roles: ['COMPLIANCE_MGR', 'EXEC', 'AUDITOR'], sod: true },
  { action: 'task.return', roles: ['COMPLIANCE_MGR', 'EXEC', 'AUDITOR'], sod: true },

  { action: 'evidence.verify', roles: ['COMPLIANCE_MGR', 'AUDITOR', 'CONTROL_OWNER'], sod: true },
  { action: 'control.retest', roles: ['CONTROL_OWNER', 'AUDITOR', 'EXEC'] },
  { action: 'control.create', roles: ['COMPLIANCE_MGR', 'CONTROL_OWNER'] },

  { action: 'config.change', roles: ['ADMIN'] },
  { action: 'sample.purge', roles: ['ADMIN'] },
  // The on-demand ladder run (LDR-093): Administrator only, no department
  // gate and no separation of duties. `ladder.fire`, the firing itself, is a
  // system event and acquires no row here at all (LDR-059).
  { action: 'ladder.run', roles: ['ADMIN'] },

  // export.run (EXP-013, EXP-014): every role, no department gate, no
  // separation of duties. The row is the single place the permission is
  // stated, so a customer who later wants to narrow export rights edits one
  // table row instead of waiting for a release. What an export actually
  // carries is bounded by the department boundary on the read behind it
  // (EXP-002), not by who may ask for one.
  { action: 'export.run', roles: ROLES.map((r) => r.code) },
]

/**
 * Retention floors, one row per store (D-040, AUD-09, S00-024, S00-150). A
 * floor cannot be applied backwards to data already deleted, so this ships
 * from the first migration even though nothing reads it yet.
 *
 * The years below are PLACEHOLDERS pending DN-026 in docs/decisions.md: D-040
 * settled the formula (the longest applicable regime plus one year, for the
 * audit log; the retained duty's own period plus one year, for evidence) but
 * not the number, because that is the customer's regulatory position to
 * confirm before the first production write. The database refuses to lower
 * whichever number is seeded, regardless of what it is.
 */
export const RETENTION_FLOORS: Array<{ storeKey: string; minimumYears: number | null; note: string }> = [
  {
    storeKey: 'audit_log',
    minimumYears: 9,
    note: 'Placeholder pending DN-026: the longest applicable regulatory retention period plus one year (D-040).',
  },
  {
    storeKey: 'evidence',
    minimumYears: 9,
    note: 'Placeholder pending DN-026: the retention period of the duty each item proves, plus one year (D-040).',
  },
  {
    storeKey: 'closed_investigations',
    minimumYears: null,
    note: 'Kept and never purged automatically. A documented review occurs at ten years (D-040).',
  },
]

/**
 * The file intake's accepted types (FIL-002, FIL-003), recommended under
 * DN-038 and implemented here. Each is a form E-31's own `kind` enum actually
 * arrives in: a filing acknowledgement, a challan, a committee minute, a
 * screenshot, a configuration export, a log extract. Order is the order
 * REF-28's message names them in.
 *
 * Configuration, not a constant compiled into a handler: seeded as reference
 * data so a customer can change the set without a code release once SLICE-43
 * builds the editing surface. This slice builds no editing surface.
 */
export const ACCEPTED_FILE_TYPES: Array<{ mimeType: string; label: string }> = [
  { mimeType: 'application/pdf', label: 'PDF' },
  { mimeType: 'image/png', label: 'PNG' },
  { mimeType: 'image/jpeg', label: 'JPEG' },
  { mimeType: 'text/csv', label: 'CSV' },
  { mimeType: 'text/plain', label: 'plain text' },
  { mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', label: 'DOCX' },
  { mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', label: 'XLSX' },
]

/**
 * The file-size ceiling (FIL-004), recommended under DN-038: 25 MB. The
 * largest instrument in `fixtures/` is 2.6 MB and a scanned challan sits well
 * under 10 MB.
 */
export const FILE_INTAKE_LIMITS: Array<{ key: string; maxBytes: number }> = [
  { key: 'evidence', maxBytes: 25 * 1024 * 1024 },
]
