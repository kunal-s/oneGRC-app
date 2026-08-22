// Fraud case management.
//
// The mirror image of the speak-up channel: this module exists to process data,
// not to protect a person. Cases arrive from transaction monitoring, CCM rule
// failures, reconciliation breaks and audit findings — and, where the ethics
// office converts one, from a speak-up report carrying its reference code and
// nothing else.
//
// The outputs are shared: a confirmed loss uses the same Basel categories as an
// operational incident so it lands in one loss engine, remediation goes through
// the one Issues register, and a substantiated case pushes into the enterprise
// risk register rather than sitting in a silo.
import type { FraudCase, FraudStage, LossEventCategory, QueueTask, RoleKey, Severity } from '@/types'
import { WORLD } from '@/data'
import { PEOPLE_BY_ID } from '@/data/people'
import { NOW_MS } from '@/lib/time'
import { ladderFor, latestFired, type ReminderEvent } from '@/lib/reminders'
import { accessTo, partitionByAccess } from '@/lib/investigations'

const DAY = 86400000

export const FRAUD_STAGES: FraudStage[] = ['Reported', 'Triage', 'Investigation', 'Recovery & action', 'Closed']

export const fraudStageIndex = (s: FraudStage): number => Math.max(0, FRAUD_STAGES.indexOf(s))

export const isOpenCase = (c: FraudCase): boolean => c.stage !== 'Closed'

export const fraudStageTone = (s: FraudStage): 'ok' | 'warn' | 'danger' | 'info' =>
  s === 'Closed' ? 'ok' : s === 'Reported' ? 'danger' : s === 'Investigation' ? 'warn' : 'info'

// ── loss ─────────────────────────────────────────────────────────────────────

/** Net exposure. Derived, never stored — the same rule the incident loss engine
 *  follows, so the two cannot disagree. */
export const netLossLakh = (c: FraudCase): number => Math.max(0, (c.confirmedLossLakh ?? c.estimatedLossLakh) - (c.recoveredLakh ?? 0))

export const recoveryRate = (c: FraudCase): number => {
  const gross = c.confirmedLossLakh ?? c.estimatedLossLakh
  return gross > 0 ? Math.round(((c.recoveredLakh ?? 0) / gross) * 100) : 0
}

export const inrLakh = (lakh: number): string => (lakh >= 100 ? `₹${(lakh / 100).toFixed(2)} cr` : `₹${lakh.toFixed(2)} lakh`)

export function lossByScheme(cases: FraudCase[]): { scheme: string; net: number; count: number }[] {
  const map = new Map<string, { net: number; count: number }>()
  for (const c of cases) {
    const cur = map.get(c.scheme) ?? { net: 0, count: 0 }
    cur.net += netLossLakh(c)
    cur.count++
    map.set(c.scheme, cur)
  }
  return [...map.entries()].map(([scheme, v]) => ({ scheme, ...v })).sort((a, b) => b.net - a.net)
}

export function lossByCategory(cases: FraudCase[]): { category: LossEventCategory; net: number; count: number }[] {
  const map = new Map<LossEventCategory, { net: number; count: number }>()
  for (const c of cases) {
    const cur = map.get(c.lossCategory) ?? { net: 0, count: 0 }
    cur.net += netLossLakh(c)
    cur.count++
    map.set(c.lossCategory, cur)
  }
  return [...map.entries()].map(([category, v]) => ({ category, ...v })).sort((a, b) => b.net - a.net)
}

// ── detection quality ────────────────────────────────────────────────────────

/** How the estate is actually catching fraud. A book dominated by "subscriber
 *  complaint" is a book where the controls are not the ones finding it. */
export function byDetection(cases: FraudCase[]): { detection: string; count: number; proactive: boolean }[] {
  const PROACTIVE = new Set(['Transaction monitoring alert', 'CCM rule failure', 'Internal audit finding', 'Reconciliation break', 'Management review'])
  const map = new Map<string, number>()
  for (const c of cases) map.set(c.detection, (map.get(c.detection) ?? 0) + 1)
  return [...map.entries()].map(([detection, count]) => ({ detection, count, proactive: PROACTIVE.has(detection) })).sort((a, b) => b.count - a.count)
}

export const proactiveDetectionRate = (cases: FraudCase[]): number => {
  const rows = byDetection(cases)
  const total = rows.reduce((n, r) => n + r.count, 0)
  const proactive = rows.filter((r) => r.proactive).reduce((n, r) => n + r.count, 0)
  return total ? Math.round((proactive / total) * 100) : 0
}

