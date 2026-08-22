// Risk & control self-assessment — the RCSA payload on the WI-09 campaign
// container.
//
// The whole point of an RCSA is that it moves the register. A cycle that
// collects opinions and files them is theatre, so the contract here is:
//
//   owner re-scores  →  checker challenges  →  approval WRITES BACK to the Risk
//
// `applyRcsa` produces the patch and the timeline event; the store applies it
// through the same `patchRisk → recordAction → notify` triad every other
// mutation uses. Nothing new is stored on the Risk to support this — the
// assessment history *is* the campaign record, read back through
// `lastAssessment`, so there is one copy of the truth.
import type {
  Campaign,
  CampaignTask,
  ControlAssessment,
  ControlEffectiveness,
  RcsaResponse,
  Risk,
  TimelineEvent,
} from '@/types'
import { WORLD, getControl } from '@/data'
import { NOW, NOW_MS } from '@/lib/time'
import { personName } from '@/data/people'

const DAY = 86400000

// ── the payload ──────────────────────────────────────────────────────────────

/** A response is only an RCSA response if it carries the re-score. Seeded and
 *  session tasks both go through this, so a half-filled payload can never be
 *  read as a complete assessment. */
export function asRcsa(task: CampaignTask): RcsaResponse | undefined {
  const r = task.response as Partial<RcsaResponse>
  if (typeof r.proposedResidual !== 'number' || typeof r.stillRelevant !== 'boolean') return undefined
  return {
    stillRelevant: r.stillRelevant,
    proposedLikelihood: r.proposedLikelihood ?? 0,
    proposedImpact: r.proposedImpact ?? 0,
    proposedResidual: r.proposedResidual,
    priorResidual: r.priorResidual ?? r.proposedResidual,
    proposedTreatment: r.proposedTreatment ?? 'Mitigate',
    controls: r.controls ?? [],
    rationale: r.rationale ?? '',
    emergingConcern: r.emergingConcern,
    evidenceIds: r.evidenceIds,
  }
}

/** The form's starting point: the risk exactly as it stands today, so an
 *  assessor edits a position rather than inventing one. */
export function draftRcsa(risk: Risk): RcsaResponse {
  return {
    stillRelevant: true,
    proposedLikelihood: risk.likelihood,
    proposedImpact: risk.impact,
    proposedResidual: risk.residual,
    priorResidual: risk.residual,
    proposedTreatment: risk.treatment,
    controls: risk.linkedControls.map((controlId) => ({
      controlId,
      // Seeded from the last control test — the assessor confirms or overrides
      // it, which is the point of a *self*-assessment.
      effectiveness: effectivenessFromTest(controlId),
    })),
    rationale: '',
  }
}

function effectivenessFromTest(controlId: string): ControlEffectiveness {
  const c = getControl(controlId)
  if (!c) return 'Not tested'
  return c.result === 'Pass' ? 'Effective' : c.result === 'Partial' ? 'Partially effective' : 'Ineffective'
}

export const EFFECTIVENESS: ControlEffectiveness[] = ['Effective', 'Partially effective', 'Ineffective', 'Not tested']

export const effectivenessTone = (e: ControlEffectiveness): 'ok' | 'warn' | 'danger' | 'neutral' =>
  e === 'Effective' ? 'ok' : e === 'Partially effective' ? 'warn' : e === 'Ineffective' ? 'danger' : 'neutral'

/** A rating below 'Effective' has to say why. The form enforces it; this is the
 *  single definition both the form and the reviewer's view read. */
export function rcsaGaps(r: RcsaResponse): string[] {
  const gaps: string[] = []
  if (!r.rationale.trim()) gaps.push('Rationale is required.')
  if (r.proposedResidual > r.proposedLikelihood * r.proposedImpact)
    gaps.push('Residual cannot exceed the inherent score — controls reduce exposure, they do not add to it.')
  for (const c of r.controls) {
    if (c.effectiveness !== 'Effective' && !c.comment?.trim())
      gaps.push(`${c.controlId} rated ${c.effectiveness} — a comment is required.`)
  }
  return gaps
}

export const isRcsaComplete = (r: RcsaResponse) => rcsaGaps(r).length === 0

// ── the delta the checker challenges ─────────────────────────────────────────

export interface RcsaChange {
  field: string
  from: string | number
  to: string | number
}

/** What approving this response would change on the register. Empty means the
 *  owner re-confirmed the current position — a valid and common outcome. */
export function rcsaDelta(risk: Risk, r: RcsaResponse): RcsaChange[] {
  const out: RcsaChange[] = []
  const inherent = r.proposedLikelihood * r.proposedImpact
  if (r.proposedLikelihood && r.proposedLikelihood !== risk.likelihood)
    out.push({ field: 'Likelihood', from: risk.likelihood, to: r.proposedLikelihood })
  if (r.proposedImpact && r.proposedImpact !== risk.impact) out.push({ field: 'Impact', from: risk.impact, to: r.proposedImpact })
  if (r.proposedLikelihood && r.proposedImpact && inherent !== risk.inherent)
    out.push({ field: 'Inherent', from: risk.inherent, to: inherent })
  if (r.proposedResidual !== risk.residual) out.push({ field: 'Residual', from: risk.residual, to: r.proposedResidual })
  if (r.proposedTreatment !== risk.treatment) out.push({ field: 'Treatment', from: risk.treatment, to: r.proposedTreatment })
  if (!r.stillRelevant && risk.status !== 'Mitigated') out.push({ field: 'Status', from: risk.status, to: 'Mitigated' })
  return out
}

