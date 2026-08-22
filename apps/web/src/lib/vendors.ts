// Third-party risk — derivation.
//
// Nothing on a Vendor says how risky it is. The tier is computed from what is
// true about the arrangement right now: how critical the service is, what data
// it touches, whether independent assurance is current, whether the exit plan
// has been tested, and what has actually gone wrong. A register that lets
// someone type "Low" next to a material outsourcing with an expired SOC 2 is
// the thing this avoids.
//
// Chasing reuses the shipped 7/3/1 ladder pointed at the next diligence date
// and at assurance expiry. No new scheduler.
import type { QueueTask, RoleKey, Severity, Vendor, VendorAssurance, VendorCriticality, VendorDdResponse, CampaignTask } from '@/types'
import { WORLD } from '@/data'
import { PEOPLE_BY_ID } from '@/data/people'
import { NOW, NOW_MS } from '@/lib/time'
import { expiryState, type ExpiryState } from '@/lib/exceptions'
import { ladderFor, latestFired, type ReminderEvent } from '@/lib/reminders'

const DAY = 86400000

// ── assurance ────────────────────────────────────────────────────────────────

/** The report in force — the one expiring furthest out, since a vendor may
 *  carry several. */
export function currentAssurance(v: Vendor): VendorAssurance | undefined {
  return [...v.assurance].sort((a, b) => new Date(b.expiresOn).getTime() - new Date(a.expiresOn).getTime())[0]
}

export type AssuranceState = ExpiryState | 'None'

/** Shares `expiryState` with the exception register, so "Expiring soon" means
 *  the same number of days everywhere in the platform. */
export function assuranceState(v: Vendor): AssuranceState {
  const a = currentAssurance(v)
  if (!a) return 'None'
  // Assurance reports are annual instruments; 60 days is the window in which a
  // renewal has to be in motion, not the 7 days an exception gets.
  return expiryState(a.expiresOn, false, 60)
}

export const assuranceTone = (s: AssuranceState): 'ok' | 'warn' | 'danger' | 'neutral' =>
  s === 'Active' ? 'ok' : s === 'Expiring soon' ? 'warn' : s === 'Expired' ? 'danger' : 'neutral'

// ── due diligence ────────────────────────────────────────────────────────────

export const ddIntervalDays = (v: Vendor): number =>
  v.dueDiligenceFrequency === 'Half-yearly' ? 182 : v.dueDiligenceFrequency === 'Annual' ? 365 : 730

export function nextDueDiligenceOn(v: Vendor): string | undefined {
  if (!v.lastDueDiligenceOn) return undefined
  return new Date(new Date(v.lastDueDiligenceOn).getTime() + ddIntervalDays(v) * DAY).toISOString()
}

export type DiligenceState = 'Current' | 'Due soon' | 'Overdue' | 'Never assessed'

export function diligenceState(v: Vendor): DiligenceState {
  if (v.status === 'Onboarding' && !v.lastDueDiligenceOn) return 'Never assessed'
  const next = nextDueDiligenceOn(v)
  if (!next) return 'Never assessed'
  const ms = new Date(next).getTime()
  if (ms < NOW_MS) return 'Overdue'
  return ms - NOW_MS < 45 * DAY ? 'Due soon' : 'Current'
}

export const diligenceTone = (s: DiligenceState): 'ok' | 'warn' | 'danger' | 'neutral' =>
  s === 'Current' ? 'ok' : s === 'Due soon' ? 'warn' : s === 'Overdue' ? 'danger' : 'neutral'

// ── the derived tier ─────────────────────────────────────────────────────────

export type VendorTier = 'Critical' | 'High' | 'Medium' | 'Low'

export interface VendorRating {
  tier: VendorTier
  score: number
  /** Every point, attributed — so the tier can be argued with rather than
   *  merely believed. */
  drivers: { label: string; points: number }[]
}

const CRITICALITY_POINTS: Record<VendorCriticality, number> = { Material: 5, Important: 3, Standard: 1 }

