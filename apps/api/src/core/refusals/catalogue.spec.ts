import { describe, expect, it } from 'vitest'
import { REFUSALS, renderRefusal } from './catalogue'

/**
 * REFU-004, build step 8: one test asserting every catalogue row's text,
 * character for character against `platform.md` section 6, including the
 * two rows with no handler to call them (REF-24's trigger, REF-31's screen).
 */
describe('the refusal catalogue (ENG-15, platform.md section 6)', () => {
  it('holds exactly the thirty-one rows', () => {
    expect(Object.keys(REFUSALS)).toHaveLength(31)
  })

  it('REF-01: no authority defined for the action', () => {
    expect(renderRefusal('REF-01', { action: 'ghost.action' })).toBe('No authority is defined for "ghost.action".')
  })

  it('REF-02: neither role list is a role code', () => {
    expect(renderRefusal('REF-02', { action: 'audit.open', allowed: 'Auditor', held: 'Compliance Manager' })).toBe(
      'audit.open requires one of [Auditor]; you hold [Compliance Manager].',
    )
  })

  it('REF-03: names departments as the interface names them, never the Prisma enum member', () => {
    expect(
      renderRefusal('REF-03', {
        action: 'instrument.create',
        needDepartment: 'Compliance and Company Secretarial',
        actorDepartment: 'Data Protection',
      }),
    ).toBe('instrument.create is reserved to the Compliance and Company Secretarial department; you are in Data Protection.')
  })

  it('REF-04: separation of duties', () => {
    expect(renderRefusal('REF-04', { action: 'obligation.approve' })).toBe(
      'obligation.approve enforces separation of duties: you submitted this, so you cannot approve it.',
    )
  })

  it('REF-05: barred line of defence', () => {
    expect(renderRefusal('REF-05', { action: 'audit.open', line: 'First' })).toBe(
      'audit.open requires a checker outside the First line.',
    )
  })

  it('REF-06: names the duty\'s own requirement, and stops when it has none (DN-048)', () => {
    expect(renderRefusal('REF-06', { requirement: 'a treasury challan' })).toBe(
      'This duty cannot be submitted without evidence: a treasury challan.',
    )
    expect(renderRefusal('REF-06', {})).toBe('This duty cannot be submitted without evidence.')
  })

  it('REF-07: the checker cannot verify their own attachment', () => {
    expect(renderRefusal('REF-07')).toBe(
      "Verification is the checker's step and cannot be done by whoever attached the evidence.",
    )
  })

  it('REF-08: generated text is never evidence', () => {
    expect(renderRefusal('REF-08')).toBe('Generated text is never evidence. Attach the artifact itself.')
  })

  it('REF-09: an illegal transition names the entity, the required state, the action and the current state', () => {
    expect(renderRefusal('REF-09', { entity: 'task', requiredState: 'Submitted', action: 'verified', currentState: 'Open' })).toBe(
      'A task must be Submitted to be verified; this one is Open.',
    )
  })

  it('REF-10: a blocking flag names its kind', () => {
    expect(renderRefusal('REF-10', { flagKind: 'CadenceUnspecified' })).toBe(
      'This provision cannot be tracked while CadenceUnspecified is unresolved.',
    )
  })

  it('REF-11: open remediation actions', () => {
    expect(renderRefusal('REF-11', { n: 3 })).toBe('This plan cannot be submitted while 3 remediation actions are open.')
  })

  it('REF-12: an unfiled regulator track', () => {
    expect(renderRefusal('REF-12', { regulator: 'CERT-In' })).toBe('This incident cannot close while the CERT-In track is unfiled.')
  })

  it('REF-13: unacknowledged impact', () => {
    expect(renderRefusal('REF-13', { n: 2 })).toBe('This change cannot close while 2 impacted records are unacknowledged.')
  })

  it('REF-14: a finding closes only when verified', () => {
    expect(renderRefusal('REF-14')).toBe('A finding closes only when the auditor has verified the remediation.')
  })

  it('REF-15: a speak-up report closes only with outcome and feedback', () => {
    expect(renderRefusal('REF-15')).toBe('A report closes only with an outcome and substantive feedback to the reporter.')
  })

  it('REF-16: a second renewal requires the Executive', () => {
    expect(renderRefusal('REF-16', { n: 1 })).toBe('A second renewal requires the Executive. This exception has been renewed 1 times.')
  })

  it('REF-17: not on the case access list', () => {
    expect(renderRefusal('REF-17')).toBe('This case is restricted. You are not on its access list.')
  })

  it('REF-18: recused from the case', () => {
    expect(renderRefusal('REF-18', { basis: 'prior advisory role' })).toBe('You are recused from this case: prior advisory role.')
  })

  it('REF-19: a negative decision names itself and requires a reason', () => {
    expect(renderRefusal('REF-19', { decision: 'not applicable' })).toBe(
      'Record why. A decision of "not applicable" is kept as part of the trail.',
    )
  })

  it('REF-20: a return carries its reason', () => {
    expect(renderRefusal('REF-20')).toBe('A return carries its reason, so the maker knows what to change.')
  })

  it('REF-21: a recovery cannot exceed the loss', () => {
    expect(renderRefusal('REF-21')).toBe('A recovery cannot exceed the loss and turn it into a gain.')
  })

  it('REF-22: an erasure conflicting with retention names the rule and the citation', () => {
    expect(renderRefusal('REF-22', { n: 4, rule: 'PT Act s.6', citation: 'PT-2013-06' })).toBe(
      '4 records cannot be erased: PT Act s.6, PT-2013-06.',
    )
  })

  it('REF-23: a derived value cannot be written to', () => {
    expect(renderRefusal('REF-23', { field: 'overdue', inputs: 'dueDate, state' })).toBe(
      'overdue is computed from dueDate, state and cannot be set.',
    )
  })

  it('REF-24: the audit log is append only, matching the database trigger\'s own text exactly', () => {
    expect(renderRefusal('REF-24')).toBe('The audit log is append only.')
  })

  it('REF-25: the second writer, naming who, when, and what changed', () => {
    expect(renderRefusal('REF-25', { person: 'Vikram Rao', time: '8 Sep 2026, 14:02', whatChanged: 'notApplicableAt, notApplicableReason' })).toBe(
      'Vikram Rao changed this record at 8 Sep 2026, 14:02: notApplicableAt, notApplicableReason. Review and try again.',
    )
  })

  it('REF-26: a cycle cannot close with outstanding tasks', () => {
    expect(renderRefusal('REF-26', { n: 2 })).toBe('This cycle cannot close while 2 tasks are outstanding.')
  })

  it('REF-27: a duty cannot retire with an open cycle', () => {
    expect(renderRefusal('REF-27')).toBe('Retire this duty once its open cycle is filed.')
  })

  it('REF-28: accepted file types and size ceiling', () => {
    expect(renderRefusal('REF-28', { type: 'PDF, PNG and JPEG', size: '25 MB' })).toBe('PDF, PNG and JPEG files up to 25 MB are accepted.')
  })

  it('REF-29: an export carries the same scope as the screen it came from', () => {
    expect(renderRefusal('REF-29')).toBe('An export carries the same scope as the screen it came from.')
  })

  it('REF-30: an unknown identifier, the same sentence whether it does not exist or the caller cannot open it', () => {
    expect(renderRefusal('REF-30', { id: 'SRC-99999' })).toBe('SRC-99999 does not exist, or you cannot open it.')
  })

  it('REF-31: an unknown or inactive subject reads identically', () => {
    expect(renderRefusal('REF-31')).toBe('You are signed in, but this platform has no record for you. Ask your administrator to add you.')
  })

  it('every row with a caller has an HTTP status, and REF-31 (a screen, not a response body) has none', () => {
    for (const [id, row] of Object.entries(REFUSALS)) {
      if (id === 'REF-31') {
        expect(row.status).toBeNull()
      } else {
        expect(row.status).not.toBeNull()
      }
    }
  })

  it('records which fifteen rows have a real caller today and which sixteen do not (REFU-020, REFU-021)', () => {
    const withCaller = Object.values(REFUSALS).filter((r) => r.hasCaller).map((r) => r.id).sort()
    const withoutCaller = Object.values(REFUSALS).filter((r) => !r.hasCaller).map((r) => r.id).sort()
    expect(withCaller).toEqual([
      'REF-01', 'REF-02', 'REF-03', 'REF-04', 'REF-05', 'REF-06', 'REF-09', 'REF-10',
      'REF-19', 'REF-24', 'REF-25', 'REF-28', 'REF-29', 'REF-30', 'REF-31',
    ])
    expect(withoutCaller).toEqual([
      'REF-07', 'REF-08', 'REF-11', 'REF-12', 'REF-13', 'REF-14', 'REF-15', 'REF-16',
      'REF-17', 'REF-18', 'REF-20', 'REF-21', 'REF-22', 'REF-23', 'REF-26', 'REF-27',
    ])
    expect(withCaller).toHaveLength(15)
    expect(withoutCaller).toHaveLength(16)
  })
})
