import { describe, expect, it } from 'vitest'
import { CONFIDENTIAL_ENTITIES, diffFields, VERSIONED_ENTITIES } from './optimistic-lock'

describe('VERSIONED_ENTITIES (SLICE-01D, CON-001)', () => {
  it('covers exactly the entities that are ever the named subject of a governed update today', () => {
    expect([...VERSIONED_ENTITIES].sort()).toEqual(
      ['ProvisionFlag', 'SourceClause', 'SourceProvision', 'Task'].sort(),
    )
  })

  it('does not cover entities that only ever change as a side effect of a Task write', () => {
    expect(VERSIONED_ENTITIES.has('ObligationCycle')).toBe(false)
    expect(VERSIONED_ENTITIES.has('Evidence')).toBe(false)
  })

  it('does not cover entities that are only ever created, never updated, by a governed write', () => {
    expect(VERSIONED_ENTITIES.has('Obligation')).toBe(false)
    expect(VERSIONED_ENTITIES.has('Control')).toBe(false)
  })
})

describe('diffFields (CON-013)', () => {
  it('names exactly the fields that changed, with before and after', () => {
    const before = { id: '1', version: 1, notApplicableAt: null, notApplicableReason: null }
    const after = { id: '1', version: 2, notApplicableAt: '2026-09-05T00:00:00Z', notApplicableReason: 'out of scope' }
    expect(diffFields('SourceProvision', before, after)).toEqual({
      notApplicableAt: { before: null, after: '2026-09-05T00:00:00Z' },
      notApplicableReason: { before: null, after: 'out of scope' },
    })
  })

  it('never reports the version field itself as a changed field', () => {
    const before = { id: '1', version: 1 }
    const after = { id: '1', version: 2 }
    expect(diffFields('Task', before, after)).toEqual({})
  })

  it('reports nothing at all for a confidential entity, only that something changed elsewhere (CON-014)', () => {
    CONFIDENTIAL_ENTITIES.add('SpeakUpReport')
    try {
      const before = { id: '1', outcome: null }
      const after = { id: '1', outcome: 'upheld' }
      expect(diffFields('SpeakUpReport', before, after)).toBeNull()
    } finally {
      CONFIDENTIAL_ENTITIES.delete('SpeakUpReport')
    }
  })
})
