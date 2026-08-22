// The Key Risk Indicator library.
//
// Indicators are drawn from the standard operational-risk / cyber KRI sets a
// regulated financial institution is expected to run, narrowed to what a PFRDA
// pension fund manager actually measures: contribution reconciliation, NAV
// integrity, mandate and exposure limits, subscriber grievances, the CERT-In
// patch window, and the outsourcing dependencies that carry the CRA.
//
// Every indicator carries the four things that make one usable — a clear metric,
// a threshold that triggers escalation, a named owner and a measurement
// frequency — plus the control whose effectiveness it measures, so a breach
// points at something that can be fixed.
//
// Thresholds read against `direction`:
//   higher-is-worse → green < amber < red   (green is a ceiling)
//   lower-is-worse  → green > amber > red   (green is a floor)
import type { Control, KRI, KriReading, Risk, RiskDomain } from '@/types'
import { Rand } from './rng'
import { NOW_MS } from '@/lib/time'

const iso = (d: Date) => d.toISOString()

interface KriDef {
  key: string
  domain: RiskDomain
  name: string
  source: KRI['metricSource']
  unit: string
  direction: KRI['direction']
  thresholds: { green: number; amber: number; red: number }
  current: number
  frequency: KRI['frequency']
  owner: string
  /** Substring matched against control titles to bind the indicator to controls. */
  controlHints: string[]
  rationale: string
  /** Approximate first reading, so the six-point history has a real slope. */
  from: number
}

