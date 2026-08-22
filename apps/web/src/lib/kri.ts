// Key Risk Indicators — derivation only.
//
// The band is DERIVED from thresholds and direction, never stored, so an
// indicator cannot read Green while its number sits in the red zone. Direction
// is the whole subtlety: "3 unpatched vulnerabilities" and "97% MFA coverage"
// are both breaches, but one is above its threshold and the other below it.
//
// Breaches reuse the shipped 7/3/1 ladder and the shipped queue. There is no
// second alerting engine here.
import type { KRI, KriBand, QueueTask, RoleKey, Risk, RiskDomain, Severity } from '@/types'
import { WORLD, getRisk } from '@/data'
import { PEOPLE_BY_ID } from '@/data/people'
import { NOW_MS } from '@/lib/time'
import { ladderFor, latestFired, type ReminderEvent } from '@/lib/reminders'

/**
 * Which band a reading falls in.
 *
 *   higher-is-worse: green is a CEILING — v ≤ green is fine, v ≥ red is a breach.
 *   lower-is-worse:  green is a FLOOR   — v ≥ green is fine, v ≤ red is a breach.
 */
export function kriBand(kri: Pick<KRI, 'direction' | 'thresholds'>, value: number): KriBand {
  const { green, amber } = kri.thresholds
  if (kri.direction === 'higher-is-worse') {
    if (value <= green) return 'Green'
    return value <= amber ? 'Amber' : 'Red'
  }
  if (value >= green) return 'Green'
  return value >= amber ? 'Amber' : 'Red'
}

export const currentBand = (k: KRI): KriBand => kriBand(k, k.currentValue)

export const isBreached = (k: KRI): boolean => currentBand(k) !== 'Green'

/** Movement against the previous reading, signed so positive always means the
 *  number went up — the direction tells you whether up is bad. */
export function kriDelta(k: KRI): number {
  const h = k.history
  if (h.length < 2) return 0
  const d = k.currentValue - h[h.length - 2].value
  return Number(d.toFixed(2))
}

/** True when the indicator is moving the wrong way, whichever way that is. */
export function isWorsening(k: KRI): boolean {
  const d = kriDelta(k)
  return k.direction === 'higher-is-worse' ? d > 0 : d < 0
}

/** The threshold the indicator would next cross, for "distance to breach" copy. */
export function nextThreshold(k: KRI): { label: string; value: number } | undefined {
  const b = currentBand(k)
  if (b === 'Red') return undefined
  const target = b === 'Green' ? k.thresholds.green : k.thresholds.amber
  return { label: b === 'Green' ? 'Amber at' : 'Red beyond', value: target }
}

export function formatKriValue(k: KRI, value = k.currentValue): string {
  return k.unit === '%' ? `${value}%` : `${value} ${k.unit}`
}

// ── lookups ──────────────────────────────────────────────────────────────────

export const krisForRisk = (riskId: string, all: KRI[] = WORLD.kris): KRI[] => all.filter((k) => k.riskId === riskId)

export const krisForControl = (controlId: string, all: KRI[] = WORLD.kris): KRI[] =>
  all.filter((k) => k.linkedControls.includes(controlId))

export function kriDomain(k: KRI): RiskDomain | undefined {
  return getRisk(k.riskId)?.domain
}

export interface KriSummary {
  total: number
  green: number
  amber: number
  red: number
  breached: number
  worsening: number
  stale: number
}

/** An indicator is stale when it has not been refreshed within two of its own
 *  measurement periods — an out-of-date KRI is a false assurance, not a green. */
const PERIOD_DAYS: Record<KRI['frequency'], number> = { Daily: 1, Weekly: 7, Fortnightly: 14, Monthly: 30, Quarterly: 91 }

export function isStale(k: KRI): boolean {
  return NOW_MS - new Date(k.lastRefreshed).getTime() > 2 * PERIOD_DAYS[k.frequency] * 86400000
}

export function kriSummary(all: KRI[] = WORLD.kris): KriSummary {
  const s: KriSummary = { total: all.length, green: 0, amber: 0, red: 0, breached: 0, worsening: 0, stale: 0 }
  for (const k of all) {
    const b = currentBand(k)
    if (b === 'Green') s.green++
    else if (b === 'Amber') s.amber++
    else s.red++
    if (b !== 'Green') s.breached++
    if (isWorsening(k)) s.worsening++
    if (isStale(k)) s.stale++
  }
  return s
}

