// The speak-up channel.
//
// This module exists to protect a person, and every design decision follows
// from that. The reporter's identity is not a field. The record carries a
// reference code and, where someone chose to identify, a *sealed* custody note
// saying who could unseal it and why — never the identity itself, so no screen,
// export, search index or console log can leak what the platform does not hold.
//
// Timeliness is a duty, not a nicety: Companies Act 2013 s.177(9)–(10) requires
// a vigil mechanism with direct access to the Audit Committee chair, and the
// ethics office owes an acknowledgement and then a substantive response inside
// a stated window. Both windows run on the shipped 7/3/1 ladder.
import type { QueueTask, RoleKey, Severity, WhistleblowerReport, WbStage } from '@/types'
import { WORLD } from '@/data'
import { PEOPLE_BY_ID } from '@/data/people'
import { NOW_MS } from '@/lib/time'
import { ladderFor, latestFired, type ReminderEvent } from '@/lib/reminders'
import { accessTo, partitionByAccess } from '@/lib/investigations'

const DAY = 86400000

export const WB_STAGES: WbStage[] = [
  'Received',
  'Acknowledged',
  'Under triage',
  'Investigation',
  'Awaiting outcome',
  'Remediation',
  'Closed',
]

export const wbStageIndex = (s: WbStage): number => (s === 'Rejected' ? WB_STAGES.length - 1 : Math.max(0, WB_STAGES.indexOf(s)))

export const isOpen = (r: WhistleblowerReport): boolean => r.stage !== 'Closed' && r.stage !== 'Rejected'

export const stageTone = (s: WbStage): 'ok' | 'warn' | 'danger' | 'info' | 'neutral' =>
  s === 'Closed' ? 'ok' : s === 'Rejected' ? 'neutral' : s === 'Received' ? 'danger' : s === 'Investigation' ? 'warn' : 'info'

// ── the two clocks ───────────────────────────────────────────────────────────

export type SlaState = 'Met' | 'Due' | 'Breached' | 'Not applicable'

/** Acknowledgement: the reporter is told the report landed and is being looked
 *  at. A silent channel is a channel nobody uses twice. */
export function acknowledgeState(r: WhistleblowerReport): SlaState {
  if (r.acknowledgedOn) return new Date(r.acknowledgedOn).getTime() <= new Date(r.acknowledgeBy).getTime() ? 'Met' : 'Breached'
  return new Date(r.acknowledgeBy).getTime() < NOW_MS ? 'Breached' : 'Due'
}

/** Substantive feedback: what came of it. Owed whether or not the allegation
 *  stood up. */
export function feedbackState(r: WhistleblowerReport): SlaState {
  if (r.closedOn) return new Date(r.closedOn).getTime() <= new Date(r.feedbackBy).getTime() ? 'Met' : 'Breached'
  return new Date(r.feedbackBy).getTime() < NOW_MS ? 'Breached' : 'Due'
}

export const slaTone = (s: SlaState): 'ok' | 'warn' | 'danger' | 'neutral' =>
  s === 'Met' ? 'ok' : s === 'Breached' ? 'danger' : s === 'Due' ? 'warn' : 'neutral'

/** Chasing on the feedback deadline, using the shipped ladder. The target is
 *  the ethics office, never the reporter. */
export function wbLadder(r: WhistleblowerReport): ReminderEvent[] {
  if (!isOpen(r)) return []
  const owner = r.investigator ?? r.triagedBy ?? 'anjali'
  const checker = owner === 'sunita' ? 'anjali' : 'sunita'
  return ladderFor(r.id, r.feedbackBy, owner, checker)
}

export const wbFollowUp = (r: WhistleblowerReport) => latestFired(wbLadder(r))

/** Days the reporter has been waiting — the number the Audit Committee asks for. */
export const daysOpen = (r: WhistleblowerReport): number =>
  Math.max(0, Math.round(((r.closedOn ? new Date(r.closedOn).getTime() : NOW_MS) - new Date(r.receivedAt).getTime()) / DAY))

// ── protection ───────────────────────────────────────────────────────────────

export type RetaliationState = 'Not applicable' | 'Watch active' | 'Review due' | 'Reviewed'

/** A retaliation watch that is never revisited is a box tick. Ninety days from
 *  the last review, it comes back. */
export function retaliationState(r: WhistleblowerReport): RetaliationState {
  if (!r.retaliationWatch) return 'Not applicable'
  if (!r.retaliationReviewedOn) return 'Watch active'
  return NOW_MS - new Date(r.retaliationReviewedOn).getTime() > 90 * DAY ? 'Review due' : 'Reviewed'
}

// ── portfolio ────────────────────────────────────────────────────────────────

export interface WbSummary {
  total: number
  open: number
  /** Reports the persona may actually open. */
  visible: number
  sealed: number
  acknowledgementBreached: number
  feedbackBreached: number
  substantiated: number
  substantiationRate: number
  convertedToFraud: number
  anonymousShare: number
  retaliationWatches: number
  medianDaysToClose: number
}

