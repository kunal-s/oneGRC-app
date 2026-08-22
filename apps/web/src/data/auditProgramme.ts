// The audit programme — the planning layer above audits, and the execution layer
// beneath them.
//
// PLAN: an annual risk-based plan whose cadence follows what a PFRDA-regulated
// entity is actually held to — an external CERT-In-empanelled IS audit at least
// annually, internal security audits half-yearly, vulnerability assessment
// half-yearly and penetration testing annually on critical assets — with the
// remaining entities scheduled by the residual risk they carry.
//
// PAPERS: one row per test step. A finding is raised FROM a failed paper, never
// beside one, so every finding has a documented test behind it.
import type { Audit, AuditPlanEntry, Control, Evidence, Risk, RiskDomain, WorkingPaper } from '@/types'
import { Rand } from './rng'
import { NOW_MS } from '@/lib/time'
import { aggregateResidual } from '@/lib/appetite'

const iso = (d: Date) => d.toISOString()

// ── Plan ─────────────────────────────────────────────────────────────────────

interface PlanDef {
  entity: string
  domains: RiskDomain[]
  quarter: AuditPlanEntry['plannedQuarter']
  auditor: string
  type: Audit['type']
  cadence?: string
  /** Months since the entity was last audited; absent = never audited. */
  lastMonths?: number
}

const PLAN_DEFS: PlanDef[] = [
  // Regulator-driven cadence.
  { entity: 'Annual information-systems audit (whole estate)', domains: ['Cyber', 'IT'], quarter: 'Q1', auditor: 'SecureLayer (CERT-In empanelled)', type: 'IS audit (CERT-In empanelled)', cadence: 'At least annually — CERT-In empanelled auditor', lastMonths: 11 },
  { entity: 'Internal security audit — first half', domains: ['Cyber'], quarter: 'Q1', auditor: 'sunita', type: 'Internal', cadence: 'Half-yearly internal security audit', lastMonths: 5 },
  { entity: 'Internal security audit — second half', domains: ['Cyber'], quarter: 'Q3', auditor: 'sunita', type: 'Internal', cadence: 'Half-yearly internal security audit' },
  { entity: 'Vulnerability assessment — critical assets', domains: ['Cyber', 'IT'], quarter: 'Q2', auditor: 'SecureLayer', type: 'IS audit (CERT-In empanelled)', cadence: 'Half-yearly VA on critical assets', lastMonths: 6 },
  { entity: 'Penetration test — internet-facing estate', domains: ['Cyber'], quarter: 'Q3', auditor: 'SecureLayer', type: 'IS audit (CERT-In empanelled)', cadence: 'Annual PT on critical assets', lastMonths: 12 },
  { entity: 'PFRDA ICS compliance audit', domains: ['Compliance', 'Cyber'], quarter: 'Q2', auditor: 'PFRDA-appointed auditor', type: 'PFRDA', cadence: 'PFRDA supervisory cycle', lastMonths: 9 },

  // Risk-based internal coverage of the auditable universe.
  { entity: 'Subscriber contribution processing & reconciliation', domains: ['Operational'], quarter: 'Q1', auditor: 'lakshmi', type: 'Internal', lastMonths: 8 },
  { entity: 'NAV computation & fund accounting', domains: ['Operational', 'Investment'], quarter: 'Q2', auditor: 'lakshmi', type: 'Internal', lastMonths: 14 },
  { entity: 'Investment mandate & exposure limits', domains: ['Investment'], quarter: 'Q2', auditor: 'lakshmi', type: 'Internal', lastMonths: 7 },
  { entity: 'Identity & privileged access management', domains: ['IT', 'Cyber'], quarter: 'Q1', auditor: 'lakshmi', type: 'Internal', lastMonths: 4 },
  { entity: 'Third-party & outsourcing arrangements', domains: ['ThirdParty'], quarter: 'Q3', auditor: 'sunita', type: 'Internal', lastMonths: 18 },
  { entity: 'DPDP readiness & consent management', domains: ['Compliance'], quarter: 'Q3', auditor: 'sunita', type: 'Internal', lastMonths: 10 },
  { entity: 'Statutory filing calendar & maker-checker', domains: ['Compliance'], quarter: 'Q4', auditor: 'lakshmi', type: 'Internal', lastMonths: 13 },
  { entity: 'Business continuity & disaster recovery', domains: ['IT'], quarter: 'Q4', auditor: 'sunita', type: 'Internal', lastMonths: 16 },
  { entity: 'GST, TDS & payroll statutory deductions', domains: ['Compliance'], quarter: 'Q4', auditor: 'lakshmi', type: 'Internal', lastMonths: 11 },
  { entity: 'Subscriber grievance handling', domains: ['Operational'], quarter: 'Q4', auditor: 'lakshmi', type: 'Internal' },
]