export function vendorRating(v: Vendor): VendorRating {
  const drivers: { label: string; points: number }[] = []
  const add = (label: string, points: number) => points > 0 && drivers.push({ label, points })

  add(`${v.criticality} outsourcing`, CRITICALITY_POINTS[v.criticality])

  const materialServices = v.services.filter((s) => s.criticality === 'Material').length
  add(`${materialServices} material service${materialServices === 1 ? '' : 's'}`, materialServices * 2)

  // A vendor delivering a service the fund cannot lose, while classified below
  // material, is escaping the diligence and exit-plan obligations that go with
  // it. The mismatch is itself the finding.
  const understated = materialServices > 0 && v.criticality !== 'Material'
  if (understated) add('Carries a material service but is not classified as material outsourcing', 3)

  if (v.dataAccess.length) add(`Access to ${v.dataAccess.length} class${v.dataAccess.length === 1 ? '' : 'es'} of personal data`, v.dataAccess.length)
  if (v.dataAccess.length && !v.dataProcessingAgreement) add('No data-processing agreement in place', 4)

  const a = assuranceState(v)
  if (a === 'Expired') add('Independent assurance has lapsed', 4)
  else if (a === 'None') add('No independent assurance held', 5)
  else if (a === 'Expiring soon') add('Assurance expires within 60 days', 2)

  const d = diligenceState(v)
  if (d === 'Overdue') add('Due diligence overdue', 3)
  else if (d === 'Never assessed') add('Never subject to due diligence', 3)

  // The exit-plan test applies to anything carrying a material service, not
  // only to what someone remembered to classify as material.
  if (materialServices > 0 && !v.exitPlan.documented) add('Carries a material service with no documented exit plan', 4)
  else if (v.exitPlan.documented && !v.exitPlan.testedOn) add('Exit plan documented but never tested', 2)
  else if (v.exitPlan.testedOn && NOW_MS - new Date(v.exitPlan.testedOn).getTime() > 365 * DAY) add('Exit plan not tested in over a year', 1)

  if (!v.rightToAudit) add('No contractual right to audit', 3)
  if (v.subOutsourcing.length) add(`${v.subOutsourcing.length} disclosed fourth part${v.subOutsourcing.length === 1 ? 'y' : 'ies'}`, v.subOutsourcing.length)
  if (!/^India/.test(v.jurisdiction)) add('Service performed outside India', 2)
  if (v.linkedIncidents.length) add(`${v.linkedIncidents.length} linked incident${v.linkedIncidents.length === 1 ? '' : 's'}`, v.linkedIncidents.length * 2)

  const score = drivers.reduce((n, x) => n + x.points, 0)
  const tier: VendorTier = score >= 18 ? 'Critical' : score >= 12 ? 'High' : score >= 7 ? 'Medium' : 'Low'
  return { tier, score, drivers: drivers.sort((x, y) => y.points - x.points) }
}

export const tierTone = (t: VendorTier): 'ok' | 'warn' | 'danger' | 'neutral' =>
  t === 'Critical' ? 'danger' : t === 'High' ? 'danger' : t === 'Medium' ? 'warn' : 'ok'

/** A vendor the register should be acting on, and why. */
export function vendorFlags(v: Vendor): string[] {
  const out: string[] = []
  if (assuranceState(v) === 'Expired') out.push('Assurance lapsed')
  if (assuranceState(v) === 'None') out.push('No assurance')
  if (diligenceState(v) === 'Overdue') out.push('Diligence overdue')
  const materialServices = v.services.filter((x) => x.criticality === 'Material').length
  if (materialServices > 0 && v.criticality !== 'Material') out.push('Under-classified')
  if (materialServices > 0 && !v.exitPlan.documented) out.push('No exit plan')
  if (materialServices > 0 && v.exitPlan.documented && !v.exitPlan.testedOn) out.push('Exit plan untested')
  if (v.dataAccess.length && !v.dataProcessingAgreement) out.push('No DPA')
  if (!v.rightToAudit) out.push('No right to audit')
  if (new Date(v.contractEnd).getTime() - NOW_MS < 90 * DAY) out.push('Contract expiring')
  return out
}

// ── concentration ────────────────────────────────────────────────────────────

export interface Concentration {
  /** Fourth parties several vendors depend on — the dependency behind the
   *  dependency, and the one an outage actually follows. */
  fourthParty: { name: string; vendors: Vendor[] }[]
  /** Vendors carrying more than one material service. */
  singlePoints: Vendor[]
  /** Spend share held by the largest arrangement. */
  topSpendShare: number
  topSpendVendor?: Vendor
}

