import { describe, expect, it } from 'vitest'
import { evaluateAuthority, type AuthorityActor, type AuthorityRow } from './authority'

const person = (over: Partial<AuthorityActor>): AuthorityActor => ({
  personId: 'p1',
  roles: [],
  department: 'Risk',
  lineOfDefence: 'Second',
  ...over,
})

describe('evaluateAuthority (SCR-088-060, AUTH-G3, D-046)', () => {
  it('refuses an action with no authority rows at all (REF-01, BR-AUT-01)', () => {
    const result = evaluateAuthority([], person({ roles: ['ADMIN'] }), { action: 'ghost.action' })
    expect(result).toEqual({ ok: false, ref: 'REF-01', message: 'No authority is defined for "ghost.action".' })
  })

  it('refuses a caller holding none of the permitted roles, naming roles the way the interface does (REF-02, BR-AUT-03, REFU-005)', () => {
    const rows: AuthorityRow[] = [
      { roleCode: 'AUDITOR', requiresDepartment: null, requiresLineOfDefence: null, separationOfDuties: false },
    ]
    const result = evaluateAuthority(rows, person({ roles: ['COMPLIANCE_MGR'] }), { action: 'audit.open' })
    expect(result).toEqual({
      ok: false,
      ref: 'REF-02',
      message: 'audit.open requires one of [Auditor]; you hold [Compliance Manager].',
    })
  })

  describe('instrument.create (D-037, the worked test of the per-row gate)', () => {
    const rows: AuthorityRow[] = [
      {
        roleCode: 'COMPLIANCE_MGR',
        requiresDepartment: 'ComplianceAndSecretarial',
        requiresLineOfDefence: null,
        separationOfDuties: false,
      },
      { roleCode: 'ADMIN', requiresDepartment: null, requiresLineOfDefence: null, separationOfDuties: false },
    ]

    it('refuses Priya Sharma: Compliance Manager, but sitting in Data Protection, naming departments the way the interface does (SCR-088-081, DN-023, REFU-006)', () => {
      const priya = person({ personId: 'priya', roles: ['COMPLIANCE_MGR'], department: 'DataProtection' })
      const result = evaluateAuthority(rows, priya, { action: 'instrument.create' })
      expect(result).toEqual({
        ok: false,
        ref: 'REF-03',
        message: 'instrument.create is reserved to the Compliance and Company Secretarial department; you are in Data Protection.',
      })
    })

    it('permits Anjali: Compliance Manager, in Compliance and Company Secretarial', () => {
      const anjali = person({
        personId: 'anjali',
        roles: ['COMPLIANCE_MGR'],
        department: 'ComplianceAndSecretarial',
      })
      expect(evaluateAuthority(rows, anjali, { action: 'instrument.create' })).toEqual({ ok: true })
    })

    it('permits Imran: Administrator, whose row names no department, regardless of his own', () => {
      const imran = person({ personId: 'imran', roles: ['ADMIN'], department: 'Risk' })
      expect(evaluateAuthority(rows, imran, { action: 'instrument.create' })).toEqual({ ok: true })
    })

    it('permits a hypothetical caller holding both roles from whichever row is satisfied', () => {
      // The scenario AUTH-G3 exists for: under the old all-rows reading, one
      // ungated row silently switched the department test off for the gated
      // row held by the same caller. Per-row evaluation cannot do that.
      const both = person({ personId: 'both', roles: ['COMPLIANCE_MGR', 'ADMIN'], department: 'Risk' })
      expect(evaluateAuthority(rows, both, { action: 'instrument.create' })).toEqual({ ok: true })
    })
  })

  it('applies separation of duties only to a row the caller satisfied, not merely held (SCR-088-061)', () => {
    const rows: AuthorityRow[] = [
      {
        roleCode: 'COMPLIANCE_MGR',
        requiresDepartment: 'ComplianceAndSecretarial',
        requiresLineOfDefence: null,
        separationOfDuties: true,
      },
      { roleCode: 'EXEC', requiresDepartment: null, requiresLineOfDefence: null, separationOfDuties: false },
    ]
    // Holds COMPLIANCE_MGR but sits outside CS, so that row is held but not
    // satisfied; the only satisfied row (EXEC) carries no SoD flag.
    const actor = person({ personId: 'maker-1', roles: ['COMPLIANCE_MGR', 'EXEC'], department: 'Risk' })
    expect(evaluateAuthority(rows, actor, { action: 'obligation.approve', makerId: 'maker-1' })).toEqual({
      ok: true,
    })
  })

  it('refuses the maker approving their own item when the satisfied row carries the flag (REF-04, BR-AUT-05)', () => {
    const rows: AuthorityRow[] = [
      { roleCode: 'EXEC', requiresDepartment: null, requiresLineOfDefence: null, separationOfDuties: true },
    ]
    const actor = person({ personId: 'maker-1', roles: ['EXEC'] })
    const result = evaluateAuthority(rows, actor, { action: 'obligation.approve', makerId: 'maker-1' })
    expect(result).toEqual({
      ok: false,
      ref: 'REF-04',
      message: 'obligation.approve enforces separation of duties: you submitted this, so you cannot approve it.',
    })
  })

  it('reads the line-of-defence column but never fires while it is empty (SCR-088-071, D-047)', () => {
    const rows: AuthorityRow[] = [
      { roleCode: 'AUDITOR', requiresDepartment: null, requiresLineOfDefence: null, separationOfDuties: false },
    ]
    const actor = person({ roles: ['AUDITOR'], lineOfDefence: 'First' })
    expect(evaluateAuthority(rows, actor, { action: 'audit.open' })).toEqual({ ok: true })
  })

  it('is reachable: REF-05 fires when a satisfied row bars the caller\'s own line (BR-AUT-10, AUTH-G1)', () => {
    const rows: AuthorityRow[] = [
      { roleCode: 'AUDITOR', requiresDepartment: null, requiresLineOfDefence: 'First', separationOfDuties: false },
    ]
    const actor = person({ roles: ['AUDITOR'], lineOfDefence: 'First' })
    const result = evaluateAuthority(rows, actor, { action: 'audit.open' })
    expect(result).toEqual({
      ok: false,
      ref: 'REF-05',
      message: 'audit.open requires a checker outside the First line.',
    })
  })
})
