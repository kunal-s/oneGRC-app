import type { RoleKey } from '@/types'
import type { ViewOption } from '@/api/types'

/**
 * Server Role.code -> client RoleKey. The nine roles under two vocabularies:
 * E-04 Role.code on the server, and the persona enum the client shipped with
 * before the server existed (SCR-082-051 reconnaissance). The Company
 * Secretary view carries roleCode COMPLIANCE_MGR like any other Compliance
 * Manager, so it resolves through the same entry deliberately: it is a view
 * over that role, not a new one.
 */
export const ROLE_CODE_TO_KEY: Record<string, RoleKey> = {
  EXEC: 'EXEC',
  RISK_MGR: 'RISK',
  COMPLIANCE_MGR: 'CCO',
  COMPLIANCE_ANALYST: 'ANALYST',
  CONTROL_OWNER: 'CTRLOWNER',
  AUDITOR: 'AUDITOR',
  ADMIN: 'ADMIN',
  AUDIT_CTTEE: 'ARC',
  RISK_CTTEE: 'RMC',
}

/**
 * Every client RoleKey a view's server role codes resolve to, deduped. A
 * merged functional view (e.g. Executive + Risk Manager) resolves to more
 * than one, which is how the nav and the queue union them. SCR-082-057.
 */
export function roleKeysForView(view: ViewOption): RoleKey[] {
  const keys = view.roleCodes.map((c) => ROLE_CODE_TO_KEY[c]).filter((k): k is RoleKey => !!k)
  return Array.from(new Set(keys))
}

/**
 * The server's Department enum (E-06, PascalCase, no spaces) to the label
 * this UI already renders everywhere else (access.ts DEPARTMENTS). whoami
 * carries the enum value, not a display string, since it also drives the
 * authority department gate. SCR-082-005 needs the label, not the code.
 */
const DEPARTMENT_LABEL: Record<string, string> = {
  ComplianceAndSecretarial: 'Compliance and Company Secretarial',
  Risk: 'Risk',
  ITAndInformationSecurity: 'IT and Information Security',
  InvestmentCompliance: 'Investment Compliance',
  DataProtection: 'Data Protection',
  FinanceAndTax: 'Finance and Tax',
  HRAndLabour: 'HR and Labour',
  InternalAudit: 'Internal Audit',
}

export function departmentLabel(department: string): string {
  return DEPARTMENT_LABEL[department] ?? department
}
