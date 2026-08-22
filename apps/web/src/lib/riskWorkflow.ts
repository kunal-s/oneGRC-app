// The risk remediation workflow — derivation only, no state of its own.
//
// A risk's position on the workflow is DERIVED from its lifecycle record rather
// than stored, mirroring effectiveFinding (lib/effective.ts): the register and
// the detail page read the same function, so they cannot disagree.
//
// Two rules are load-bearing:
//   1. Actions gate approval. A treatment plan cannot reach "Awaiting approval"
//      while an action is still open — the execution layer is the gate.
//   2. Accept routes around execution into a time-bound acceptance that must be
//      signed off and always expires; an expired acceptance is not "accepted",
//      it is an open exception that escalates.
import type { Evidence, QueueTask, Risk, RiskAction, RiskStage, RoleKey, Severity, TimelineEvent } from '@/types'
import { WORLD, getControl } from '@/data'
import { PEOPLE_BY_ID } from '@/data/people'
import { NOW_MS } from '@/lib/time'
import { ladderFor, latestFired, type ReminderEvent } from '@/lib/reminders'
import { expiryState } from '@/lib/exceptions'

// ── action helpers ───────────────────────────────────────────────────────────

/** An action is overdue when it is past due and not finished. */
export function isActionOverdue(a: RiskAction): boolean {
  return a.status !== 'Done' && new Date(a.dueDate).getTime() < NOW_MS
}

/** The label to show for an action — 'Overdue' is derived, never stored. */
export function actionStatusLabel(a: RiskAction): string {
  return isActionOverdue(a) ? 'Overdue' : a.status
}

/** The 7/3/1-before / 1/3/7-overdue ladder for one action. Reuses the shared
 *  engine unchanged — an action is chased on its own due date like any task. */
export function actionLadder(a: RiskAction): ReminderEvent[] {
  return a.status === 'Done' ? [] : ladderFor(a.id, a.dueDate, a.owner, a.reviewer)
}

/** The most recent fired rung for an open action. */
export function actionFollowUp(a: RiskAction): ReminderEvent | undefined {
  return latestFired(actionLadder(a))
}

/** The ladder chasing the risk's own periodic review. */
export function reviewLadder(risk: Risk): ReminderEvent[] {
  const { ownership, approval } = risk.lifecycle
  return ladderFor(`${risk.id}-review`, ownership.nextReviewOn, risk.owner, approval.checker)
}

export function actionProgress(risk: Risk): { done: number; total: number; overdue: number } {
  const actions = risk.lifecycle.treatment.actions
  return {
    done: actions.filter((a) => a.status === 'Done').length,
    total: actions.length,
    overdue: actions.filter(isActionOverdue).length,
  }
}

/** Residual still to be removed once every open action lands. */
export function projectedResidual(risk: Risk): number {
  const open = risk.lifecycle.treatment.actions.filter((a) => a.status !== 'Done')
  const remaining = open.reduce((s, a) => s + a.residualContribution, 0)
  return Math.max(1, risk.residual - remaining)
}

// ── acceptance ───────────────────────────────────────────────────────────────

export type AcceptanceState = 'Active' | 'Expiring soon' | 'Expired' | 'Closed'

/** Acceptance is time-bound by design: it is never simply "accepted forever".
 *  Shares its expiry band with the exception register (lib/exceptions) so the
 *  two governance-by-expiry records age by the same rule. A risk acceptance
 *  carries a longer warning window than a control exception because its review
 *  cadence is quarterly at best. */
export function acceptanceState(risk: Risk): AcceptanceState | undefined {
  const acc = risk.lifecycle.acceptance
  if (!acc) return undefined
  return expiryState(acc.expiresOn, false, 30)
}

/** True when residual sits above the treatment target — the case that requires a
 *  formal acceptance decision rather than a silent gap. */
export function isAboveTarget(risk: Risk): boolean {
  return risk.residual > risk.lifecycle.treatment.targetResidual
}

// ── stage derivation ─────────────────────────────────────────────────────────

export const RISK_STAGES: RiskStage[] = [
  'Identified',
  'Assessed',
  'Treatment planned',
  'In execution',
  'Evidenced',
  'Under review',
  'Awaiting approval',
  'Monitoring',
]

