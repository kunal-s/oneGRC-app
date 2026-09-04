import { describe, expect, it } from 'vitest'
import { computeScope, DEPARTMENT_LABEL, DEPARTMENTS } from './scope'

describe('computeScope (R-064, SCR-088-012, SCR-088-013)', () => {
  it('scopes a department-locked person to their own department, unable to see all', () => {
    const scope = computeScope({ department: 'FinanceAndTax', roles: ['COMPLIANCE_ANALYST'] })
    expect(scope).toEqual({ department: 'Finance and Tax', seesAll: false, label: 'Finance and Tax' })
  })

  it('gives the Administrator the all-departments view, department still naming their own', () => {
    const scope = computeScope({ department: 'Risk', roles: ['ADMIN'] })
    expect(scope).toEqual({ department: 'Risk', seesAll: true, label: 'All departments' })
  })

  it('gives Compliance and Company Secretarial the all-departments view (BR-SCP-02)', () => {
    const scope = computeScope({ department: 'ComplianceAndSecretarial', roles: ['COMPLIANCE_MGR'] })
    expect(scope).toEqual({
      department: 'Compliance and Company Secretarial',
      seesAll: true,
      label: 'All departments',
    })
  })

  it('lists all eight departments (SCR-088-011)', () => {
    expect(DEPARTMENTS).toHaveLength(8)
    expect(DEPARTMENTS.map((d) => DEPARTMENT_LABEL[d])).toEqual([
      'Compliance and Company Secretarial',
      'Risk',
      'IT and Information Security',
      'Investment Compliance',
      'Data Protection',
      'Finance and Tax',
      'HR and Labour',
      'Internal Audit',
    ])
  })
})