/** Which fiscal quarter we are in — the plan's status derives from this, so
 *  "Planned" versus "Deferred" is a fact about the calendar, not a stored flag. */
function currentFyQuarter(): { fy: string; q: number } {
  const d = new Date(NOW_MS)
  const m = d.getMonth() // 0-11; Indian FY starts in April (month 3)
  const fyStartYear = m >= 3 ? d.getFullYear() : d.getFullYear() - 1
  const q = Math.floor(((m - 3 + 12) % 12) / 3) + 1
  return { fy: `FY${fyStartYear}-${String((fyStartYear + 1) % 100).padStart(2, '0')}`, q }
}

export const FY = currentFyQuarter()

export function buildAuditPlan(risks: Risk[], audits: Audit[]): AuditPlanEntry[] {
  const r = new Rand(808)
  return PLAN_DEFS.map((def, i) => {
    // Risk-based prioritisation, scored the way an audit universe actually is:
    // exposure PLUS staleness. Taking the worst single residual saturates —
    // every domain holds at least one severe risk, so everything came out High
    // and the plan carried no information. The tail-weighted domain aggregate
    // (the same measure the appetite panel reports) discriminates properly, and
    // time since last audit lifts entities that have gone unlooked-at.
    const inScope = risks.filter((x) => def.domains.includes(x.domain))
    const exposure = Math.max(
      ...def.domains.map((d) => aggregateResidual(risks.filter((x) => x.domain === d).map((x) => x.residual))),
      0,
    )
    const monthsSince = def.lastMonths ?? 24 // never audited scores as two years
    const staleness = Math.min(4, monthsSince / 6)
    const score = exposure + staleness
    const priority: AuditPlanEntry['priority'] = score >= 18 ? 'High' : score >= 13 ? 'Medium' : 'Low'
    const linkedRiskIds = [...inScope].sort((a, b) => b.residual - a.residual).slice(0, 3).map((x) => x.id)

    const qNum = Number(def.quarter.slice(1))
    // Anything scheduled before the current quarter is either done or slipped.
    const status: AuditPlanEntry['status'] =
      qNum < FY.q ? (r.bool(0.78) ? 'Complete' : 'Deferred') : qNum === FY.q ? (r.bool(0.6) ? 'In progress' : 'Planned') : 'Planned'

    // Bind completed and in-flight entries to a real audit of the same type.
    const pool = audits.filter((a) => a.type === def.type)
    const linkedAuditId = status === 'Complete' || status === 'In progress' ? pool[i % Math.max(1, pool.length)]?.id : undefined

    return {
      id: `PLAN-${FY.fy.replace(/[^0-9]/g, '').slice(0, 4)}-${String(i + 1).padStart(2, '0')}`,
      auditableEntity: def.entity,
      linkedRiskIds,
      lastAudited: def.lastMonths ? iso(new Date(NOW_MS - def.lastMonths * 30 * 86400000)) : undefined,
      priority,
      plannedQuarter: def.quarter,
      fy: FY.fy,
      auditor: def.auditor,
      auditType: def.type,
      status,
      linkedAuditId,
      cadenceBasis: def.cadence,
    }
  })
}

// ── Working papers ───────────────────────────────────────────────────────────

interface PaperTemplate {
  objective: string
  procedure: string
  conclusion: (pass: boolean) => string
  controlHints: string[]
  population?: [number, number]
}

