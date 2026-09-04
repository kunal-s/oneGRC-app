import { describe, expect, it } from 'vitest'
import { computeViews } from './views'

describe('computeViews (SCR-082, D-045)', () => {
  it('gives a single-role person exactly one view', () => {
    const views = computeViews({ jobTitle: 'Head of Compliance', roles: ['COMPLIANCE_MGR'] })
    expect(views).toEqual([{ key: 'COMPLIANCE_MGR', roleCodes: ['COMPLIANCE_MGR'], label: 'Compliance Manager' }])
  })

  it('merges Meera\'s functional roles into one Executive view and keeps her committee hat separate', () => {
    const views = computeViews({ jobTitle: 'Chief Risk Officer', roles: ['EXEC', 'RISK_MGR', 'RISK_CTTEE'] })
    expect(views).toEqual([
      { key: 'EXEC', roleCodes: ['EXEC', 'RISK_MGR'], label: 'Executive' },
      { key: 'RISK_CTTEE', roleCodes: ['RISK_CTTEE'], label: 'Risk Committee Chair', group: 'Committee' },
    ])
  })

  it('gives Sunita Auditor and Audit Committee Chair as two distinct views', () => {
    const views = computeViews({ jobTitle: 'Head of Internal Audit', roles: ['AUDITOR', 'AUDIT_CTTEE'] })
    expect(views.map((v) => v.label)).toEqual(['Auditor', 'Audit Committee Chair'])
    expect(views[1].group).toBe('Committee')
  })

  it('relabels Compliance Manager as Company Secretary for the person whose job title is literally that', () => {
    const views = computeViews({ jobTitle: 'Company Secretary', roles: ['COMPLIANCE_MGR'] })
    expect(views).toEqual([{ key: 'COMPANY_SECRETARY', roleCodes: ['COMPLIANCE_MGR'], label: 'Company Secretary' }])
  })

  it('does not relabel Compliance Manager for anyone else holding it', () => {
    const views = computeViews({ jobTitle: 'Data Protection Officer', roles: ['COMPLIANCE_MGR'] })
    expect(views[0].label).toBe('Compliance Manager')
    expect(views[0].key).toBe('COMPLIANCE_MGR')
  })

  it('gives a person with no roles no views', () => {
    expect(computeViews({ jobTitle: 'Nobody', roles: [] })).toEqual([])
  })
})