export function wbSummary(reports: WhistleblowerReport[], personId: string, role: RoleKey): WbSummary {
  const { open: visible, sealed } = partitionByAccess(reports, personId, role)
  const closed = reports.filter((r) => r.closedOn)
  const durations = closed.map(daysOpen).sort((a, b) => a - b)
  const decided = reports.filter((r) => r.outcome && r.outcome !== 'Withdrawn')
  const substantiated = reports.filter((r) => r.outcome === 'Substantiated' || r.outcome === 'Partially substantiated').length
  return {
    total: reports.length,
    open: reports.filter(isOpen).length,
    visible: visible.length,
    sealed: sealed.length,
    acknowledgementBreached: reports.filter((r) => acknowledgeState(r) === 'Breached').length,
    feedbackBreached: reports.filter((r) => isOpen(r) && feedbackState(r) === 'Breached').length,
    substantiated,
    substantiationRate: decided.length ? Math.round((substantiated / decided.length) * 100) : 0,
    convertedToFraud: reports.filter((r) => r.linkedFraudCaseId).length,
    anonymousShare: reports.length ? Math.round((reports.filter((r) => r.anonymous).length / reports.length) * 100) : 0,
    retaliationWatches: reports.filter((r) => r.retaliationWatch && isOpen(r)).length,
    medianDaysToClose: durations.length ? durations[Math.floor(durations.length / 2)] : 0,
  }
}

/** Reports by category — the pattern a board reads, and the reason a speak-up
 *  channel is risk intelligence rather than a complaints inbox. */
export function byCategory(reports: WhistleblowerReport[]): { category: string; count: number; substantiated: number }[] {
  const map = new Map<string, { count: number; substantiated: number }>()
  for (const r of reports) {
    const cur = map.get(r.category) ?? { count: 0, substantiated: 0 }
    cur.count++
    if (r.outcome === 'Substantiated' || r.outcome === 'Partially substantiated') cur.substantiated++
    map.set(r.category, cur)
  }
  return [...map.entries()].map(([category, v]) => ({ category, ...v })).sort((a, b) => b.count - a.count)
}

export const reportsForRisk = (riskId: string, all: WhistleblowerReport[] = WORLD.whistleblower): WhistleblowerReport[] =>
  all.filter((r) => r.linkedRiskIds.includes(riskId))

// ── queue ────────────────────────────────────────────────────────────────────

const severityFor = (r: WhistleblowerReport): Severity =>
  feedbackState(r) === 'Breached' || acknowledgeState(r) === 'Breached' ? 'Critical' : r.severity

/**
 * Speak-up work items. Access-gated at source: a persona who cannot open a case
 * never sees it in their queue, so the queue cannot become the leak the case
 * page prevents.
 */
export function wbQueueItems(role: RoleKey, selfId: string, all: WhistleblowerReport[] = WORLD.whistleblower): QueueTask[] {
  const out: QueueTask[] = []
  const push = (t: Omit<QueueTask, 'id'>) => out.push({ ...t, id: `Q-WB-${out.length + 1}` })

  for (const r of all) {
    if (!isOpen(r)) continue
    if (!accessTo(r, selfId, role).canOpen) continue

    if (!r.acknowledgedOn) {
      push({
        role,
        kind: 'Approval',
        title: `Acknowledge speak-up report ${r.reference}`,
        ref: r.id,
        route: `/whistleblower/${r.id}`,
        due: r.acknowledgeBy,
        priority: acknowledgeState(r) === 'Breached' ? 'Critical' : 'High',
      })
    }
    if (r.stage === 'Received' || r.stage === 'Acknowledged' || r.stage === 'Under triage') {
      push({
        role,
        kind: 'Approval',
        title: `Triage ${r.reference} — ${r.category.toLowerCase()}`,
        ref: r.id,
        route: `/whistleblower/${r.id}`,
        due: r.feedbackBy,
        priority: severityFor(r),
      })
    }
    if ((r.stage === 'Investigation' || r.stage === 'Awaiting outcome') && r.investigator && PEOPLE_BY_ID[r.investigator]?.role === role) {
      push({
        role,
        kind: 'Evidence request',
        title: `Conclude the investigation into ${r.reference}`,
        ref: r.id,
        route: `/whistleblower/${r.id}`,
        due: r.feedbackBy,
        priority: severityFor(r),
      })
    }
    if (retaliationState(r) === 'Watch active' || retaliationState(r) === 'Review due') {
      push({
        role,
        kind: 'Control re-test',
        title: `Retaliation check on ${r.reference}`,
        ref: r.id,
        route: `/whistleblower/${r.id}`,
        due: r.feedbackBy,
        priority: 'Medium',
      })
    }
  }
  return out
}

/** Fired rungs, for the tamper-evident log. Case ids only — no category, no
 *  summary, nothing that narrows who the reporter might be. */
export function wbAuditRows(all: WhistleblowerReport[] = WORLD.whistleblower): { id: string; at: string; actor: string; action: string; object: string; detail: string }[] {
  const rows: { id: string; at: string; actor: string; action: string; object: string; detail: string }[] = []
  let seq = 0
  for (const r of all) {
    for (const e of wbLadder(r)) {
      if (!e.fired) continue
      rows.push({
        id: `LOG-WB-${String(++seq).padStart(3, '0')}`,
        at: e.at,
        actor: 'system',
        action:
          e.kind === 'reminder'
            ? `${r.reference} — ${e.intervalLabel} reminder to the ethics office`
            : `${r.reference} feedback window at risk — escalated to ${e.targetRole}, ${e.intervalLabel}`,
        object: r.id,
        detail: `Stage ${r.stage} · ${daysOpen(r)} days open · feedback due ${r.feedbackBy.slice(0, 10)}`,
      })
    }
  }
  return rows
}
