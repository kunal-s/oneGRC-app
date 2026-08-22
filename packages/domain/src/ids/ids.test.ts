import { describe, expect, it } from 'vitest'
import {
  ALL_PREFIXES,
  ID_MAX_LENGTH,
  IdAllocator,
  IdFormatError,
  InMemorySequenceSource,
  PREFIXES,
  formatCycleId,
  formatId,
  isCycleId,
  isValidId,
  maxLengthFor,
  parseCycleId,
  parseId,
  specFor,
} from './index.js'

const YEAR = 2026

/** Build a maximum-width id for a prefix — the worst case for layout. */
function widestId(prefix: (typeof ALL_PREFIXES)[number]): string {
  const spec = specFor(prefix)
  const max = 10 ** spec.digits - 1
  return formatId(prefix, max, spec.shape === 'event' ? YEAR : undefined)
}

describe('the 11-character cap (ADR-003)', () => {
  it.each(ALL_PREFIXES)('%s never exceeds the cap, even at full sequence', (prefix) => {
    expect(maxLengthFor(prefix)).toBeLessThanOrEqual(ID_MAX_LENGTH)
    expect(widestId(prefix).length).toBeLessThanOrEqual(ID_MAX_LENGTH)
  })

  it('rejects a sequence that would overflow its field rather than widening the id', () => {
    const spec = specFor('OBL')
    const overflow = 10 ** spec.digits
    expect(() => formatId('OBL', overflow)).toThrow(IdFormatError)
  })
})

describe('format and parse round-trip', () => {
  it.each(ALL_PREFIXES)('%s round-trips', (prefix) => {
    const spec = specFor(prefix)
    const isEvent = spec.shape === 'event'
    const id = formatId(prefix, 42, isEvent ? YEAR : undefined)
    const parsed = parseId(id)
    expect(parsed.prefix).toBe(prefix)
    expect(parsed.sequence).toBe(42)
    expect(parsed.year).toBe(isEvent ? YEAR : undefined)
  })

  it('produces the documented shapes', () => {
    expect(formatId('SRC', 231)).toBe('SRC-00231')
    expect(formatId('CTRL', 273)).toBe('CTRL-0273')
    expect(formatId('OBL', 142)).toBe('OBL-0142')
    expect(formatId('RISK', 140)).toBe('RISK-0140')
    expect(formatId('POL', 46)).toBe('POL-046')
    expect(formatId('INC', 411, 2026)).toBe('INC-26-0411')
    expect(formatId('ISS', 233, 2026)).toBe('ISS-26-0233')
    expect(formatId('EXC', 41, 2026)).toBe('EXC-26-041')
  })

  it('zero-pads so ids sort naturally as text', () => {
    const ids = [formatId('OBL', 9), formatId('OBL', 10), formatId('OBL', 100)]
    expect([...ids].sort()).toEqual(ids)
  })
})

describe('rejecting the prototype scheme (spec §23 D-11)', () => {
  const semantic = [
    'SRC-PFRDA-INV-COMMITTEE',
    'INST-PFRDA-INV-2025-MAR',
    'OBL-PFRDA-Q1-07',
    'CTRL-ISO-A.8.9',
    'AUD-INT-2026-04-INVRES',
    'RISK-IT-0142',
  ]
  it.each(semantic)('rejects the semantic id %s', (id) => {
    expect(isValidId(id)).toBe(false)
    expect(() => parseId(id)).toThrow(IdFormatError)
  })

  it('rejects an unknown prefix', () => {
    expect(() => parseId('XYZ-0001')).toThrow(/unknown prefix/)
  })

  it('rejects a catalogue prefix given a year, and an event prefix without one', () => {
    expect(() => parseId('POL-26-046')).toThrow(/not an event id/) // 10 chars, so it reaches the shape check
    expect(() => parseId('INC-0411')).toThrow(/requires a year segment/)
    expect(() => formatId('INC', 411)).toThrow(/requires a year/)
  })

  it('rejects a sequence of the wrong width', () => {
    expect(() => parseId('OBL-142')).toThrow(/must be 4 digits/)
    expect(() => parseId('OBL-00142')).toThrow(/must be 4 digits/)
  })
})

