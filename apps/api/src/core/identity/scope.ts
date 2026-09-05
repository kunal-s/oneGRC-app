import type { Department } from '@prisma/client'

/**
 * ENG-14, the one scope resolver (R-064, SCR-088), moved to the server.
 *
 * A record takes its department from whoever owns it (BR-SCP-01). A caller
 * sees the records owned by people in their own department; Compliance and
 * Company Secretarial and the Administrator keep the cross-department view
 * (BR-SCP-02, FRD §4.5).
 */

/** The eight departments, in the order SCR-088-011 lists them. */
export const DEPARTMENT_LABEL: Record<Department, string> = {
  ComplianceAndSecretarial: 'Compliance and Company Secretarial',
  Risk: 'Risk',
  ITAndInformationSecurity: 'IT and Information Security',
  InvestmentCompliance: 'Investment Compliance',
  DataProtection: 'Data Protection',
  FinanceAndTax: 'Finance and Tax',
  HRAndLabour: 'HR and Labour',
  InternalAudit: 'Internal Audit',
}

export const DEPARTMENTS: Department[] = [
  'ComplianceAndSecretarial',
  'Risk',
  'ITAndInformationSecurity',
  'InvestmentCompliance',
  'DataProtection',
  'FinanceAndTax',
  'HRAndLabour',
  'InternalAudit',
]

export const ALL_DEPARTMENTS_LABEL = 'All departments'

export interface Scope {
  /**
   * The caller's own department, by name (SCR-088-040's "The <department>
   * department owns no <entity>." needs a noun, not an enum code). Where the
   * boundary must be enforced in a query, use the actor's raw `department`
   * instead - this field is for display.
   */
  department: string
  /** Compliance and Company Secretarial and the Administrator see every department. */
  seesAll: boolean
  label: string
}

/** R-064: which department a caller is scoped to, whether they see all, and the label to show. */
export function computeScope(actor: { department: Department; roles: string[] }): Scope {
  const seesAll = actor.roles.includes('ADMIN') || actor.department === 'ComplianceAndSecretarial'
  return {
    department: DEPARTMENT_LABEL[actor.department],
    seesAll,
    label: seesAll ? ALL_DEPARTMENTS_LABEL : DEPARTMENT_LABEL[actor.department],
  }
}