// ── regulatory clocks ────────────────────────────────────────────────────────

export type TrackState = 'Filed' | 'Due' | 'Breached' | 'Not required'

export function trackState(t: FraudCase['regulatoryTracks'][number]): TrackState {
  if (!t.required) return 'Not required'
  if (t.reportedOn) return 'Filed'
  if (!t.dueBy) return 'Due'
  return new Date(t.dueBy).getTime() < NOW_MS ? 'Breached' : 'Due'
}

export const trackTone = (s: TrackState): 'ok' | 'warn' | 'danger' | 'neutral' =>
  s === 'Filed' ? 'ok' : s === 'Breached' ? 'danger' : s === 'Due' ? 'warn' : 'neutral'

export const openTracks = (c: FraudCase) => c.regulatoryTracks.filter((t) => trackState(t) === 'Due' || trackState(t) === 'Breached')

/** Which regulators a case of this shape actually engages — the reason a fraud
 *  module in a pension fund is not a generic case tracker. */
export function requiredTracks(args: { subscriberImpacting: boolean; personalDataInvolved: boolean; cyberEnabled: boolean; lossLakh: number }): FraudCase['regulatoryTracks'] {
  const out: FraudCase['regulatoryTracks'] = []
  if (args.subscriberImpacting) {
    out.push({
      regulator: 'PFRDA',
      required: true,
      basis: 'Subscriber-impacting event — reportable to PFRDA within 48 hours, then in the quarterly return.',
      dueBy: new Date(NOW_MS + 2 * DAY).toISOString(),
    })
  }
  if (args.cyberEnabled) {
    out.push({
      regulator: 'CERT-In',
      required: true,
      basis: 'Cyber-enabled fraud — CERT-In Direction 20(3)/2022, 6 hours from detection.',
      dueBy: new Date(NOW_MS + 0.25 * DAY).toISOString(),
    })
  }
  if (args.personalDataInvolved) {
    out.push({
      regulator: 'DPDP Board',
      required: true,
      basis: 'Personal data of subscribers affected — DPDP Act 2023 breach intimation.',
      dueBy: new Date(NOW_MS + 3 * DAY).toISOString(),
    })
  }
  if (args.lossLakh >= 100) {
    out.push({
      regulator: 'Police / EOW',
      required: true,
      basis: 'Loss above the ₹1 crore board threshold for criminal referral.',
    })
  }
  out.push({
    regulator: 'Statutory auditor',
    required: args.lossLakh >= 10,
    basis: 'Reportable to the statutory auditor and the Audit Committee where the loss exceeds ₹10 lakh.',
  })
  return out
}

// ── chasing ──────────────────────────────────────────────────────────────────

/** Investigations run to a target: 45 days for a critical case, 90 otherwise.
 *  The shipped ladder does the chasing. */
export const investigationDueBy = (c: FraudCase): string =>
  new Date(new Date(c.openedOn).getTime() + (c.severity === 'Critical' ? 45 : 90) * DAY).toISOString()

export function fraudLadder(c: FraudCase): ReminderEvent[] {
  if (!isOpenCase(c)) return []
  // The soonest real deadline: a regulator clock beats the investigation target.
  const reg = openTracks(c)
    .map((t) => t.dueBy)
    .filter(Boolean) as string[]
  const soonest = [investigationDueBy(c), ...reg].sort((a, b) => new Date(a).getTime() - new Date(b).getTime())[0]
  return ladderFor(c.id, soonest, c.investigator, c.sponsor)
}

export const fraudFollowUp = (c: FraudCase) => latestFired(fraudLadder(c))

export const caseAge = (c: FraudCase): number =>
  Math.max(0, Math.round(((c.closedOn ? new Date(c.closedOn).getTime() : NOW_MS) - new Date(c.openedOn).getTime()) / DAY))

export const isOverdue = (c: FraudCase): boolean => isOpenCase(c) && new Date(investigationDueBy(c)).getTime() < NOW_MS

// ── portfolio ────────────────────────────────────────────────────────────────

export interface FraudSummary {
  total: number
  open: number
  visible: number
  sealed: number
  substantiated: number
  netLossLakh: number
  recoveredLakh: number
  recoveryRate: number
  proactiveDetectionPct: number
  fromWhistleblower: number
  overdueInvestigations: number
  regulatoryBreaches: number
  medianDaysToClose: number
}