export function concentration(vendors: Vendor[]): Concentration {
  const live = vendors.filter((v) => v.status !== 'Terminated')
  const map = new Map<string, Vendor[]>()
  for (const v of live) for (const s of v.subOutsourcing) map.set(s, [...(map.get(s) ?? []), v])
  const totalSpend = live.reduce((n, v) => n + v.annualSpendLakh, 0)
  const top = [...live].sort((a, b) => b.annualSpendLakh - a.annualSpendLakh)[0]
  return {
    fourthParty: [...map.entries()]
      .filter(([, vs]) => vs.length > 1)
      .map(([name, vs]) => ({ name, vendors: vs }))
      .sort((a, b) => b.vendors.length - a.vendors.length),
    singlePoints: live.filter((v) => v.services.filter((s) => s.criticality === 'Material').length > 1),
    topSpendShare: totalSpend ? Math.round(((top?.annualSpendLakh ?? 0) / totalSpend) * 100) : 0,
    topSpendVendor: top,
  }
}

// ── portfolio ────────────────────────────────────────────────────────────────

export interface TprmSummary {
  total: number
  active: number
  material: number
  /** Material arrangements with everything in order: assurance current,
   *  diligence current, exit plan tested. */
  materialInGoodOrder: number
  assuranceLapsed: number
  assuranceExpiring: number
  diligenceOverdue: number
  neverAssessed: number
  criticalTier: number
  annualSpendLakh: number
  /** Material arrangements in good order, as a percentage — the number the
   *  board is given on outsourcing. */
  materialCoveragePct: number
}

export function tprmSummary(vendors: Vendor[]): TprmSummary {
  const live = vendors.filter((v) => v.status !== 'Terminated')
  const material = live.filter((v) => v.criticality === 'Material')
  const good = material.filter(
    (v) => assuranceState(v) === 'Active' && diligenceState(v) === 'Current' && v.exitPlan.documented && !!v.exitPlan.testedOn,
  )
  return {
    total: vendors.length,
    active: live.filter((v) => v.status === 'Active').length,
    material: material.length,
    materialInGoodOrder: good.length,
    assuranceLapsed: live.filter((v) => assuranceState(v) === 'Expired' || assuranceState(v) === 'None').length,
    assuranceExpiring: live.filter((v) => assuranceState(v) === 'Expiring soon').length,
    diligenceOverdue: live.filter((v) => diligenceState(v) === 'Overdue').length,
    neverAssessed: live.filter((v) => diligenceState(v) === 'Never assessed').length,
    criticalTier: live.filter((v) => vendorRating(v).tier === 'Critical').length,
    annualSpendLakh: live.reduce((n, v) => n + v.annualSpendLakh, 0),
    materialCoveragePct: material.length ? Math.round((good.length / material.length) * 100) : 0,
  }
}

/** Worst first — the order the third-party owner works the register in. */
export const byExposure = (vendors: Vendor[]): Vendor[] =>
  [...vendors].sort((a, b) => vendorRating(b).score - vendorRating(a).score || b.annualSpendLakh - a.annualSpendLakh)

export const vendorsForRisk = (riskId: string, all: Vendor[] = WORLD.vendors): Vendor[] =>
  all.filter((v) => v.linkedRisks.includes(riskId))

export const vendorsForControl = (controlId: string, all: Vendor[] = WORLD.vendors): Vendor[] =>
  all.filter((v) => v.linkedControls.includes(controlId))

export const vendorsForIncident = (incidentId: string, all: Vendor[] = WORLD.vendors): Vendor[] =>
  all.filter((v) => v.linkedIncidents.includes(incidentId))

// ── the due-diligence payload ────────────────────────────────────────────────

export function asVendorDd(task: CampaignTask): VendorDdResponse | undefined {
  const r = task.response as Partial<VendorDdResponse>
  if (!r.recommendation) return undefined
  return {
    financialsReviewed: r.financialsReviewed ?? false,
    assuranceCurrent: r.assuranceCurrent ?? false,
    assuranceGap: r.assuranceGap,
    dataProcessingAgreement: r.dataProcessingAgreement ?? false,
    subOutsourcingDisclosed: r.subOutsourcingDisclosed ?? false,
    subOutsourcingNotes: r.subOutsourcingNotes,
    exitPlanTested: r.exitPlanTested ?? false,
    incidentsInPeriod: r.incidentsInPeriod ?? 0,
    slaBreaches: r.slaBreaches ?? 0,
    proposedCriticality: r.proposedCriticality ?? 'Standard',
    recommendation: r.recommendation,
    conditions: r.conditions,
    rationale: r.rationale ?? '',
  }
}