const PAPER_TEMPLATES: PaperTemplate[] = [
  {
    objective: 'Test that privileged access is recertified within the policy window',
    procedure: 'Extract the privileged account inventory from Okta/AD, agree it to the approved role matrix, and inspect recertification sign-off for each sampled account.',
    conclusion: (p) => (p ? 'All sampled accounts were recertified within the window and signed off by the role owner.' : 'Control not operating effectively — sampled accounts had no recertification evidence within the window.'),
    controlHints: ['recertif', 'privileged', 'access'],
    population: [180, 260],
  },
  {
    objective: 'Test that critical vulnerabilities are remediated inside the 14-day SLA',
    procedure: 'Reconcile the Qualys VM critical findings register to the change record, and measure elapsed days from detection to verified remediation.',
    conclusion: (p) => (p ? 'Remediation completed inside the SLA for every item sampled.' : 'Items sampled exceeded the 14-day window with no approved exception on file.'),
    controlHints: ['patch', 'vulnerab'],
    population: [40, 140],
  },
  {
    objective: 'Test maker-checker separation on financial postings',
    procedure: 'Select journal entries from the fund-accounting ledger and inspect that the approver differs from the preparer, with both stamped in the audit trail.',
    conclusion: (p) => (p ? 'Maker and checker were different individuals on every entry sampled.' : 'Entries were identified where the preparer also approved the posting.'),
    controlHints: ['maker-checker', 'segregation', 'financial'],
    population: [300, 900],
  },
  {
    objective: 'Test completeness of subscriber contribution reconciliation at T+1',
    procedure: 'Agree the CRA contribution file to the fund-accounting ledger for the sampled cycles and inspect the ageing of unresolved breaks.',
    conclusion: (p) => (p ? 'Breaks were cleared within the T+1 window for every cycle sampled.' : 'Unresolved breaks were carried beyond T+1 without escalation.'),
    controlHints: ['reconcil', 'contribution'],
    population: [900, 2600],
  },
  {
    objective: 'Test that backup restoration is verified, not merely scheduled',
    procedure: 'Inspect restoration test records for the sampled periods and agree the restored dataset to the source system record count.',
    conclusion: (p) => (p ? 'Restoration was evidenced and reconciled for every period sampled.' : 'Restoration tests were scheduled but no evidence of a completed restore was retained.'),
    controlHints: ['backup', 'restor'],
    population: [6, 24],
  },
  {
    objective: 'Test that log retention meets the 180-day in-India requirement',
    procedure: 'Inspect Splunk retention configuration and storage location, and sample log availability at the retention boundary.',
    conclusion: (p) => (p ? 'Logs were retained for the full period within India and were retrievable at the boundary.' : 'Retention fell short of the required period for a subset of sources.'),
    controlHints: ['logging', 'retention', 'log'],
    population: [8, 30],
  },
  {
    objective: 'Test pre-trade enforcement of scheme exposure limits',
    procedure: 'Select orders from the order-management system and inspect that limit checks executed and blocked breaching orders before release.',
    conclusion: (p) => (p ? 'Pre-trade checks executed on every order sampled and blocked the breaching cases.' : 'Orders were released without an evidenced pre-trade limit check.'),
    controlHints: ['exposure', 'limit', 'investment'],
    population: [120, 480],
  },
  {
    objective: 'Test that incidents are classified against the PFRDA ICS taxonomy',
    procedure: 'Select incidents from the register and agree the recorded classification and regulator tracks to the taxonomy criteria.',
    conclusion: (p) => (p ? 'Classification agreed to the taxonomy for every incident sampled.' : 'Incidents were found with a classification inconsistent with the recorded impact.'),
    controlHints: ['incident', 'classif'],
    population: [20, 60],
  },
  {
    objective: 'Test evidence retention against the statutory floor',
    procedure: 'Sample evidence items across control cycles and agree retention dates to the statutory minimum for each record class.',
    conclusion: (p) => (p ? 'Retention met or exceeded the statutory floor for every item sampled.' : 'Items were identified with retention below the statutory floor.'),
    controlHints: ['evidence', 'retention', 'record'],
    population: [50, 200],
  },
  {
    objective: 'Test that vendor due diligence is current for material outsourcing',
    procedure: 'Select material outsourcing arrangements and inspect the most recent due-diligence assessment, right-to-audit clause and exit plan.',
    conclusion: (p) => (p ? 'Current diligence, right-to-audit and exit provisions were evidenced for every arrangement sampled.' : 'Arrangements were identified without current diligence documentation.'),
    controlHints: ['vendor', 'third-party', 'outsourc'],
    population: [8, 25],
  },
]

/**
 * Papers for every audit that is not merely planned. Open audits carry 5–10;
 * closed ones carry a completed set. Results are weighted so failures are the
 * minority and every open finding has a plausible paper behind it.
 */