// 27 indicators across all six domains. Currents are set so the register shows a
// credible spread — several amber, three red — rather than everything green.
const DEFS: KriDef[] = [
  // ── Cyber ──────────────────────────────────────────────────────────────────
  { key: 'CYB-01', domain: 'Cyber', name: 'Critical vulnerabilities open beyond the 14-day patch window', source: 'Qualys VM', unit: 'findings', direction: 'higher-is-worse', thresholds: { green: 0, amber: 3, red: 4 }, current: 3, frequency: 'Weekly', owner: 'karthik', controlHints: ['patch', 'vulnerab'], rationale: 'CERT-In and the PFRDA cyber guidelines both expect critical fixes inside a defined window; anything past it is an accepted exposure by default.', from: 6 },
  { key: 'CYB-02', domain: 'Cyber', name: 'Mean time to detect (MTTD)', source: 'Splunk SIEM', unit: 'hours', direction: 'higher-is-worse', thresholds: { green: 2, amber: 6, red: 7 }, current: 1.6, frequency: 'Monthly', owner: 'neha', controlHints: ['monitor', 'logging', 'detect'], rationale: 'The CERT-In six-hour reporting clock starts at detection, so detection latency consumes the reporting window directly.', from: 3.8 },
  { key: 'CYB-03', domain: 'Cyber', name: 'Mean time to respond (MTTR)', source: 'CrowdStrike EDR', unit: 'hours', direction: 'higher-is-worse', thresholds: { green: 4, amber: 12, red: 13 }, current: 3.4, frequency: 'Monthly', owner: 'karthik', controlHints: ['incident', 'response'], rationale: 'Containment time drives the size of a loss event and whether subscriber data is reached.', from: 8.2 },
  { key: 'CYB-04', domain: 'Cyber', name: 'Phishing simulation click rate', source: 'Manual', unit: '%', direction: 'higher-is-worse', thresholds: { green: 3, amber: 8, red: 9 }, current: 11.4, frequency: 'Quarterly', owner: 'rajesh', controlHints: ['awareness', 'training', 'phishing'], rationale: 'Credential theft through phishing is the entry vector behind most incidents on the register.', from: 18.2 },
  { key: 'CYB-05', domain: 'Cyber', name: 'MFA coverage on privileged accounts', source: 'Okta/AD', unit: '%', direction: 'lower-is-worse', thresholds: { green: 99, amber: 96, red: 95 }, current: 99.4, frequency: 'Weekly', owner: 'rohan', controlHints: ['authentication', 'access', 'MFA'], rationale: 'A privileged account without MFA is a single stolen credential away from the fund-accounting estate.', from: 96.8 },

  // ── IT ─────────────────────────────────────────────────────────────────────
  { key: 'IT-01', domain: 'IT', name: 'Subscriber-facing service availability', source: 'Sankalp ServiceDesk', unit: '%', direction: 'lower-is-worse', thresholds: { green: 99.5, amber: 99, red: 98.9 }, current: 99.62, frequency: 'Monthly', owner: 'rohan', controlHints: ['availability', 'continuity', 'backup'], rationale: 'Subscribers cannot transact when the portal is down, and sustained loss becomes a PFRDA service issue.', from: 99.11 },
  { key: 'IT-02', domain: 'IT', name: 'Change failure rate', source: 'Sankalp ServiceDesk', unit: '%', direction: 'higher-is-worse', thresholds: { green: 2, amber: 5, red: 6 }, current: 1.7, frequency: 'Monthly', owner: 'rohan', controlHints: ['change management', 'change'], rationale: 'Failed changes are the largest single source of unplanned downtime on the estate.', from: 4.6 },
  { key: 'IT-03', domain: 'IT', name: 'Privileged accounts not recertified within the cycle', source: 'Okta/AD', unit: 'accounts', direction: 'higher-is-worse', thresholds: { green: 0, amber: 5, red: 6 }, current: 7, frequency: 'Quarterly', owner: 'karthik', controlHints: ['recertif', 'privileged', 'access'], rationale: 'The last IS audit raised this; uncertified privileged access is standing unreviewed authority.', from: 12 },
  { key: 'IT-04', domain: 'IT', name: 'Backup restoration tests failed', source: 'CCM', unit: 'tests', direction: 'higher-is-worse', thresholds: { green: 0, amber: 1, red: 2 }, current: 0, frequency: 'Monthly', owner: 'rohan', controlHints: ['backup', 'restor'], rationale: 'A backup that has not been restored is an assumption, and the ransomware incident tested exactly this.', from: 2 },
  { key: 'IT-05', domain: 'IT', name: 'Endpoint EDR coverage', source: 'CrowdStrike EDR', unit: '%', direction: 'lower-is-worse', thresholds: { green: 99, amber: 97, red: 96.9 }, current: 99.3, frequency: 'Weekly', owner: 'neha', controlHints: ['endpoint', 'malware', 'EDR'], rationale: 'Uncovered endpoints are the blind spot an intrusion runs through undetected.', from: 97.2 },

  // ── Operational ────────────────────────────────────────────────────────────
  { key: 'OPS-01', domain: 'Operational', name: 'Unreconciled contribution records at T+1', source: 'NPS Trust / CRA', unit: 'records', direction: 'higher-is-worse', thresholds: { green: 50, amber: 199, red: 200 }, current: 143, frequency: 'Fortnightly', owner: 'rohan', controlHints: ['reconcil', 'contribution'], rationale: 'An unreconciled contribution is a subscriber whose record of contribution is wrong until it clears.', from: 61 },
  { key: 'OPS-02', domain: 'Operational', name: 'NAV computation errors requiring restatement', source: 'Fund Accounting', unit: 'errors', direction: 'higher-is-worse', thresholds: { green: 0, amber: 1, red: 2 }, current: 1, frequency: 'Monthly', owner: 'sanjay', controlHints: ['NAV', 'valuation', 'maker-checker'], rationale: 'A restated NAV is a direct subscriber-outcome event and a reportable operational incident.', from: 2 },
  { key: 'OPS-03', domain: 'Operational', name: 'Settlement failures at the custodian', source: 'Fund Accounting', unit: 'trades', direction: 'higher-is-worse', thresholds: { green: 2, amber: 8, red: 9 }, current: 2, frequency: 'Weekly', owner: 'sanjay', controlHints: ['settlement', 'custodian', 'reconcil'], rationale: 'Settlement fails carry cost and are the leading indicator of a data break upstream.', from: 7 },
  { key: 'OPS-04', domain: 'Operational', name: 'Subscriber grievances open beyond 30 days', source: 'Sankalp ServiceDesk', unit: 'cases', direction: 'higher-is-worse', thresholds: { green: 5, amber: 20, red: 21 }, current: 24, frequency: 'Monthly', owner: 'rohan', controlHints: ['grievance', 'subscriber', 'complaint'], rationale: 'Ageing grievances are what PFRDA inspects first and the clearest signal of a process that is not coping.', from: 14 },
  { key: 'OPS-05', domain: 'Operational', name: 'Journal entries posted without second approval', source: 'Fund Accounting', unit: 'entries', direction: 'higher-is-worse', thresholds: { green: 0, amber: 2, red: 3 }, current: 0, frequency: 'Monthly', owner: 'deepa', controlHints: ['maker-checker', 'segregation', 'financial'], rationale: 'Maker-checker on financial postings is the control the whole segregation-of-duties story rests on.', from: 3 },
  { key: 'OPS-06', domain: 'Operational', name: 'Operations staff turnover, trailing 12 months', source: 'Manual', unit: '%', direction: 'higher-is-worse', thresholds: { green: 12, amber: 18, red: 19 }, current: 11.4, frequency: 'Quarterly', owner: 'farhan', controlHints: ['training', 'competen', 'resourc'], rationale: 'Turnover in operations erodes the process knowledge that keeps reconciliation clean.', from: 13.9 },

  // ── Investment ─────────────────────────────────────────────────────────────
  { key: 'INV-01', domain: 'Investment', name: 'PFRDA exposure-limit breaches', source: 'Fund Accounting', unit: 'breaches', direction: 'higher-is-worse', thresholds: { green: 0, amber: 1, red: 2 }, current: 1, frequency: 'Daily', owner: 'arvind', controlHints: ['exposure', 'limit', 'investment'], rationale: 'An exposure breach is a direct regulatory contravention, not an internal preference.', from: 3 },
  { key: 'INV-02', domain: 'Investment', name: 'Scheme mandate breaches detected pre-trade', source: 'Fund Accounting', unit: 'orders', direction: 'higher-is-worse', thresholds: { green: 3, amber: 10, red: 11 }, current: 2, frequency: 'Weekly', owner: 'arvind', controlHints: ['mandate', 'pre-trade', 'investment'], rationale: 'Blocked pre-trade is the control working; a rising count means the front end is drifting from mandate.', from: 8 },
  { key: 'INV-03', domain: 'Investment', name: 'Single-issuer concentration, Scheme E', source: 'Fund Accounting', unit: '%', direction: 'higher-is-worse', thresholds: { green: 5, amber: 8, red: 9 }, current: 4.6, frequency: 'Monthly', owner: 'sanjay', controlHints: ['concentration', 'exposure', 'issuer'], rationale: 'Concentration is the exposure that turns a single issuer event into a scheme-level loss.', from: 6.9 },
  { key: 'INV-04', domain: 'Investment', name: 'Active-holdings research reviews overdue', source: 'CCM', unit: 'holdings', direction: 'higher-is-worse', thresholds: { green: 0, amber: 4, red: 5 }, current: 4, frequency: 'Fortnightly', owner: 'arvind', controlHints: ['research', 'review', 'holding'], rationale: 'The board-approved research policy requires a review per cycle; an overdue review is an unevidenced holding.', from: 8 },

  // ── Compliance ─────────────────────────────────────────────────────────────
  { key: 'CMP-01', domain: 'Compliance', name: 'Statutory filings overdue', source: 'CCM', unit: 'filings', direction: 'higher-is-worse', thresholds: { green: 0, amber: 4, red: 5 }, current: 9, frequency: 'Weekly', owner: 'anjali', controlHints: ['filing', 'return', 'statutory'], rationale: 'Every overdue filing carries a per-day penalty and is the first thing an inspection asks for.', from: 6 },
  { key: 'CMP-02', domain: 'Compliance', name: 'Regulatory findings open', source: 'Manual', unit: 'findings', direction: 'higher-is-worse', thresholds: { green: 0, amber: 2, red: 3 }, current: 0, frequency: 'Monthly', owner: 'anjali', controlHints: ['regulator', 'inspection', 'finding'], rationale: 'An open regulatory finding is a supervisory position on the firm, not an internal opinion.', from: 2 },
  { key: 'CMP-03', domain: 'Compliance', name: 'Active control exceptions', source: 'CCM', unit: 'exceptions', direction: 'higher-is-worse', thresholds: { green: 5, amber: 12, red: 13 }, current: 8, frequency: 'Monthly', owner: 'anjali', controlHints: ['exception', 'deviation', 'policy'], rationale: 'Exceptions are approved deviations; a growing stock of them is control erosion by consent.', from: 5 },
  { key: 'CMP-04', domain: 'Compliance', name: 'Mandatory compliance training completion', source: 'Manual', unit: '%', direction: 'lower-is-worse', thresholds: { green: 98, amber: 92, red: 91.9 }, current: 98.6, frequency: 'Quarterly', owner: 'farhan', controlHints: ['training', 'awareness', 'code of conduct'], rationale: 'Training completion is the evidence that a policy was communicated, which is what the regulator tests.', from: 91.4 },

  // ── Third party ────────────────────────────────────────────────────────────
  { key: 'TPR-01', domain: 'ThirdParty', name: 'Critical vendor SLA breaches', source: 'Manual', unit: 'breaches', direction: 'higher-is-worse', thresholds: { green: 0, amber: 2, red: 3 }, current: 2, frequency: 'Monthly', owner: 'imran', controlHints: ['vendor', 'third-party', 'outsourc'], rationale: 'The CRA and custodian sit on the critical path to every subscriber transaction.', from: 1 },
  { key: 'TPR-02', domain: 'ThirdParty', name: 'AUM dependent on a single cloud region', source: 'Manual', unit: '%', direction: 'higher-is-worse', thresholds: { green: 40, amber: 70, red: 71 }, current: 78, frequency: 'Quarterly', owner: 'imran', controlHints: ['concentration', 'cloud', 'continuity'], rationale: 'Fourth-party concentration: a region-level outage would take the estate down regardless of vendor count.', from: 74 },
  { key: 'TPR-03', domain: 'ThirdParty', name: 'Vendor due-diligence reviews overdue', source: 'Manual', unit: 'vendors', direction: 'higher-is-worse', thresholds: { green: 0, amber: 3, red: 4 }, current: 0, frequency: 'Quarterly', owner: 'imran', controlHints: ['vendor', 'due diligence', 'third-party'], rationale: 'An outsourcing arrangement without current diligence is an unassessed dependency.', from: 4 },
]

