// Risk appetite — the third view of the standard board-reporting triad, next to
// the heat map and the top-risk list.
//
// Two halves, deliberately separated:
//
//   POLICY      — the board-approved appetite statement and tolerance band per
//                 domain. This is configuration: the board decides how much of
//                 each risk type the firm is willing to carry.
//   MEASUREMENT — the current aggregate, computed live from the register's
//                 residual scores. Never hard-coded, so it cannot drift from
//                 the risks it claims to summarise.
//
// Status is where the two meet, and it is derived, never stored.
import type { Risk, RiskDomain } from '@/types'
import { NOW_MS } from '@/lib/time'

export type AppetiteStatus = 'Within appetite' | 'At tolerance' | 'Outside appetite'

export interface ToleranceBand {
  /** Aggregate at or below this is within appetite. */
  green: number
  /** Aggregate at or below this is at tolerance; above green is the amber band. */
  amber: number
  /** Aggregate at or above this is outside appetite. */
  red: number
}

export interface AppetitePolicy {
  domain: RiskDomain
  appetiteStatement: string
  toleranceBand: ToleranceBand
  linkedObjective: string
}

export interface AppetiteRow extends AppetitePolicy {
  /** Tail-weighted aggregate residual, computed from the live register. */
  currentAggregate: number
  status: AppetiteStatus
  /** Aggregate at each of the last four quarter-ends, oldest first. */
  trend: number[]
  /** Movement against the previous quarter (positive = worsening). */
  qoqDelta: number
  riskCount: number
  /** Risks in this domain whose own residual sits in the red band. */
  breachCount: number
}

// ── POLICY (board-approved) ──────────────────────────────────────────────────
// Bands are on the 1-25 residual scale. Cyber carries the tightest appetite —
// a subscriber-data loss is not a recoverable event for a pension fund — then
// compliance, then the operational and investment domains.
export const APPETITE_POLICY: AppetitePolicy[] = [
  {
    domain: 'Cyber',
    appetiteStatement: 'No tolerance for incidents causing subscriber-data loss.',
    toleranceBand: { green: 8, amber: 14, red: 15 },
    linkedObjective: 'Protect subscriber trust and data',
  },
  {
    domain: 'Compliance',
    appetiteStatement: 'No appetite for a reportable regulatory breach or a missed statutory filing.',
    toleranceBand: { green: 9, amber: 15, red: 16 },
    linkedObjective: 'Remain a Category I regulated entity in good standing',
  },
  {
    domain: 'IT',
    appetiteStatement: 'Limited appetite for availability loss on subscriber-facing and fund-accounting systems.',
    toleranceBand: { green: 11, amber: 16, red: 17 },
    linkedObjective: 'Keep subscriber services continuously available',
  },
  {
    domain: 'Operational',
    appetiteStatement: 'Low appetite for processing error affecting a subscriber record or contribution.',
    toleranceBand: { green: 12, amber: 18, red: 19 },
    linkedObjective: 'Process every contribution accurately and on time',
  },
  {
    domain: 'Investment',
    appetiteStatement: 'No appetite for breach of scheme mandate or PFRDA exposure limits; measured appetite for market risk within mandate.',
    toleranceBand: { green: 12, amber: 18, red: 19 },
    linkedObjective: 'Deliver mandate-compliant returns across Scheme E, C, G and A',
  },
  {
    domain: 'ThirdParty',
    appetiteStatement: 'Limited appetite for dependency on a single provider without an exit path.',
    toleranceBand: { green: 10, amber: 16, red: 17 },
    linkedObjective: 'Keep critical outsourcing substitutable',
  },
]

export const DOMAIN_LABEL = (d: RiskDomain) => (d === 'ThirdParty' ? 'Third-party' : d)

// ── MEASUREMENT ──────────────────────────────────────────────────────────────

/** The share of a domain's risks that make up its tail. A board reads exposure
 *  from the worst cases, not the average — averaging lets a long tail of trivial
 *  risks mask a handful of severe ones. */
const TAIL_SHARE = 0.2
const TAIL_MIN = 3