export function buildWorkingPapers(audits: Audit[], controls: Control[], evidence: Evidence[]): WorkingPaper[] {
  const r = new Rand(4242)
  const out: WorkingPaper[] = []

  for (const audit of audits) {
    if (audit.status === 'Planned') continue
    const count = audit.status === 'Closed' ? r.int(5, 8) : r.int(5, 10)
    const openFindings = audit.findings.filter((f) => f.status !== 'Closed')
    let findingCursor = 0

    for (let i = 0; i < count; i++) {
      const tpl = PAPER_TEMPLATES[(i + audits.indexOf(audit)) % PAPER_TEMPLATES.length]
      const control = controls.find((c) => tpl.controlHints.some((h) => c.title.toLowerCase().includes(h)))
      const population = tpl.population ? r.int(tpl.population[0], tpl.population[1]) : undefined
      const sampleBasis = r.weighted<NonNullable<WorkingPaper['sampleBasis']>>([
        ['Judgemental', 4],
        ['Random', 4],
        ['Full population', 1.2],
      ])
      const sampleSize =
        population === undefined
          ? undefined
          : sampleBasis === 'Full population'
            ? population
            : Math.max(5, Math.round(population * (r.int(6, 24) / 100)))

      const result = r.weighted<WorkingPaper['result']>([
        ['Pass', 6],
        ['Fail', 2],
        ['Partial', 1.5],
        ['Not applicable', 0.4],
      ])
      const pass = result === 'Pass'
      const testedOn = iso(new Date(NOW_MS - r.int(12, 210) * 86400000))
      // Link a failure to a real open finding where one is available, so the
      // paper -> finding -> issue chain is intact in the seed.
      const findingId = result === 'Fail' && openFindings[findingCursor] ? openFindings[findingCursor++].id : undefined
      const evidenceIds = control
        ? evidence.filter((e) => e.linkedControls.includes(control.id)).slice(0, 2).map((e) => e.id)
        : []

      out.push({
        id: `WP-${audit.id}-${String(i + 1).padStart(2, '0')}`,
        auditId: audit.id,
        reference: `WP-${String(i + 1).padStart(2, '0')}`,
        controlTested: control?.id,
        objective: tpl.objective,
        procedure: tpl.procedure,
        populationSize: population,
        sampleSize,
        sampleBasis,
        result,
        tester: r.pick(['lakshmi', 'sunita']),
        testedOn,
        evidenceIds,
        conclusion: result === 'Not applicable' ? 'Not applicable in the period under review; no transactions in scope.' : tpl.conclusion(pass),
        findingId,
      })
    }
  }

  return out
}

/**
 * The spec's worked example, made exact: AUD-IS-2026-01 WP-03 tests privileged
 * access recertification over 214 accounts on a judgemental sample of 25, fails
 * with 4 accounts unrecertified, and is the paper the demo raises a finding from.
 * Deliberately left WITHOUT a findingId so the escalation is live in the UI.
 */
export function curateWorkedPaper(papers: WorkingPaper[], controls: Control[], evidence: Evidence[]): void {
  const wp = papers.find((p) => p.auditId === 'AUD-IS-2026-01' && p.reference === 'WP-03')
  if (!wp) return
  const control = controls.find((c) => /recertif|privileged/i.test(c.title)) ?? controls.find((c) => /access/i.test(c.title))
  const okta = evidence.filter((e) => e.source === 'Okta/AD').slice(0, 1).map((e) => e.id)
  Object.assign(wp, {
    controlTested: control?.id,
    objective: 'Test that privileged access is recertified within the policy window',
    procedure:
      'Extract the privileged account inventory from Okta/AD as at the period end, agree it to the approved role matrix, and inspect recertification sign-off for each sampled account.',
    populationSize: 214,
    sampleSize: 25,
    sampleBasis: 'Judgemental' as const,
    result: 'Fail' as const,
    tester: 'lakshmi',
    testedOn: iso(new Date(NOW_MS - 26 * 86400000)),
    evidenceIds: okta.length ? okta : wp.evidenceIds,
    conclusion:
      'Control not operating effectively. 4 of 25 sampled privileged accounts had no recertification evidence within the policy window; two belonged to leavers whose access had not been withdrawn.',
    findingId: undefined,
  })
}
