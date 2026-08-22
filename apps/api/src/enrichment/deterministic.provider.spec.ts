import { describe, expect, it } from 'vitest'
import { DeterministicEnrichmentProvider } from './deterministic.provider'

const p = new DeterministicEnrichmentProvider()

const S6_1 =
  'Every employer registered under this Act shall furnish to the prescribed authority ' +
  '5[a return in such form, for such period and by such dates as may be prescribed].'
const S6_2 =
  'Every such return shall be accompanied by a treasury challan in proof to payment of ' +
  'full amount of tax due according to the return.'
const PERMISSION =
  'the Commissioner may, subject to such terms and conditions, permit any employer to ' +
  'furnish a consolidated return.'

describe('deterministic enrichment', () => {
  it('reads a duty as a duty', async () => {
    expect((await p.enrich({ clauseRef: '6(1)', text: S6_1 })).disposition).toBe('duty')
  })

  it('reads a permission as a discretion, not a duty', async () => {
    expect((await p.enrich({ clauseRef: 'x', text: PERMISSION })).disposition).toBe('discretion')
  })

  it('rates a clean duty clearer than one whose cadence is deferred', async () => {
    const clean = await p.enrich({ clauseRef: '6(2)', text: S6_2 })
    const deferred = await p.enrich({ clauseRef: '6(1)', text: S6_1 })
    expect(clean.clarity).toBeGreaterThan(deferred.clarity)
    expect(clean.concerns).toHaveLength(0)
  })

  it('refuses to invent a summary it cannot produce', async () => {
    // A wrong plain-language summary of a legal duty is worse than none.
    expect((await p.enrich({ clauseRef: '6(1)', text: S6_1 })).summary).toBe('')
  })

  it('labels its own output so nothing reads as fact', async () => {
    const e = await p.enrich({ clauseRef: '6(1)', text: S6_1 })
    expect(e.provider).toBe('deterministic')
    expect(e.providerVersion).toMatch(/^\d+\.\d+\.\d+$/)
  })

  it('lowers clarity further when the source is a scan', async () => {
    const good = await p.enrich({ clauseRef: '6(1)', text: S6_1, confidence: 0.99 })
    const scan = await p.enrich({ clauseRef: '6(1)', text: S6_1, confidence: 0.7 })
    expect(scan.clarity).toBeLessThan(good.clarity)
  })
})