export function deriveRiskStage(risk: Risk): RiskStage {
  const { treatment, review, approval, acceptance } = risk.lifecycle
  const actions = treatment.actions

  // Accept bypasses execution: the decision itself is the treatment, and it
  // stands or falls on its expiry.
  if (acceptance) {
    return acceptanceState(risk) === 'Expired' ? 'Exception expired' : 'Accepted'
  }

  if (approval.state === 'Approved') {
    return risk.status === 'Mitigated' && !isAboveTarget(risk) ? 'Closed' : 'Monitoring'
  }
  if (approval.state === 'Submitted') return 'Awaiting approval'
  if (review.outcome === 'Pending' && review.reviewedOn) return 'Under review'

  if (actions.length === 0) {
    return treatment.rationale ? 'Treatment planned' : 'Assessed'
  }
  const allDone = actions.every((a) => a.status === 'Done')
  if (allDone) {
    return actions.every((a) => a.evidenceIds.length > 0) ? 'Evidenced' : 'In execution'
  }
  if (actions.some((a) => a.status !== 'Not started')) return 'In execution'
  return 'Treatment planned'
}

/** How far along the eight-stage spine a risk sits (for the progress ribbon).
 *  Off-spine states (Accepted / Exception expired / Closed) map to their nearest
 *  position so the ribbon always renders. */
export function stageIndex(stage: RiskStage): number {
  if (stage === 'Closed') return RISK_STAGES.length - 1
  if (stage === 'Accepted' || stage === 'Exception expired') return RISK_STAGES.indexOf('Awaiting approval')
  const i = RISK_STAGES.indexOf(stage)
  return i < 0 ? 0 : i
}

export function stageTone(stage: RiskStage): 'ok' | 'warn' | 'danger' | 'info' {
  if (stage === 'Exception expired') return 'danger'
  if (stage === 'Accepted') return 'warn'
  if (stage === 'Monitoring' || stage === 'Closed') return 'ok'
  return 'info'
}

// ── evidence ─────────────────────────────────────────────────────────────────

/** Evidence supporting a risk: attached directly to its remediation actions,
 *  plus everything already filed against the controls that mitigate it.
 *  Evidence carries no risk link of its own — the traversal is the relationship. */
export function evidenceForRisk(risk: Risk, resolve?: (id: string) => Evidence | undefined): Evidence[] {
  const out = new Map<string, Evidence>()
  for (const a of risk.lifecycle.treatment.actions) {
    for (const id of a.evidenceIds) {
      const ev = resolve?.(id) ?? WORLD.evidence.find((e) => e.id === id)
      if (ev) out.set(ev.id, ev)
    }
  }
  for (const ev of WORLD.evidence) {
    if (ev.linkedControls.some((c) => risk.linkedControls.includes(c))) out.set(ev.id, ev)
  }
  return [...out.values()].sort((a, b) => new Date(b.capturedAt).getTime() - new Date(a.capturedAt).getTime())
}

/** The test results of the controls mitigating this risk — the assurance half of
 *  the evidence picture. */
export function controlAssuranceForRisk(risk: Risk) {
  return risk.linkedControls
    .map((id) => getControl(id))
    .filter((c): c is NonNullable<typeof c> => Boolean(c))
}

/** Audit findings closed against the controls that mitigate this risk. */
export function closureMemosForRisk(risk: Risk) {
  const out: { auditId: string; findingId: string; title: string; status: string; issueId?: string }[] = []
  const ref = risk.lifecycle.identification.ref
  for (const a of WORLD.audits) {
    for (const f of a.findings) {
      const linkedIssue = f.linkedIssue && risk.linkedIssues.includes(f.linkedIssue)
      if (linkedIssue || f.id === ref) {
        out.push({ auditId: a.id, findingId: f.id, title: f.title, status: f.status, issueId: f.linkedIssue })
      }
    }
  }
  return out
}

// ── audit trail ──────────────────────────────────────────────────────────────

// ── work queue ───────────────────────────────────────────────────────────────

/** Risk work items derived from live state, for the existing My Queue.
 *
 *  QueueTask['kind'] is a closed union with exhaustive display maps, so these
 *  reuse the shipped 'Approval' and 'Evidence request' kinds rather than
 *  widening it — a risk approval IS an approval.
 */