/** Prefilled from what the register already knows, so the reviewer confirms or
 *  contradicts facts rather than inventing them. */
export function draftVendorDd(v: Vendor): VendorDdResponse {
  return {
    financialsReviewed: false,
    assuranceCurrent: assuranceState(v) === 'Active',
    dataProcessingAgreement: v.dataProcessingAgreement,
    subOutsourcingDisclosed: v.subOutsourcing.length > 0,
    subOutsourcingNotes: v.subOutsourcing.join(', ') || undefined,
    exitPlanTested: !!v.exitPlan.testedOn,
    incidentsInPeriod: v.linkedIncidents.length,
    slaBreaches: 0,
    proposedCriticality: v.criticality,
    recommendation: 'Continue',
    rationale: '',
  }
}

export function vendorDdGaps(r: VendorDdResponse, v: Vendor): string[] {
  const gaps: string[] = []
  if (!r.rationale.trim()) gaps.push('A conclusion is required.')
  if (!r.financialsReviewed) gaps.push('Confirm the financial standing of the counterparty has been reviewed.')
  if (!r.assuranceCurrent && !r.assuranceGap?.trim()) gaps.push('Assurance is not current — record what is being done about it.')
  if (v.dataAccess.length > 0 && !r.dataProcessingAgreement)
    gaps.push('This vendor touches personal data; a data-processing agreement is not optional. Record the gap in the conclusion.')
  if (r.recommendation === 'Continue with conditions' && !r.conditions?.trim()) gaps.push('State the conditions being imposed.')
  if (r.recommendation === 'Exit' && !r.conditions?.trim()) gaps.push('State the exit trigger and the timetable.')
  if (r.proposedCriticality === 'Material' && !v.exitPlan.documented && r.recommendation === 'Continue')
    gaps.push('A material arrangement cannot be continued without a documented exit plan — impose a condition or remediate.')
  return gaps
}

export const isVendorDdComplete = (r: VendorDdResponse, v: Vendor) => vendorDdGaps(r, v).length === 0

export interface VendorDdChange {
  field: string
  from: string
  to: string
}

/** What approving this review writes back onto the register. */
export function vendorDdDelta(v: Vendor, r: VendorDdResponse): VendorDdChange[] {
  const out: VendorDdChange[] = []
  if (r.proposedCriticality !== v.criticality) out.push({ field: 'Criticality', from: v.criticality, to: r.proposedCriticality })
  if (r.recommendation === 'Exit' && v.status !== 'Exiting') out.push({ field: 'Status', from: v.status, to: 'Exiting' })
  if (r.recommendation === 'Remediate' && v.status !== 'Under review') out.push({ field: 'Status', from: v.status, to: 'Under review' })
  if (r.dataProcessingAgreement !== v.dataProcessingAgreement)
    out.push({ field: 'Data-processing agreement', from: v.dataProcessingAgreement ? 'In place' : 'Missing', to: r.dataProcessingAgreement ? 'In place' : 'Missing' })
  out.push({ field: 'Last diligence', from: v.lastDueDiligenceOn ? v.lastDueDiligenceOn.slice(0, 10) : 'never', to: NOW.toISOString().slice(0, 10) })
  return out
}

/** The patch an approved review writes onto the vendor. Pure. */
export function applyVendorDd(v: Vendor, r: VendorDdResponse): Partial<Vendor> {
  return {
    criticality: r.proposedCriticality,
    status: r.recommendation === 'Exit' ? 'Exiting' : r.recommendation === 'Remediate' ? 'Under review' : v.status === 'Onboarding' ? 'Active' : v.status,
    dataProcessingAgreement: r.dataProcessingAgreement,
    exitPlan: r.exitPlanTested && !v.exitPlan.testedOn ? { ...v.exitPlan, documented: true, testedOn: NOW.toISOString() } : v.exitPlan,
    lastDueDiligenceOn: NOW.toISOString(),
    dueDiligenceFrequency: r.proposedCriticality === 'Standard' ? 'Biennial' : 'Annual',
  }
}