export function fraudSummary(cases: FraudCase[], personId: string, role: RoleKey): FraudSummary {
  const { open: visible, sealed } = partitionByAccess(cases, personId, role)
  const closed = cases.filter((c) => c.closedOn)
  const durations = closed.map(caseAge).sort((a, b) => a - b)
  const gross = cases.reduce((n, c) => n + (c.confirmedLossLakh ?? c.estimatedLossLakh), 0)
  const recovered = cases.reduce((n, c) => n + (c.recoveredLakh ?? 0), 0)
  return {
    total: cases.length,
    open: cases.filter(isOpenCase).length,
    visible: visible.length,
    sealed: sealed.length,
    substantiated: cases.filter((c) => c.outcome === 'Substantiated' || c.outcome === 'Partially substantiated').length,
    netLossLakh: cases.reduce((n, c) => n + netLossLakh(c), 0),
    recoveredLakh: recovered,
    recoveryRate: gross ? Math.round((recovered / gross) * 100) : 0,
    proactiveDetectionPct: proactiveDetectionRate(cases),
    fromWhistleblower: cases.filter((c) => c.whistleblowerRef).length,
    overdueInvestigations: cases.filter(isOverdue).length,
    regulatoryBreaches: cases.reduce((n, c) => n + c.regulatoryTracks.filter((t) => trackState(t) === 'Breached').length, 0),
    medianDaysToClose: durations.length ? durations[Math.floor(durations.length / 2)] : 0,
  }
}

export const casesForRisk = (riskId: string, all: FraudCase[] = WORLD.fraudCases): FraudCase[] =>
  all.filter((c) => c.linkedRiskIds.includes(riskId))

export const casesForControl = (controlId: string, all: FraudCase[] = WORLD.fraudCases): FraudCase[] =>
  all.filter((c) => c.linkedControls.includes(controlId))

// ── queue ────────────────────────────────────────────────────────────────────

export function fraudQueueItems(role: RoleKey, selfId: string, all: FraudCase[] = WORLD.fraudCases): QueueTask[] {
  const out: QueueTask[] = []
  const push = (t: Omit<QueueTask, 'id'>) => out.push({ ...t, id: `Q-FRD-${out.length + 1}` })

  for (const c of all) {
    if (!isOpenCase(c)) continue
    if (!accessTo(c, selfId, role).canOpen) continue

    for (const t of openTracks(c)) {
      push({
        role,
        kind: 'Incident action',
        title: `File the ${t.regulator} notification for ${c.id}`,
        ref: c.id,
        route: `/fraud/${c.id}`,
        due: t.dueBy ?? investigationDueBy(c),
        priority: trackState(t) === 'Breached' ? 'Critical' : 'High',
      })
    }

    if (c.stage === 'Reported' || c.stage === 'Triage') {
      push({
        role,
        kind: 'Approval',
        title: `Triage fraud case ${c.id} — ${c.scheme.toLowerCase()}`,
        ref: c.id,
        route: `/fraud/${c.id}`,
        due: investigationDueBy(c),
        priority: c.severity,
      })
    }
    if (c.stage === 'Investigation' && PEOPLE_BY_ID[c.investigator]?.role === role) {
      push({
        role,
        kind: 'Evidence request',
        title: `Conclude the investigation into ${c.id}`,
        ref: c.id,
        route: `/fraud/${c.id}`,
        due: investigationDueBy(c),
        priority: isOverdue(c) ? 'Critical' : c.severity,
      })
    }
    if (c.stage === 'Recovery & action') {
      push({
        role,
        kind: 'Control re-test',
        title: `Close out recovery and control action on ${c.id}`,
        ref: c.id,
        route: `/fraud/${c.id}`,
        due: investigationDueBy(c),
        priority: 'Medium' as Severity,
      })
    }
  }
  return out
}

export function fraudAuditRows(all: FraudCase[] = WORLD.fraudCases): { id: string; at: string; actor: string; action: string; object: string; detail: string }[] {
  const rows: { id: string; at: string; actor: string; action: string; object: string; detail: string }[] = []
  let seq = 0
  for (const c of all) {
    for (const e of fraudLadder(c)) {
      if (!e.fired) continue
      rows.push({
        id: `LOG-FRD-${String(++seq).padStart(3, '0')}`,
        at: e.at,
        actor: 'system',
        action:
          e.kind === 'reminder'
            ? `${c.id} — ${e.intervalLabel} reminder to the case investigator`
            : `${c.id} past its investigation target — escalated to ${e.targetRole}, ${e.intervalLabel}`,
        object: c.id,
        detail: `${c.scheme} · ${c.stage} · ${caseAge(c)} days open · exposure ${inrLakh(netLossLakh(c))}`,
      })
    }
  }
  return rows
}
