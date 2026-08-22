// Audit programme derivations — plan-vs-actual and the paper/finding chain.
//
// Everything here is computed from the plan and the papers, never stored, so the
// audit committee's "how much of the plan did we deliver" number cannot drift
// from the plan rows it summarises.
import type { AuditPlanEntry, WorkingPaper } from '@/types'
import { WORLD } from '@/data'

export interface PlanProgress {
  total: number
  complete: number
  inProgress: number
  planned: number
  deferred: number
  /** Complete as a share of everything that is no longer merely planned. */
  deliveredPct: number
  neverAudited: number
  highPriorityOpen: number
}

export function planProgress(plan: AuditPlanEntry[] = WORLD.auditPlan): PlanProgress {
  const complete = plan.filter((e) => e.status === 'Complete').length
  const inProgress = plan.filter((e) => e.status === 'In progress').length
  const deferred = plan.filter((e) => e.status === 'Deferred').length
  const planned = plan.filter((e) => e.status === 'Planned').length
  // Delivery is measured against what should have started by now — counting
  // future quarters as "not delivered" would understate the team every April.
  const started = complete + inProgress + deferred
  return {
    total: plan.length,
    complete,
    inProgress,
    planned,
    deferred,
    deliveredPct: started ? Math.round((complete / started) * 100) : 0,
    neverAudited: plan.filter((e) => !e.lastAudited).length,
    highPriorityOpen: plan.filter((e) => e.priority === 'High' && e.status !== 'Complete').length,
  }
}

export interface QuarterCoverage {
  quarter: 'Q1' | 'Q2' | 'Q3' | 'Q4'
  total: number
  complete: number
  inProgress: number
  planned: number
  deferred: number
}

export function quarterCoverage(plan: AuditPlanEntry[] = WORLD.auditPlan): QuarterCoverage[] {
  return (['Q1', 'Q2', 'Q3', 'Q4'] as const).map((quarter) => {
    const rows = plan.filter((e) => e.plannedQuarter === quarter)
    return {
      quarter,
      total: rows.length,
      complete: rows.filter((e) => e.status === 'Complete').length,
      inProgress: rows.filter((e) => e.status === 'In progress').length,
      planned: rows.filter((e) => e.status === 'Planned').length,
      deferred: rows.filter((e) => e.status === 'Deferred').length,
    }
  })
}

// ── Working papers ───────────────────────────────────────────────────────────

export const papersForAudit = (auditId: string, all: WorkingPaper[] = WORLD.workingPapers) =>
  all.filter((p) => p.auditId === auditId)

export interface PaperSummary {
  total: number
  pass: number
  fail: number
  partial: number
  notApplicable: number
  /** Failed steps with no finding raised — the gap the committee asks about. */
  unescalated: number
  withEvidence: number
}

export function paperSummary(papers: WorkingPaper[]): PaperSummary {
  return {
    total: papers.length,
    pass: papers.filter((p) => p.result === 'Pass').length,
    fail: papers.filter((p) => p.result === 'Fail').length,
    partial: papers.filter((p) => p.result === 'Partial').length,
    notApplicable: papers.filter((p) => p.result === 'Not applicable').length,
    unescalated: papers.filter((p) => p.result === 'Fail' && !p.findingId).length,
    withEvidence: papers.filter((p) => p.evidenceIds.length > 0).length,
  }
}

/** Every failed step across the programme that has not been escalated. */
export function unescalatedFailures(all: WorkingPaper[] = WORLD.workingPapers): WorkingPaper[] {
  return all.filter((p) => p.result === 'Fail' && !p.findingId)
}

/** The paper a finding was raised from, if any — the reverse of the chain. */
export function paperForFinding(findingId: string, all: WorkingPaper[] = WORLD.workingPapers): WorkingPaper | undefined {
  return all.find((p) => p.findingId === findingId)
}