/** Breaches worst-first: red before amber, then by how far past the threshold. */
export function byBreachSeverity(all: KRI[]): KRI[] {
  const rank: Record<KriBand, number> = { Red: 0, Amber: 1, Green: 2 }
  const overshoot = (k: KRI) => {
    const t = k.direction === 'higher-is-worse' ? k.thresholds.green : k.thresholds.green
    const raw = k.direction === 'higher-is-worse' ? k.currentValue - t : t - k.currentValue
    return raw / Math.max(1, Math.abs(t) || 1)
  }
  return [...all].sort((a, b) => rank[currentBand(a)] - rank[currentBand(b)] || overshoot(b) - overshoot(a))
}

/** Domains with at least one breached indicator — the appetite panel's companion. */
export function breachesByDomain(all: KRI[] = WORLD.kris): { domain: RiskDomain; red: number; amber: number }[] {
  const map = new Map<RiskDomain, { red: number; amber: number }>()
  for (const k of all) {
    const d = kriDomain(k)
    if (!d) continue
    const b = currentBand(k)
    if (b === 'Green') continue
    const cur = map.get(d) ?? { red: 0, amber: 0 }
    if (b === 'Red') cur.red++
    else cur.amber++
    map.set(d, cur)
  }
  return [...map.entries()].map(([domain, v]) => ({ domain, ...v })).sort((a, b) => b.red - a.red || b.amber - a.amber)
}

// ── breach follow-up ─────────────────────────────────────────────────────────

/** A breached indicator is chased on its own refresh cadence using the SAME
 *  ladder obligations and remediation actions use. The "due date" is the next
 *  refresh: an indicator in breach must be re-measured, not left to drift. */
export function nextRefreshDue(k: KRI): string {
  return new Date(new Date(k.lastRefreshed).getTime() + PERIOD_DAYS[k.frequency] * 86400000).toISOString()
}

export function kriLadder(k: KRI): ReminderEvent[] {
  if (!isBreached(k)) return []
  const risk = getRisk(k.riskId)
  const checker = risk?.lifecycle.approval.checker ?? 'meera'
  return ladderFor(k.id, nextRefreshDue(k), k.owner, checker)
}

export const kriFollowUp = (k: KRI): ReminderEvent | undefined => latestFired(kriLadder(k))

const severityForBand = (b: KriBand): Severity => (b === 'Red' ? 'Critical' : 'High')

/**
 * Queue items for breached indicators, routed to the owner's persona. Reuses the
 * shipped 'Control re-test' kind — investigating a breached indicator IS a
 * re-measurement — so the closed QueueTask union is left alone.
 */
export function kriQueueItems(role: RoleKey, all: KRI[] = WORLD.kris): QueueTask[] {
  const out: QueueTask[] = []
  for (const k of all) {
    if (!isBreached(k)) continue
    if (PEOPLE_BY_ID[k.owner]?.role !== role) continue
    const b = currentBand(k)
    out.push({
      id: `Q-KRI-${out.length + 1}`,
      role,
      kind: 'Control re-test',
      title: `KRI breach (${b}) — investigate ${k.name} at ${formatKriValue(k)}`,
      ref: k.riskId,
      route: `/risks/${k.riskId}?tab=kris`,
      due: nextRefreshDue(k),
      priority: severityForBand(b),
    })
  }
  return out
}

/** Fired reminder/escalation rows on breached indicators, for the audit log. */
export function kriAuditRows(): { id: string; at: string; actor: string; action: string; object: string; detail: string }[] {
  const rows: { id: string; at: string; actor: string; action: string; object: string; detail: string }[] = []
  let seq = 0
  for (const k of WORLD.kris) {
    for (const e of kriLadder(k)) {
      if (!e.fired) continue
      rows.push({
        id: `LOG-KRI-${String(++seq).padStart(3, '0')}`,
        at: e.at,
        actor: 'system',
        action:
          e.kind === 'reminder'
            ? `${k.id} in ${currentBand(k)} — refresh reminder, ${e.intervalLabel}`
            : `${k.id} breach unresolved — escalated to ${e.targetRole}, ${e.intervalLabel}`,
        object: k.riskId,
        detail: `${k.name} at ${formatKriValue(k)} (${currentBand(k)})`,
      })
    }
  }
  return rows
}

/** Risks carrying a breached indicator — drives the register's breach badge. */
export function risksWithBreach(all: KRI[] = WORLD.kris): Set<string> {
  return new Set(all.filter(isBreached).map((k) => k.riskId))
}

export function worstBandForRisk(riskId: string, all: KRI[] = WORLD.kris): KriBand | undefined {
  const list = krisForRisk(riskId, all)
  if (!list.length) return undefined
  if (list.some((k) => currentBand(k) === 'Red')) return 'Red'
  if (list.some((k) => currentBand(k) === 'Amber')) return 'Amber'
  return 'Green'
}

export type { Risk }