/** Months between reviews, from the risk's own stated cadence. */
export const cadenceMonths = (risk: Risk): number =>
  risk.lifecycle.ownership.reviewFrequency === 'Quarterly' ? 3 : risk.lifecycle.ownership.reviewFrequency === 'Half-yearly' ? 6 : 12

/**
 * The patch an approved assessment writes onto the Risk, plus the timeline
 * event that records it. Pure — the store decides when to apply it.
 */
export function applyRcsa(risk: Risk, r: RcsaResponse, approver: string, campaignId: string): Partial<Risk> {
  const inherent = r.proposedLikelihood && r.proposedImpact ? r.proposedLikelihood * r.proposedImpact : risk.inherent
  const residual = Math.min(r.proposedResidual, inherent)
  const changes = rcsaDelta(risk, r)

  const next = new Date(NOW_MS + cadenceMonths(risk) * 30 * DAY).toISOString()
  const event: TimelineEvent = {
    at: NOW.toISOString(),
    actor: approver,
    channel: 'OneGRC',
    kind: 'triage',
    text:
      changes.length > 0
        ? `Self-assessment ${campaignId} approved — ${changes.map((c) => `${c.field} ${c.from} → ${c.to}`).join(', ')}.`
        : `Self-assessment ${campaignId} approved — position re-confirmed, no change to the score.`,
  }

  return {
    likelihood: r.proposedLikelihood || risk.likelihood,
    impact: r.proposedImpact || risk.impact,
    inherent,
    residual,
    treatment: r.proposedTreatment,
    trend: residual > risk.residual ? 'up' : residual < risk.residual ? 'down' : 'flat',
    status: r.stillRelevant ? risk.status : 'Mitigated',
    lastReviewed: NOW.toISOString(),
    lifecycle: {
      ...risk.lifecycle,
      ownership: { ...risk.lifecycle.ownership, nextReviewOn: next },
      history: [...risk.lifecycle.history, event],
    },
  }
}

// ── reading assessments back off the register ────────────────────────────────

export interface Assessment {
  campaign: Campaign
  task: CampaignTask
  response: RcsaResponse
  /** Approved assessments are authoritative; submitted ones are in flight. */
  approved: boolean
  at: string // ISO — reviewedOn where approved, else submittedOn
}

/** Every RCSA submission against a risk, newest first. */
export function assessmentsFor(riskId: string, all: Campaign[] = WORLD.campaigns): Assessment[] {
  const out: Assessment[] = []
  for (const c of all) {
    if (c.type !== 'RCSA') continue
    for (const t of c.tasks) {
      if (t.objectId !== riskId) continue
      if (t.status !== 'Approved' && t.status !== 'Submitted') continue
      const response = asRcsa(t)
      if (!response) continue
      out.push({
        campaign: c,
        task: t,
        response,
        approved: t.status === 'Approved',
        at: (t.status === 'Approved' ? t.reviewedOn : t.submittedOn) ?? c.dueOn,
      })
    }
  }
  return out.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
}

export const lastAssessment = (riskId: string, all: Campaign[] = WORLD.campaigns): Assessment | undefined =>
  assessmentsFor(riskId, all).find((a) => a.approved)

/** An assessment in flight on this risk right now — what the owner still owes. */
export const openAssessment = (riskId: string, all: Campaign[] = WORLD.campaigns): { campaign: Campaign; task: CampaignTask } | undefined => {
  for (const c of all) {
    if (c.type !== 'RCSA' || c.status === 'Closed' || c.status === 'Draft') continue
    const t = c.tasks.find((x) => x.objectId === riskId && x.status !== 'Approved')
    if (t) return { campaign: c, task: t }
  }
  return undefined
}

// ── coverage: the number the committee actually asks for ─────────────────────

export type AssessmentState = 'Current' | 'Due soon' | 'Overdue' | 'Never assessed'

/** Derived from the risk's own cadence and its last approved assessment — not
 *  stored, so the register and the coverage tile cannot disagree. */
export function assessmentState(risk: Risk, all: Campaign[] = WORLD.campaigns): AssessmentState {
  const last = lastAssessment(risk.id, all)
  if (!last) return 'Never assessed'
  const dueMs = new Date(last.at).getTime() + cadenceMonths(risk) * 30 * DAY
  if (dueMs < NOW_MS) return 'Overdue'
  return dueMs - NOW_MS < 30 * DAY ? 'Due soon' : 'Current'
}

export const assessmentTone = (s: AssessmentState): 'ok' | 'warn' | 'danger' | 'neutral' =>
  s === 'Current' ? 'ok' : s === 'Due soon' ? 'warn' : s === 'Overdue' ? 'danger' : 'neutral'

