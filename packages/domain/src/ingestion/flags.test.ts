import { describe, expect, it } from 'vitest'
import { detectFlags, looksMandatory } from './flags.js'

/** Verbatim excerpts from the fixture instruments — not invented examples. */
const PT_ACT_S6_1 =
  'Every employer registered under this Act shall furnish to the prescribed ' +
  'authority 5[a return in such form, for such period and by such dates as may be prescribed] ' +
  'showing therein the salaries and wages paid by him and the amount of tax deducted by him ' +
  'in respect thereof ******:'

const PT_ACT_S6_1_PROVISO =
  '[Provided that, the employer registered under sub-section (3A) of section 5 shall, after ' +
  'the commencement of his liability to pay tax, furnish to the prescribed authority, a return ' +
  'in such form, for such period and by such dates as may be prescribed]:'

const PT_RULES_R11 =
  '(a) [5][was less than Rs. 1,00,000] shall furnish an annual return on or before the 31st ' +
  'of March, of the year to which the return relates.'

const PFRDA_CIRCULAR_P4 =
  'This circular is being issued in exercise of the powers conferred under Section 14 of the ' +
  'Pension Fund Regulatory and Development Authority Act, 2013.'

const PT_ACT_S6_2 =
  'Every such return shall be accompanied by a treasury challan in proof to payment of full ' +
  'amount of tax due according to the return, and a return without such proof of payment shall ' +
  'not be deemed to have been duly filed.'

const kinds = (t: string, c?: number) => detectFlags(t, c).map((f) => f.kind)

describe('flags fire on their real instances', () => {
  it('CadenceUnspecified — PT Act s.6(1) defers its cadence to the Rules', () => {
    expect(kinds(PT_ACT_S6_1)).toContain('CadenceUnspecified')
  })

  it('AmendedText — s.6(1) carries bracket substitutions and an omission marker', () => {
    expect(kinds(PT_ACT_S6_1)).toContain('AmendedText')
  })

  it('ProvisoPresent — the first proviso to s.6(1)', () => {
    expect(kinds(PT_ACT_S6_1_PROVISO)).toContain('ProvisoPresent')
  })

  it('ConditionalApplicability — PT Rules r.11 turns on the liability figure', () => {
    expect(kinds(PT_RULES_R11)).toContain('ConditionalApplicability')
  })

  it('UnresolvedCrossReference — the circular cites PFRDA Act s.14', () => {
    expect(kinds(PFRDA_CIRCULAR_P4)).toContain('UnresolvedCrossReference')
  })

  it('LowExtractionConfidence — the Rules are an OCR scan', () => {
    expect(kinds(PT_RULES_R11, 0.72)).toContain('LowExtractionConfidence')
    expect(kinds(PT_RULES_R11, 0.99)).not.toContain('LowExtractionConfidence')
  })
})

describe('flags do not fire spuriously', () => {
  it('a clean mandatory clause raises no cadence or discretion flag', () => {
    const k = kinds(PT_ACT_S6_2)
    expect(k).not.toContain('CadenceUnspecified')
    expect(k).not.toContain('DiscretionaryLanguage')
    expect(k).not.toContain('ProvisoPresent')
  })

  it('empty text raises nothing', () => {
    expect(detectFlags('')).toEqual([])
  })
})

describe('duty versus discretion', () => {
  it('recognises a duty', () => {
    expect(looksMandatory(PT_ACT_S6_1)).toBe(true)
    expect(looksMandatory(PT_ACT_S6_2)).toBe(true)
  })

  it('does not read a permission as a duty', () => {
    expect(
      looksMandatory('the Commissioner may, subject to such terms and conditions, permit any employer'),
    ).toBe(false)
  })
})