export function riskQueueItems(role: RoleKey, risks: Risk[]): QueueTask[] {
  const out: QueueTask[] = []
  const push = (t: Omit<QueueTask, 'id'>) => out.push({ ...t, id: `Q-RISK-${out.length + 1}` })

  for (const risk of risks) {
    const { approval, treatment, ownership } = risk.lifecycle

    // Awaiting approval -> the checker's queue.
    if (approval.state === 'Submitted' && roleOwns(role, approval.checker)) {
      push({
        role,
        kind: 'Approval',
        title: `Approve risk treatment plan for ${risk.id}`,
        ref: risk.id,
        route: `/risks/${risk.id}`,
        due: ownership.nextReviewOn,
        priority: severityForResidual(risk.residual),
      })
    }

    // Overdue or imminent remediation actions -> the owner's queue.
    for (const a of treatment.actions) {
      if (a.status === 'Done' || !roleOwns(role, a.owner)) continue
      const days = (new Date(a.dueDate).getTime() - NOW_MS) / 86400000
      if (days > 7) continue
      push({
        role,
        kind: 'Evidence request',
        title: `${days < 0 ? 'Overdue' : 'Due'} remediation action on ${risk.id} — ${a.title}`,
        ref: risk.id,
        route: `/risks/${risk.id}`,
        due: a.dueDate,
        priority: days < 0 ? 'High' : severityForResidual(risk.residual),
      })
    }

    // An acceptance past or near its expiry must be renewed, closed or escalated.
    const acc = acceptanceState(risk)
    if ((acc === 'Expired' || acc === 'Expiring soon') && roleOwns(role, risk.lifecycle.acceptance!.acceptedBy)) {
      push({
        role,
        kind: 'Approval',
        title: `${acc === 'Expired' ? 'Expired' : 'Expiring'} risk acceptance on ${risk.id} — renew, close or escalate`,
        ref: risk.id,
        route: `/risks/${risk.id}`,
        due: risk.lifecycle.acceptance!.expiresOn,
        priority: acc === 'Expired' ? 'Critical' : 'High',
      })
    }
  }
  return out
}

/** Which persona a person's work routes to (the queue is role-keyed, not
 *  person-keyed, matching how the seeded queue already works). */
function roleOwns(role: RoleKey, personId: string): boolean {
  const p = PEOPLE_BY_ID[personId]
  return p?.role === role
}

function severityForResidual(residual: number): Severity {
  return residual >= 15 ? 'Critical' : residual >= 10 ? 'High' : residual >= 5 ? 'Medium' : 'Low'
}

/** Fired reminder/escalation rows for risk remediation actions, in the shape the
 *  Settings audit log already renders. Sits alongside reminderAuditRows(). */
export function riskReminderAuditRows(): { id: string; at: string; actor: string; action: string; object: string; detail: string }[] {
  const rows: { id: string; at: string; actor: string; action: string; object: string; detail: string }[] = []
  let seq = 0
  for (const risk of WORLD.risks) {
    for (const a of risk.lifecycle.treatment.actions) {
      for (const e of actionLadder(a)) {
        if (!e.fired) continue
        rows.push({
          id: `LOG-RK-${String(++seq).padStart(3, '0')}`,
          at: e.at,
          actor: 'system',
          action:
            e.kind === 'reminder'
              ? `Reminder sent on remediation action ${a.id} — ${e.intervalLabel}`
              : `Remediation action ${a.id} escalated to ${e.targetRole} — ${e.intervalLabel}`,
          object: risk.id,
          detail: `${risk.title} · ${a.title}`,
        })
      }
    }
  }
  return rows
}

/** The lifecycle history plus every fired reminder/escalation on its actions,
 *  merged into one chronological trail. */
export function riskTimeline(risk: Risk): TimelineEvent[] {
  const events: TimelineEvent[] = [...risk.lifecycle.history]
  for (const a of risk.lifecycle.treatment.actions) {
    for (const e of actionLadder(a)) {
      if (!e.fired) continue
      events.push({
        at: e.at,
        actor: 'system',
        channel: 'OneGRC',
        kind: 'notify',
        text:
          e.kind === 'reminder'
            ? `Reminder sent on ${a.id} — ${e.intervalLabel}.`
            : `${a.id} escalated to ${e.targetRole} — ${e.intervalLabel}.`,
      })
    }
  }
  return events.sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime())
}