// ── chasing (shipped ladder) ─────────────────────────────────────────────────

/** The ladder on the next diligence date, and on assurance expiry where that
 *  falls sooner — both real deadlines the third-party owner is chased against. */
export function vendorLadder(v: Vendor): ReminderEvent[] {
  if (v.status === 'Terminated') return []
  const next = nextDueDiligenceOn(v)
  const a = currentAssurance(v)
  const dates = [next, a?.expiresOn].filter(Boolean) as string[]
  if (!dates.length) return []
  const soonest = dates.sort((x, y) => new Date(x).getTime() - new Date(y).getTime())[0]
  const checker = PEOPLE_BY_ID[v.owner]?.role === 'RISK' ? 'meera' : 'imran'
  return ladderFor(v.id, soonest, v.owner, checker === v.owner ? 'meera' : checker)
}

export const vendorFollowUp = (v: Vendor) => latestFired(vendorLadder(v))

export function vendorAuditRows(all: Vendor[] = WORLD.vendors): { id: string; at: string; actor: string; action: string; object: string; detail: string }[] {
  const rows: { id: string; at: string; actor: string; action: string; object: string; detail: string }[] = []
  let seq = 0
  for (const v of all) {
    for (const e of vendorLadder(v)) {
      if (!e.fired) continue
      const d = diligenceState(v)
      const a = assuranceState(v)
      rows.push({
        id: `LOG-VND-${String(++seq).padStart(3, '0')}`,
        at: e.at,
        actor: 'system',
        action:
          e.kind === 'reminder'
            ? `${v.id} — ${e.intervalLabel} reminder to the relationship owner`
            : `${v.id} past due — escalated to ${e.targetRole}, ${e.intervalLabel}`,
        object: v.id,
        detail: `${v.name} · ${v.criticality} · diligence ${d.toLowerCase()} · assurance ${a.toLowerCase()}`,
      })
    }
  }
  return rows
}

// ── queue ────────────────────────────────────────────────────────────────────

const severityFor = (v: Vendor): Severity =>
  v.criticality === 'Material' ? 'High' : v.criticality === 'Important' ? 'Medium' : 'Low'

/**
 * Third-party work items for the shipped My Queue: diligence that has lapsed,
 * assurance that has expired, and material arrangements missing an exit plan.
 * Reuses the existing kinds so `QueueTask['kind']` stays closed.
 */
export function vendorQueueItems(role: RoleKey, all: Vendor[] = WORLD.vendors): QueueTask[] {
  const out: QueueTask[] = []
  const push = (t: Omit<QueueTask, 'id'>) => out.push({ ...t, id: `Q-VND-${out.length + 1}` })

  for (const v of all) {
    if (v.status === 'Terminated') continue
    const owns = PEOPLE_BY_ID[v.owner]?.role === role
    const oversees = role === 'RISK' || role === 'CCO'
    if (!owns && !oversees) continue

    const d = diligenceState(v)
    if (d === 'Overdue' || d === 'Never assessed') {
      push({
        role,
        kind: 'Evidence request',
        title: `${d === 'Never assessed' ? 'Complete first' : 'Refresh overdue'} due diligence — ${v.name}`,
        ref: v.id,
        route: `/vendors/${v.id}`,
        due: nextDueDiligenceOn(v) ?? v.contractEnd,
        priority: severityFor(v),
      })
    }

    const a = currentAssurance(v)
    const as = assuranceState(v)
    if (a && (as === 'Expired' || as === 'Expiring soon')) {
      push({
        role,
        kind: 'Evidence request',
        title: `${as === 'Expired' ? 'Obtain lapsed' : 'Chase renewal of'} ${a.kind} — ${v.name}`,
        ref: v.id,
        route: `/vendors/${v.id}`,
        due: a.expiresOn,
        priority: as === 'Expired' ? severityFor(v) : 'Low',
      })
    }

    if (v.criticality === 'Material' && (!v.exitPlan.documented || !v.exitPlan.testedOn)) {
      push({
        role,
        kind: 'Control re-test',
        title: `${v.exitPlan.documented ? 'Test' : 'Document'} the exit plan — ${v.name}`,
        ref: v.id,
        route: `/vendors/${v.id}`,
        due: v.contractEnd,
        priority: 'Medium',
      })
    }
  }
  return out
}