describe('allocation never reuses an id (§7.4)', () => {
  it.each(ALL_PREFIXES)('%s issues a strictly increasing sequence', async (prefix) => {
    const alloc = new IdAllocator(new InMemorySequenceSource())
    const isEvent = specFor(prefix).shape === 'event'
    const issued: string[] = []
    for (let i = 0; i < 50; i++) {
      issued.push(await alloc.allocate(prefix, isEvent ? YEAR : undefined))
    }
    expect(new Set(issued).size).toBe(50)
    expect(parseId(issued[0]!).sequence).toBe(1)
    expect(parseId(issued[49]!).sequence).toBe(50)
  })

  it('keeps event sequences independent per year', async () => {
    const alloc = new IdAllocator(new InMemorySequenceSource())
    expect(await alloc.allocate('INC', 2026)).toBe('INC-26-0001')
    expect(await alloc.allocate('INC', 2027)).toBe('INC-27-0001')
    expect(await alloc.allocate('INC', 2026)).toBe('INC-26-0002')
  })

  it('keeps counters independent per prefix', async () => {
    const alloc = new IdAllocator(new InMemorySequenceSource())
    expect(await alloc.allocate('OBL')).toBe('OBL-0001')
    expect(await alloc.allocate('CTRL')).toBe('CTRL-0001')
    expect(await alloc.allocate('OBL')).toBe('OBL-0002')
  })
})

describe('cycle derivation (ADR-004)', () => {
  it('derives a cycle from its duty', () => {
    expect(formatCycleId('OBL-0142', '2026Q1')).toBe('OBL-0142.2026Q1')
    expect(parseCycleId('OBL-0142.2026Q1')).toEqual({ dutyId: 'OBL-0142', period: '2026Q1' })
  })

  it.each(['2026Q1', '2026Q4', '2026H1', '2026H2', '2026M01', '2026M12', '2026W07', '2026A'])(
    'accepts the period %s',
    (period) => {
      expect(isCycleId(formatCycleId('OBL-0142', period))).toBe(true)
    },
  )

  it.each(['2026Q5', '2026M13', '2026M00', '2026X1', 'Q1', '2026', '2026W54'])(
    'rejects the period %s',
    (period) => {
      expect(() => formatCycleId('OBL-0142', period)).toThrow(IdFormatError)
    },
  )

  it('only obligations have cycles', () => {
    expect(() => formatCycleId('CTRL-0273', '2026Q1')).toThrow(/derive from an obligation/)
  })

  it('a cycle id is not a plain id — it is never rendered inline', () => {
    const cycle = formatCycleId('OBL-0142', '2026Q1')
    expect(cycle.length).toBeGreaterThan(ID_MAX_LENGTH)
    expect(isValidId(cycle)).toBe(false)
  })
})

describe('the registry itself', () => {
  it('promoted every two-character prefix to three (ADR-003)', () => {
    for (const p of ['WBR', 'APE', 'DAS', 'WPR', 'DSR']) {
      expect(ALL_PREFIXES).toContain(p)
    }
    for (const dead of ['WB', 'AP', 'DA', 'WP', 'DSAR']) {
      expect(ALL_PREFIXES).not.toContain(dead)
    }
  })

  it('has no duplicate prefixes and every prefix is 3-4 uppercase chars', () => {
    const seen = new Set<string>()
    for (const key of ALL_PREFIXES) {
      const { prefix } = PREFIXES[key]
      expect(prefix).toMatch(/^[A-Z]{3,4}$/)
      expect(seen.has(prefix)).toBe(false)
      seen.add(prefix)
    }
  })
})
