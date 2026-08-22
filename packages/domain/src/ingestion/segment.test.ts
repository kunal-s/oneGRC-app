import { describe, expect, it } from 'vitest'
import { segment, type PageText } from './segment.js'

const p = (text: string, pageNumber = 1): PageText => ({ pageNumber, text })

/** Shapes taken verbatim from the fixture instruments. */
const ACT = `
      5. Registration and Enrolment.— (1) Every employer shall obtain a certificate.
      6. Returns.–– (1) Every employer registered under this Act shall furnish to the
prescribed authority a return in such form as may be prescribed.
      (2) Every such return shall be accompanied by a treasury challan in proof to
payment of full amount of tax due according to the return.
        [(3) Where and employer has failed to file such return within the prescribed
time, he shall pay, by way of a late fee, an amount of rupees two hundred.
      [7. Assessment and collection of tax.–– (1) The amount of tax due from an employer
liable to pay tax shall be assessed separately for each year.
      8. Payment of tax.–– (1) The tax payable under this Act shall be paid.
`

const RULES = `
2. Definitions.- In these rules, the following banks are notified,––
   1. any branch of the State Bank of India; or
   2. any of branches of a corresponding new Bank constituted under the Banking
   3. the State Bank of India (Ghatkopar Branch), Bombay, if his place of work
7. Cancellation of certificate:- The prescribed authority may cancel a certificate.
[1][11. Returns and payment of tax by employers.- (1) Every employer whose liability
was less than Rs. 1,00,000 shall furnish an annual return on or before the 31st of March.
`

const CIRCULAR = `
Subject: Extension of Incentive Framework under National Pension System
1. Kindly refer to the PFRDA Circular No: PFRDA/2025/19/PDES/02 dated 29th October 2025.
2. Reference is invited to point no 3.6 Incentive Framework under NPS, wherein PFRDA
shall provide an incentive of upto Rs.100 per new account on-boarded.
4. This circular is being issued in exercise of the powers conferred under Section 14.
`

describe('titled sections', () => {
  const cl = segment([p(ACT)])
  const tops = cl.filter((c) => !c.parentRef)

  it('finds each section once, in order', () => {
    expect(tops.map((c) => c.ref)).toEqual(['5', '6', '7', '8'])
  })

  it('finds a section whose heading is wrapped in an amendment bracket', () => {
    // "[7. Assessment and collection of tax.--" — the whole section was substituted.
    expect(tops.find((c) => c.ref === '7')?.title).toContain('Assessment')
  })

  it('does not let one section bleed into the next', () => {
    const six = tops.find((c) => c.ref === '6')!
    expect(six.body).toContain('treasury challan')
    expect(six.body).not.toContain('Assessment and collection')
  })

  it('finds sub-clauses including a bracketed one', () => {
    const refs = cl.filter((c) => c.parentRef === '6').map((c) => c.ref)
    expect(refs).toContain('6(1)')
    expect(refs).toContain('6(2)')
    expect(refs).toContain('6(3)')
  })

  it('records the verbatim text, not a paraphrase', () => {
    const c2 = cl.find((c) => c.ref === '6(2)')!
    expect(c2.body).toContain('shall be accompanied by a treasury challan')
  })
})

describe('the numbered-list trap', () => {
  const cl = segment([p(RULES)])
  const tops = cl.filter((c) => !c.parentRef)

  it('does not read the State Bank of India list as clauses', () => {
    expect(cl.some((c) => /State Bank of India/i.test(c.title))).toBe(false)
    expect(tops.map((c) => c.ref)).not.toContain('3')
  })

  it('finds a heading terminated by a colon rather than a full stop', () => {
    expect(tops.find((c) => c.ref === '7')?.title).toContain('Cancellation')
  })

  it('finds a heading behind a footnote and an amendment bracket', () => {
    // "[1][11. Returns and payment of tax by employers.-"
    expect(tops.find((c) => c.ref === '11')?.title).toContain('Returns')
  })
})

describe('untitled numbered paragraphs', () => {
  const cl = segment([p(CIRCULAR)])

  it('falls back to paragraph mode for a circular', () => {
    expect(cl.every((c) => c.method === 'numberedParagraph')).toBe(true)
    expect(cl.map((c) => c.ref)).toEqual(['1', '2', '4'])
  })

  it('says how it segmented, so confidence can reflect it', () => {
    expect(cl[0]!.method).toBe('numberedParagraph')
  })
})

describe('page attribution', () => {
  it('attributes a clause to the page it starts on', () => {
    const cl = segment([p('1. Alpha.- text one\n', 4), p('2. Beta.- text two\n', 5)])
    expect(cl.find((c) => c.ref === '1')?.pageNumber).toBe(4)
    expect(cl.find((c) => c.ref === '2')?.pageNumber).toBe(5)
  })
})
