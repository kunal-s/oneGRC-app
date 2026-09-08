import { describe, expect, it } from 'vitest'
import { resolveSearchDepartment } from './search.service'

/**
 * The boundary this whole slice rests on (SRCH-030 to SRCH-032), proven
 * directly the way `computeScope()` and `evaluateAuthority()` are: no
 * database, no HTTP, the pure decision alone.
 */
describe('resolveSearchDepartment (SRCH-030, SRCH-031, SRCH-032, SRCH-037)', () => {
  it('never scopes an identifier lookup, whatever the caller (BR-SCP-03)', () => {
    const rajesh = { department: 'ITAndInformationSecurity' as const, roles: ['CTRLOWNER'] }
    const anjali = { department: 'ComplianceAndSecretarial' as const, roles: ['COMPLIANCE_MGR'] }
    expect(resolveSearchDepartment('identifier', rajesh)).toBeUndefined()
    expect(resolveSearchDepartment('identifier', anjali)).toBeUndefined()
  })

  it('scopes a term search to a department-locked caller (BR-SCP-02)', () => {
    const rajesh = { department: 'ITAndInformationSecurity' as const, roles: ['CTRLOWNER'] }
    expect(resolveSearchDepartment('term', rajesh)).toBe('ITAndInformationSecurity')
  })

  it('leaves a term search unscoped for a caller who sees all (Compliance and Company Secretarial, BR-SCP-02)', () => {
    const anjali = { department: 'ComplianceAndSecretarial' as const, roles: ['COMPLIANCE_MGR'] }
    expect(resolveSearchDepartment('term', anjali)).toBeUndefined()
  })

  it('leaves a term search unscoped for the Administrator, regardless of their own department', () => {
    const imran = { department: 'Risk' as const, roles: ['ADMIN'] }
    expect(resolveSearchDepartment('term', imran)).toBeUndefined()
  })

  it('gives the same person two different answers for the two kinds of query (SRCH-030 and SRCH-031 together)', () => {
    const deepa = { department: 'FinanceAndTax' as const, roles: ['COMPLIANCE_ANALYST'] }
    expect(resolveSearchDepartment('identifier', deepa)).toBeUndefined()
    expect(resolveSearchDepartment('term', deepa)).toBe('FinanceAndTax')
  })

  // SRCH-037: the function itself takes no query parameter to widen against.
  // There is no `department` argument here for a caller to set, which is how
  // this holds structurally rather than by a check that could be missed.
})
