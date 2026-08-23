import { describe, expect, it } from 'vitest'
import { classifyProvision, type OrgCapabilities } from './classify.js'

/** A Maharashtra employer that is also a pension fund manager. */
const ORG: OrgCapabilities = {
  capacities: ['employer', 'pensionFundManager', 'entity'],
  jurisdictions: ['IN', 'IN-MH'],
}

const c = (heading: string, text: string, isSubClause = false) =>
  classifyProvision({ heading, text, isSubClause }, ORG)

describe('the two provisions the customer flagged must not be promoted', () => {
  it('PT Rules r.2 Definitions is a Definition, not a Duty', () => {
    const r = c(
      'Definitions',
      'In these rules, unless the context otherwise requires - (1) "the Act" means the Maharashtra ' +
        'State Tax on Professions, Trades, Callings and Employments Act, 1975; (2) "Form" means a form ' +
        'appended to these rules; every reference shall be construed accordingly.',
    )
    expect(r.classification).toBe('Definition')
    expect(r.confidence).toBeGreaterThan(0.9)
  })

  it('PT Rules r.5 Amendment of certificate of registration is procedure, not our duty', () => {
    const r = c(
      'Amendment of certificate of registration',
      'Where the holder of a certificate of registration granted under rule 3 desires the certificate ' +
        'to be amended, he shall submit an application in Form I to the prescribed authority, and the ' +
        'authority may amend the certificate.',
    )
    // It carries a duty on the holder, but the point is that it is not a
    // standing obligation - it is conditional procedure. It must at minimum
    // never be classified as an unconditional Duty binding us.
    expect(['PowerProcedure', 'Duty']).toContain(r.classification)
    if (r.classification === 'Duty') {
      expect(r.rationale.join(' ')).toMatch(/holder of a certificate/i)
    }
  })
})

describe('the duty-bearer decides whether a duty is ours', () => {
  it('PT Act s.6(1) binds every employer, so it is our duty', () => {
    const r = c(
      'Returns',
      'Every employer registered under this Act shall furnish to the prescribed authority a return ' +
        'in such form, for such period and by such dates as may be prescribed.',
      true,
    )
    expect(r.classification).toBe('Duty')
    expect(r.bindsUs).toBe('yes')
    expect(r.dutyBearer).toMatch(/employer/i)
  })

  it('PFRDA Act s.14 is a genuine duty clause that binds the AUTHORITY, not us', () => {
    const r = c(
      'Duties, powers and functions of Authority',
      'Subject to the provisions of this Act, the Authority shall regulate, promote and ensure ' +
        'orderly growth of the National Pension System and shall perform such functions as may be ' +
        'prescribed.',
    )
    expect(r.bindsUs).toBe('no')
    expect(r.rationale.join(' ')).toMatch(/not this organisation/i)
  })
})

describe('the classes a compliance officer distinguishes', () => {
  it('a penalty is a Consequence, attached to a duty rather than tracked as one', () => {
    const r = c(
      'Penalty for non-payment of tax',
      'If an enrolled person fails to pay the tax as required, he shall be liable to pay a penalty ' +
        'equal to ten per cent of the amount of tax due, and shall be punishable on conviction.',
    )
    expect(r.classification).toBe('Consequence')
  })

  it('short title and commencement is Housekeeping even though it says shall', () => {
    const r = c(
      'Short title, extent and commencement',
      'These rules may be called the Maharashtra Profession Tax Rules, 1975. They shall come into ' +
        'force on the 1st day of April 1975 and shall extend to the whole of the State.',
    )
    expect(r.classification).toBe('Housekeeping')
  })

  it('an appeal provision is PowerProcedure, a right rather than a duty', () => {
    const r = c(
      'Appeal',
      'Any person aggrieved by an order passed under this Act may appeal to the appellate authority ' +
        'within sixty days.',
    )
    expect(r.classification).toBe('PowerProcedure')
  })

  it('constitution of authorities is Machinery', () => {
    const r = c(
      'Authorities for implementation of the Act',
      'For carrying out the purposes of this Act the State Government shall appoint a Commissioner ' +
        'and such other officers as it thinks fit.',
    )
    expect(r.classification).toBe('Machinery')
  })
})

describe('honesty of the rules tier', () => {
  it('never writes a plain-language duty statement', () => {
    const r = c('Returns', 'Every employer shall furnish a return.')
    expect(r.dutyStatement).toBe('')
  })

  it('labels its provider, version and ruleset so a decision can be explained later', () => {
    const r = c('Returns', 'Every employer shall furnish a return.')
    expect(r.provider).toBe('rules')
    expect(r.ruleset).toMatch(/^rules-\d+\.\d+\.\d+$/)
  })

  it('returns Unclassified with low confidence rather than guessing', () => {
    const r = c('Miscellaneous', 'The provisions of this Chapter are supplemental.')
    expect(r.classification).toBe('Unclassified')
    expect(r.confidence).toBeLessThan(0.5)
  })

  it('carries the features forward, so a model tier gets the same hints', () => {
    const r = c('Returns', 'Every employer shall furnish a return by the prescribed date.')
    expect(r.features.modality).toBe('mandatory')
    expect(r.features.dutyBearerPhrase).toMatch(/employer/i)
  })
})

describe('the elective shall — the SRC-00206 regression', () => {
  // PT Rules r.5, verbatim in shape. The modal is real, but nothing is owed
  // until the holder chooses to apply. Tracking it produced SRC-00206.
  const R5 =
    'Where the holder of a certificate of registration granted under rule 3 desires the ' +
    'certificate to be amended, he shall submit an application in Form I to the prescribed ' +
    'authority, and the authority may amend the certificate accordingly.'

  it('reads an elective shall as procedure, not a duty', () => {
    const r = c('Amendment of certificate of registration', R5)
    expect(r.classification).toBe('PowerProcedure')
  })

  it('says why, so the reviewer can disagree with the reasoning', () => {
    const r = c('Amendment of certificate of registration', R5)
    expect(r.rationale.join(' ')).toMatch(/electing to act/i)
  })

  it('still recognises an unconditional shall as a duty', () => {
    const r = c('Returns', 'Every employer shall furnish a return by the prescribed date.')
    expect(r.classification).toBe('Duty')
  })

  it('a conditional that is not an election is still a duty', () => {
    // "If the tax is not paid" is a trigger, not a choice by the bearer.
    const r = c(
      'Consequences of failure to pay',
      'If any employer fails to pay the tax within the prescribed time, he shall pay simple ' +
        'interest at the prescribed rate for each month of delay.',
    )
    expect(['Duty', 'Consequence']).toContain(r.classification)
    expect(r.classification).not.toBe('PowerProcedure')
  })
})