export interface RcsaCoverage {
  total: number
  current: number
  dueSoon: number
  overdue: number
  never: number
  /** Assessed within cadence, as a percentage of the register. */
  coveragePct: number
  /** Risks whose assessment has lapsed or never happened, worst residual first. */
  lapsed: Risk[]
}

export function rcsaCoverage(risks: Risk[], all: Campaign[] = WORLD.campaigns): RcsaCoverage {
  const state = risks.map((r) => ({ risk: r, s: assessmentState(r, all) }))
  const count = (s: AssessmentState) => state.filter((x) => x.s === s).length
  const current = count('Current')
  const dueSoon = count('Due soon')
  return {
    total: risks.length,
    current,
    dueSoon,
    overdue: count('Overdue'),
    never: count('Never assessed'),
    coveragePct: risks.length ? Math.round(((current + dueSoon) / risks.length) * 100) : 0,
    lapsed: state
      .filter((x) => x.s === 'Overdue' || x.s === 'Never assessed')
      .map((x) => x.risk)
      .sort((a, b) => b.residual - a.residual),
  }
}

// ── what the cycle says about the control estate ─────────────────────────────

export interface ControlVerdict {
  controlId: string
  title: string
  effectiveness: ControlEffectiveness
  comment?: string
  /** The last recorded test result, for comparison with the owner's opinion. */
  testResult?: string
  /** True where the owner rates the control worse than its last test says. */
  contradictsTest: boolean
}

const RANK: Record<ControlEffectiveness, number> = { Effective: 0, 'Partially effective': 1, Ineffective: 2, 'Not tested': 1 }

export function controlVerdicts(assessments: ControlAssessment[]): ControlVerdict[] {
  return assessments.map((a) => {
    const c = getControl(a.controlId)
    const fromTest = effectivenessFromTest(a.controlId)
    return {
      controlId: a.controlId,
      title: c?.title ?? a.controlId,
      effectiveness: a.effectiveness,
      comment: a.comment,
      testResult: c?.result,
      contradictsTest: RANK[a.effectiveness] > RANK[fromTest],
    }
  })
}

/** Effectiveness distribution across every approved assessment in a cycle —
 *  the second half of an RCSA, and the half most tools drop. */
export function controlEffectivenessSummary(c: Campaign): { effectiveness: ControlEffectiveness; count: number }[] {
  const map = new Map<ControlEffectiveness, number>()
  for (const t of c.tasks) {
    const r = asRcsa(t)
    if (!r) continue
    for (const ca of r.controls) map.set(ca.effectiveness, (map.get(ca.effectiveness) ?? 0) + 1)
  }
  return EFFECTIVENESS.filter((e) => map.has(e)).map((e) => ({ effectiveness: e, count: map.get(e)! }))
}

/** Controls the first line says are not working, across a cycle — the list the
 *  second line chases. */
export function ineffectiveControls(c: Campaign): { controlId: string; riskIds: string[]; assessedBy: string[]; comment?: string }[] {
  const map = new Map<string, { controlId: string; riskIds: string[]; assessedBy: string[]; comment?: string }>()
  for (const t of c.tasks) {
    const r = asRcsa(t)
    if (!r) continue
    for (const ca of r.controls) {
      if (ca.effectiveness === 'Effective' || ca.effectiveness === 'Not tested') continue
      const cur = map.get(ca.controlId) ?? { controlId: ca.controlId, riskIds: [], assessedBy: [], comment: ca.comment }
      cur.riskIds.push(t.objectId)
      if (!cur.assessedBy.includes(t.assignee)) cur.assessedBy.push(t.assignee)
      cur.comment = cur.comment ?? ca.comment
      map.set(ca.controlId, cur)
    }
  }
  return [...map.values()].sort((a, b) => b.riskIds.length - a.riskIds.length)
}

/** Emerging concerns raised during a cycle — candidate new risks for the 2LoD. */
export function emergingConcerns(c: Campaign): { task: CampaignTask; concern: string; raisedBy: string }[] {
  const out: { task: CampaignTask; concern: string; raisedBy: string }[] = []
  for (const t of c.tasks) {
    const r = asRcsa(t)
    if (!r?.emergingConcern?.trim()) continue
    out.push({ task: t, concern: r.emergingConcern, raisedBy: personName(t.assignee) })
  }
  return out
}

/** Net movement in residual across an approved cycle — did the estate improve? */
export function cycleMovement(c: Campaign, resolve: (id: string) => Risk | undefined): { up: number; down: number; flat: number; netPoints: number } {
  let up = 0
  let down = 0
  let flat = 0
  let netPoints = 0
  for (const t of c.tasks) {
    if (t.status !== 'Approved') continue
    const r = asRcsa(t)
    const risk = resolve(t.objectId)
    if (!r || !risk) continue
    // Against the score stamped when the assessment was drafted — the risk
    // itself already carries the approved change.
    const delta = r.proposedResidual - r.priorResidual
    netPoints += delta
    if (delta > 0) up++
    else if (delta < 0) down++
    else flat++
  }
  return { up, down, flat, netPoints }
}
