import { useApp } from '@/store'
import { WORLD, METRICS, getIssue } from '@/data'
import type { Obligation, Control, Issue, Incident } from '@/types'
import { effectiveObligation, effectiveControl, effectiveIncident, effectiveIssue, effectiveFinding } from './effective'

/**
 * Headline metrics recomputed from effective (seed + override) state, so a session
 * action visibly moves the cockpit numbers (Req 14). Baseline-plus-delta by design:
 * only the measures an in-scope action can move are recomputed; board aggregates
 * that no action touches (enterprise risk, AUM, subscribers, reg-update count) stay
 * frozen. With zero overrides this returns numbers identical to the seed METRICS -
 * that equivalence is the regression guard.
 */
export interface EffectiveMetrics {
  enterpriseRisk: number
  enterpriseRiskTrend: 'up' | 'down' | 'flat'
  controlCoverage: number
  ccmAutomated: number
  openIncidents: number
  criticalOpen: number
  overdueObligations: number
  dueSoonObligations: number
  openFindings: number
  failingControls: number
  avgRemediationDays: number
  avgFindingAgeDays: number
  oldestFindingDays: number
  aumCrore: number
  subscribers: number
  regUpdates2025: number
}

export function effectiveMetrics(maps: {
  obligationOverrides: Record<string, Partial<Obligation>>
  controlOverrides: Record<string, Partial<Control>>
  issueOverrides: Record<string, Partial<Issue>>
  incidentOverrides: Record<string, Partial<Incident>>
  sessionObligations: Obligation[]
}): EffectiveMetrics {
  // Controls: recompute over the canonical population (WORLD.controls, the seed
  // METRICS denominator) so coverage stays exactly 96.2% when nothing changed.
  const controls = WORLD.controls.map((c) => effectiveControl(c, maps.controlOverrides[c.id]))
  const passOrPartial = controls.filter((c) => c.result !== 'Fail').length
  const controlCoverage = (passOrPartial / controls.length) * 100
  const ccmAutomated = controls.filter((c) => c.automation === 'CCM').length

  // Obligations: include session-scheduled recurring instances.
  const obligations = [
    ...WORLD.obligations.map((o) => effectiveObligation(o, maps.obligationOverrides[o.id])),
    ...maps.sessionObligations,
  ]
  const overdueObligations = obligations.filter((o) => o.status === 'Overdue').length
  const dueSoonObligations = obligations.filter((o) => o.status === 'Due').length

  // Incidents.
  const openIncidents = WORLD.incidents
    .map((i) => effectiveIncident(i, maps.incidentOverrides[i.id]))
    .filter((i) => i.status !== 'Closed')
  const criticalOpen = openIncidents.filter((i) => i.classification === 'Critical').length

  // Open findings: counted straight off the effective findings (a finding reads
  // Closed once its 1:1 remediation issue is Resolved). Single source of truth, so
  // it can never disagree with the audit screens, and resolving an audit-finding
  // issue that is NOT linked to an open finding correctly leaves it unchanged. With
  // zero overrides the seed is internally consistent, so this equals METRICS (27).
  const openFindings = WORLD.audits
    .flatMap((a) => a.findings)
    .filter((f) => effectiveFinding(f, maps.issueOverrides).status !== 'Closed').length

  const failingControls = controls.filter((c) => c.result === 'Fail').length

  // Inspection-readiness ageing (Req 14). Time-to-remediate is read as the mean
  // age of issues still open; findings age as the mean age of the remediation
  // issues behind findings still open. Resolving issues retires the oldest open
  // work, so both numbers improve as the session acts — and equal the seed at rest.
  const openIssues = WORLD.issues
    .map((i) => effectiveIssue(i, maps.issueOverrides[i.id]))
    .filter((i) => i.status !== 'Resolved')
  const avgRemediationDays = mean(openIssues.map((i) => i.ageDays))

  const openFindingIssueAges = WORLD.audits
    .flatMap((a) => a.findings)
    .filter((f) => f.linkedIssue && effectiveFinding(f, maps.issueOverrides).status !== 'Closed')
    .map((f) => getIssue(f.linkedIssue!)?.ageDays)
    .filter((n): n is number => typeof n === 'number')
  const avgFindingAgeDays = mean(openFindingIssueAges)
  const oldestFindingDays = openFindingIssueAges.length ? Math.max(...openFindingIssueAges) : 0

  return {
    enterpriseRisk: METRICS.enterpriseRisk,
    enterpriseRiskTrend: METRICS.enterpriseRiskTrend,
    controlCoverage,
    ccmAutomated,
    openIncidents: openIncidents.length,
    criticalOpen,
    overdueObligations,
    dueSoonObligations,
    openFindings,
    failingControls,
    avgRemediationDays,
    avgFindingAgeDays,
    oldestFindingDays,
    aumCrore: METRICS.aumCrore,
    subscribers: METRICS.subscribers,
    regUpdates2025: METRICS.regUpdates2025,
  }
}

/** Mean of a numeric list, rounded to one decimal; 0 for an empty list. */
function mean(xs: number[]): number {
  if (!xs.length) return 0
  return Math.round((xs.reduce((s, x) => s + x, 0) / xs.length) * 10) / 10
}

/** Reactive effective metrics for cockpit / strips. */
export function useEffectiveMetrics(): EffectiveMetrics {
  const obligationOverrides = useApp((s) => s.obligationOverrides)
  const controlOverrides = useApp((s) => s.controlOverrides)
  const issueOverrides = useApp((s) => s.issueOverrides)
  const incidentOverrides = useApp((s) => s.incidentOverrides)
  const sessionObligations = useApp((s) => s.sessionObligations)
  return effectiveMetrics({ obligationOverrides, controlOverrides, issueOverrides, incidentOverrides, sessionObligations })
}
