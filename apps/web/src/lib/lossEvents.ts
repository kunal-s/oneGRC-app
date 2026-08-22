// Operational-risk loss events — derivation and roll-up.
//
// Net loss is DERIVED everywhere (gross − recovery); it is never stored on the
// record and never entered by hand, so the incident list, the detail block and
// any period roll-up cannot disagree.
import type { Incident, LossEvent, LossEventCategory } from '@/types'
import { inGroup } from '@/lib/format'
import { NOW_MS } from '@/lib/time'

export const LOSS_CATEGORIES: LossEventCategory[] = [
  'Internal fraud',
  'External fraud',
  'Employment practices & workplace safety',
  'Clients, products & business practices',
  'Damage to physical assets',
  'Business disruption & system failures',
  'Execution, delivery & process management',
]

/** gross − recovery, floored at zero (a recovery cannot become a gain). */
export function netLoss(le: LossEvent): number {
  return Math.max(0, le.grossLoss - le.recovery)
}

/** True when the incident carries a recognised loss. */
export function isLossEvent(inc: Incident): boolean {
  return !!inc.lossEvent?.isLossEvent
}

/** ₹ in the Indian convention, scaled to the unit a risk function reads:
 *  4200000 → "₹42.00 lakh"; 324718000 → "₹32.47 cr". */
export function inr(n: number): string {
  if (n === 0) return '₹0'
  if (Math.abs(n) >= 1_00_00_000) return `₹${(n / 1_00_00_000).toFixed(2)} cr`
  if (Math.abs(n) >= 1_00_000) return `₹${(n / 1_00_000).toFixed(2)} lakh`
  return `₹${inGroup(n)}`
}

/** Exact rupees, for the record itself rather than a summary tile. */
export function inrExact(n: number): string {
  return `₹${inGroup(n)}`
}

export interface LossTotals {
  count: number
  gross: number
  recovery: number
  net: number
}

/** Roll up the loss events among a set of incidents, optionally limited to
 *  those recognised within the last `days`. */
export function lossTotals(incidents: Incident[], days?: number): LossTotals {
  const cutoff = days ? NOW_MS - days * 86400000 : undefined
  let count = 0
  let gross = 0
  let recovery = 0
  for (const inc of incidents) {
    const le = inc.lossEvent
    if (!le?.isLossEvent) continue
    if (cutoff && le.recognisedOn && new Date(le.recognisedOn).getTime() < cutoff) continue
    count++
    gross += le.grossLoss
    recovery += le.recovery
  }
  return { count, gross, recovery, net: Math.max(0, gross - recovery) }
}

/** Net loss per calendar month over the trailing `months`, oldest first —
 *  the series behind a net-loss trend. Defaults to 6 months, which is the span
 *  the incident log actually covers; a longer window would render empty columns. */
export function netLossTrend(incidents: Incident[], months = 6): { period: string; net: number }[] {
  const now = new Date(NOW_MS)
  const buckets: { period: string; key: string; net: number }[] = []
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    buckets.push({
      period: d.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' }),
      key: `${d.getFullYear()}-${d.getMonth()}`,
      net: 0,
    })
  }
  const byKey = new Map(buckets.map((b) => [b.key, b]))
  for (const inc of incidents) {
    const le = inc.lossEvent
    if (!le?.isLossEvent || !le.recognisedOn) continue
    const d = new Date(le.recognisedOn)
    const b = byKey.get(`${d.getFullYear()}-${d.getMonth()}`)
    if (b) b.net += netLoss(le)
  }
  return buckets.map(({ period, net }) => ({ period, net }))
}

/** Net loss by event category, largest first — the distribution a risk
 *  committee reads alongside the trend. */
export function lossByCategory(incidents: Incident[]): { category: LossEventCategory; net: number; count: number }[] {
  const map = new Map<LossEventCategory, { net: number; count: number }>()
  for (const inc of incidents) {
    const le = inc.lossEvent
    if (!le?.isLossEvent) continue
    const cur = map.get(le.category) ?? { net: 0, count: 0 }
    cur.net += netLoss(le)
    cur.count++
    map.set(le.category, cur)
  }
  return [...map.entries()]
    .map(([category, v]) => ({ category, ...v }))
    .sort((a, b) => b.net - a.net)
}
