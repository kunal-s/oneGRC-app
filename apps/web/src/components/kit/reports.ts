import { useApp } from '@/store'
import { NOW } from '@/lib/time'
import type { RoleKey } from '@/types'

export type ReportModule =
  | 'Risk'
  | 'Control'
  | 'Obligations'
  | 'Compliance'
  | 'Incident'
  | 'Audit'
  | 'DSAR'
  | 'PFRDA'

export interface ReportTemplate {
  id: string
  title: string
  module: ReportModule
  description: string
  personas: RoleKey[]
  filename: string
}

/**
 * Industry-standard report templates, role-scoped, seeded per module. Generating
 * one produces a session artifact and previews via the export-pdf drawer. Reports
 * are views of live state; generated text is never evidence (spec Section 10).
 */
export const REPORT_TEMPLATES: ReportTemplate[] = [
  // Risk
  { id: 'RPT-RISK-REGISTER', title: 'Risk register report', module: 'Risk', description: 'Full register with inherent vs residual, owner, treatment and status.', personas: ['EXEC', 'RISK'], filename: 'risk-register-jun-2026.pdf' },
  { id: 'RPT-RISK-HEATMAP', title: 'Risk heat-map snapshot', module: 'Risk', description: 'Residual 5x5 heat map with domain distribution for the risk committee.', personas: ['EXEC', 'RISK'], filename: 'risk-heatmap-jun-2026.pdf' },
  { id: 'RPT-RISK-TREATMENT', title: 'Top-risks treatment status', module: 'Risk', description: 'Treatment plans and residual movement for the top residual risks.', personas: ['RISK'], filename: 'risk-treatment-status-jun-2026.pdf' },
  // Control
  { id: 'RPT-CTRL-TEST', title: 'Control test summary', module: 'Control', description: 'Latest test result, method and date across the control library.', personas: ['CTRLOWNER', 'AUDITOR', 'EXEC'], filename: 'control-test-summary-jun-2026.pdf' },
  { id: 'RPT-CTRL-COVERAGE', title: 'Coverage by framework', module: 'Control', description: 'Control coverage mapped across ISO, NIST, PCI and PFRDA ICS.', personas: ['CTRLOWNER', 'EXEC', 'AUDITOR'], filename: 'control-coverage-by-framework.pdf' },
  { id: 'RPT-CTRL-FAILING', title: 'Failing-controls report', module: 'Control', description: 'Failing and degraded controls with escalation and linked issues.', personas: ['CTRLOWNER', 'AUDITOR'], filename: 'failing-controls-jun-2026.pdf' },
  // Obligations
  { id: 'RPT-OBL-STATUS', title: 'Obligation status register', module: 'Obligations', description: 'All duties by regulator, status, owner and maker-checker state.', personas: ['CCO', 'ANALYST'], filename: 'obligation-status-register-jun-2026.pdf' },
  { id: 'RPT-OBL-CALENDAR', title: 'Regulatory filing calendar', module: 'Obligations', description: 'Upcoming and overdue filings across every regulator on one calendar.', personas: ['CCO', 'ANALYST'], filename: 'regulatory-filing-calendar.pdf' },
  { id: 'RPT-OBL-MAKERCHECKER', title: 'Maker-checker log', module: 'Obligations', description: 'Submission and approval trail for filings under separation of duties.', personas: ['CCO'], filename: 'maker-checker-log-jun-2026.pdf' },
  // Compliance / board
  { id: 'RPT-BOARD-COMPLIANCE', title: 'Board compliance report', module: 'Compliance', description: 'Posture roll-up: coverage, overdue, incidents and findings for the board.', personas: ['EXEC', 'CCO'], filename: 'board-compliance-report-jun-2026.pdf' },
  { id: 'RPT-INSPECTION-READY', title: 'Inspection-readiness pack', module: 'Compliance', description: 'On-demand answer to "are we in control" with drillable evidence.', personas: ['EXEC', 'CCO'], filename: 'inspection-readiness-pack.pdf' },
  // Incident
  { id: 'RPT-INC-CERTIN', title: 'CERT-In Incident Report (Annexure I)', module: 'Incident', description: 'Six-hour CERT-In report drafted from the single incident record.', personas: ['CTRLOWNER', 'EXEC'], filename: 'certin-annexure-i.pdf' },
  { id: 'RPT-INC-PFRDA', title: 'PFRDA ICS incident intimation', module: 'Incident', description: '48-hour PFRDA intimation plus quarterly Annexure, same record.', personas: ['CTRLOWNER', 'EXEC'], filename: 'pfrda-ics-intimation.pdf' },
  { id: 'RPT-INC-DPDP', title: 'DPDP breach intimation', module: 'Incident', description: 'Data Protection Board and affected-principal intimation, same record.', personas: ['CTRLOWNER', 'EXEC'], filename: 'dpdp-breach-intimation.pdf' },
  // Audit
  { id: 'RPT-AUD-REPORT', title: 'Audit report', module: 'Audit', description: 'Scope, testing, findings and conclusions for an audit cycle.', personas: ['AUDITOR'], filename: 'audit-report-fy2025-26.pdf' },
  { id: 'RPT-AUD-FINDINGS', title: 'Findings register', module: 'Audit', description: 'Open findings by severity and age, with remediation status.', personas: ['AUDITOR'], filename: 'findings-register-jun-2026.pdf' },
  // DSAR
  { id: 'RPT-DSAR-PACK', title: 'DSAR response pack', module: 'DSAR', description: 'Erasure-vs-retention decision and the audit record it generates.', personas: ['CCO', 'ANALYST'], filename: 'dsar-response-pack.pdf' },
  // PFRDA pack (migrated from the hardcoded buttons)
  { id: 'RPT-PFRDA-QTR', title: 'Quarterly compliance return', module: 'PFRDA', description: 'PFRDA quarterly compliance return drawn from the live register.', personas: ['EXEC', 'CCO'], filename: 'pfrda-quarterly-return.pdf' },
  { id: 'RPT-PFRDA-ICS-SELF', title: 'Half-yearly ICS self-assessment', module: 'PFRDA', description: 'PFRDA ICS 2024 self-assessment against the cyber control set.', personas: ['EXEC', 'CCO'], filename: 'pfrda-ics-self-assessment.pdf' },
]

export function reportsForModule(module: ReportModule): ReportTemplate[] {
  return REPORT_TEMPLATES.filter((t) => t.module === module)
}

export function reportsForPersona(role: RoleKey): ReportTemplate[] {
  return REPORT_TEMPLATES.filter((t) => t.personas.includes(role))
}

/**
 * Generate a report: record a session artifact (so it appears in the user's
 * artifacts) and open the export preview drawer. No seed mutation, no backend.
 */
export function useGenerateReport(): (t: ReportTemplate) => void {
  const addArtifact = useApp((s) => s.addArtifact)
  const openDrawer = useApp((s) => s.openDrawer)
  return (t) => {
    addArtifact({ kind: 'report', title: t.title, createdAt: NOW.toISOString(), payload: { templateId: t.id, module: t.module } })
    openDrawer({ kind: 'export-pdf', title: t.title, payload: { filename: t.filename } })
  }
}