const PERIOD_LABEL: Record<KRI['frequency'], (i: number, total: number) => string> = {
  Daily: (i, t) => `D-${t - i}`,
  Weekly: (i, t) => `W-${t - i}`,
  Fortnightly: (i, t) => `F-${t - i}`,
  Monthly: (i, t) => `M-${t - i}`,
  Quarterly: (i, t) => `Q-${t - i}`,
}

const STEP_DAYS: Record<KRI['frequency'], number> = { Daily: 1, Weekly: 7, Fortnightly: 14, Monthly: 30, Quarterly: 91 }

/**
 * Six readings ending at the current value, interpolated from `from` with a
 * small deterministic wobble — so a sparkline shows a real trajectory rather
 * than a straight line, and the last point always equals `currentValue`.
 */
function buildHistory(def: KriDef, r: Rand): KriReading[] {
  const points = 6
  const step = STEP_DAYS[def.frequency]
  const decimals = def.unit === '%' && def.thresholds.green % 1 !== 0 ? 2 : Number.isInteger(def.current) ? 0 : 1
  const out: KriReading[] = []
  for (let i = 0; i < points; i++) {
    const t = i / (points - 1)
    const linear = def.from + (def.current - def.from) * t
    // No wobble on the final point: it must equal the reported current value.
    const wobble = i === points - 1 ? 0 : (r.int(-6, 6) / 100) * Math.abs(def.from - def.current || def.current * 0.08)
    const raw = Math.max(0, linear + wobble)
    out.push({
      period: PERIOD_LABEL[def.frequency](i, points - 1),
      value: Number(raw.toFixed(decimals)),
      at: iso(new Date(NOW_MS - (points - 1 - i) * step * 86400000)),
    })
  }
  return out
}