/**
 * Tail-weighted aggregate residual for a set of risks: the mean residual of the
 * worst fifth (minimum three). Reported on the same 1-25 scale as an individual
 * residual, so it can be compared directly against the tolerance band.
 */
export function aggregateResidual(residuals: number[]): number {
  if (residuals.length === 0) return 0
  const sorted = [...residuals].sort((a, b) => b - a)
  const n = Math.min(sorted.length, Math.max(TAIL_MIN, Math.round(sorted.length * TAIL_SHARE)))
  const tail = sorted.slice(0, n)
  return Math.round((tail.reduce((s, x) => s + x, 0) / tail.length) * 10) / 10
}

/**
 * What a risk's residual was at a past instant, reconstructed from its own
 * remediation record: every action completed AFTER that instant had not yet
 * banked its reduction, so add those contributions back. Capped at inherent —
 * a residual never exceeded the inherent score.
 *
 * This is why the trend is real rather than seeded: it is the register's own
 * history of completed actions, read backwards.
 */
export function residualAt(risk: Risk, atMs: number): number {
  const notYetBanked = risk.lifecycle.treatment.actions
    .filter((a) => {
      if (a.status !== 'Done') return false
      const done = new Date(a.dueDate).getTime()
      // Landed after the instant we are asking about, but on or before now — a
      // completion dated in the future has not banked anything yet, so counting
      // it would make the CURRENT aggregate read higher than the live residual.
      return done > atMs && done <= NOW_MS
    })
    .reduce((s, a) => s + a.residualContribution, 0)
  return Math.min(risk.inherent, risk.residual + notYetBanked)
}

/** Quarter-end timestamps for the last `count` quarters, oldest first; the final
 *  entry is "now" so the last trend point is the live aggregate. */
export function quarterEnds(count = 4): number[] {
  const out: number[] = []
  const now = new Date(NOW_MS)
  for (let i = count - 1; i >= 1; i--) {
    // Start of the quarter i quarters back.
    const q = Math.floor(now.getMonth() / 3) - i
    const d = new Date(now.getFullYear(), (q + 1) * 3, 0) // last day of that quarter
    out.push(d.getTime())
  }
  out.push(NOW_MS)
  return out
}

export function statusFor(aggregate: number, band: ToleranceBand): AppetiteStatus {
  if (aggregate >= band.red) return 'Outside appetite'
  if (aggregate > band.green) return 'At tolerance'
  return 'Within appetite'
}

/** One row per domain: board policy on the left, live measurement on the right. */
export function appetiteRows(risks: Risk[]): AppetiteRow[] {
  const ends = quarterEnds(4)
  return APPETITE_POLICY.map((policy) => {
    const inDomain = risks.filter((r) => r.domain === policy.domain)
    const trend = ends.map((t) => aggregateResidual(inDomain.map((r) => residualAt(r, t))))
    const currentAggregate = trend[trend.length - 1]
    const previous = trend[trend.length - 2] ?? currentAggregate
    return {
      ...policy,
      currentAggregate,
      status: statusFor(currentAggregate, policy.toleranceBand),
      trend,
      qoqDelta: Math.round((currentAggregate - previous) * 10) / 10,
      riskCount: inDomain.length,
      breachCount: inDomain.filter((r) => r.residual >= policy.toleranceBand.red).length,
    }
  })
}

/** Exception-first ordering: outside appetite first, then at tolerance, each by
 *  how far past its band it sits. */
export function byExposure(rows: AppetiteRow[]): AppetiteRow[] {
  const rank: Record<AppetiteStatus, number> = { 'Outside appetite': 0, 'At tolerance': 1, 'Within appetite': 2 }
  return [...rows].sort((a, b) => rank[a.status] - rank[b.status] || b.currentAggregate - a.currentAggregate)
}

export function appetiteSummary(rows: AppetiteRow[]) {
  return {
    outside: rows.filter((r) => r.status === 'Outside appetite').length,
    atTolerance: rows.filter((r) => r.status === 'At tolerance').length,
    within: rows.filter((r) => r.status === 'Within appetite').length,
    breaches: rows.reduce((s, r) => s + r.breachCount, 0),
  }
}