/** Bind an indicator to the controls whose effectiveness it measures. */
function controlsFor(def: KriDef, controls: Control[]): string[] {
  const hits = controls.filter((c) => def.controlHints.some((h) => c.title.toLowerCase().includes(h.toLowerCase())))
  return hits.slice(0, 3).map((c) => c.id)
}

/** Attach each indicator to the highest-residual risk in its domain that does
 *  not already carry one, so KRIs spread across the register rather than piling
 *  onto a single record. */
export function buildKris(risks: Risk[], controls: Control[]): KRI[] {
  const r = new Rand(7007)
  const out: KRI[] = []
  const usedByDomain = new Map<RiskDomain, number>()

  for (const def of DEFS) {
    const pool = risks
      .filter((x) => x.domain === def.domain)
      .sort((a, b) => b.residual - a.residual)
    const idx = usedByDomain.get(def.domain) ?? 0
    const risk = pool[idx % Math.max(1, pool.length)]
    usedByDomain.set(def.domain, idx + 1)
    if (!risk) continue

    out.push({
      id: `KRI-${def.key}`,
      riskId: risk.id,
      name: def.name,
      metricSource: def.source,
      unit: def.unit,
      direction: def.direction,
      thresholds: def.thresholds,
      currentValue: def.current,
      history: buildHistory(def, r),
      owner: def.owner,
      lastRefreshed: iso(new Date(NOW_MS - r.int(1, 96) * 3600000)),
      frequency: def.frequency,
      linkedControls: controlsFor(def, controls),
      rationale: def.rationale,
    })
  }
  return out
}
