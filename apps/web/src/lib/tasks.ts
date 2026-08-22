// Tasks — the actions that satisfy an obligation (enhancement plan 3 / spec 5.4).
//
// Every obligation is satisfied by one or more Tasks, each with a unique TSK id,
// its own maker and checker, due date, status, evidence and the source clause it
// discharges. Maker-checker, evidence and reminders/escalations are tracked HERE,
// at the task level, not duplicated on the obligation. A deduction-type duty (PT)
// has several tasks (its sub-steps); a single-action duty synthesises one task
// from the obligation itself, so the model is uniform.
import type { Obligation } from '@/types'
import { WORLD } from '@/data'
import { ladderFor, latestFired, type ReminderEvent } from '@/lib/reminders'

// Session-tracked two-step maker-checker for a task (E0.4). The maker attaches
// evidence; a different checker verifies it. Both actions carry actor + timestamp.
export interface TaskWorkflow {
  evidenceId?: string
  maker?: string // who actually attached the evidence
  makerAt?: string // ISO
  onBehalfOf?: string // set when a department head stepped in for the assigned owner (1.5)
  checker?: string // who verified
  checkerAt?: string // ISO
}

export interface Task {
  id: string // TSK id
  obligationId: string
  seq: number
  title: string
  clauseRefs: string[] // SourceProvision ids this task satisfies (TSK -> SRC)
  maker: string // who must complete it (assigned)
  checker: string // who verifies it (assigned)
  dueDate: string // ISO
  status: 'Done' | 'Pending' | 'Overdue'
  evidenceId?: string // proof, once done (kept for audit)
  // Explicit two-step trail (E0.4): who did each step and when.
  attachedBy?: string
  attachedAt?: string
  attachedOnBehalfOf?: string // the owner the head stepped in for (E0.5)
  verifiedBy?: string
  verifiedAt?: string
}

// Stable, readable TSK ids precomputed from the seed. Session-only obligations
// (recurring instances) fall back to a derived id.
const TSK_IDS = new Map<string, string>()
;(() => {
  let seq = 0
  for (const o of WORLD.obligations) {
    const n = o.subSteps?.length ?? 1
    for (let i = 1; i <= n; i++) TSK_IDS.set(`${o.id}#${i}`, `TSK-2026-${String(++seq).padStart(4, '0')}`)
  }
})()
const tskId = (obligationId: string, seq: number) => TSK_IDS.get(`${obligationId}#${seq}`) ?? `TSK-${obligationId}-${seq}`

const statusFromObligation = (s: Obligation['status']): Task['status'] =>
  s === 'Filed' ? 'Done' : s === 'Overdue' ? 'Overdue' : 'Pending'

/** The tasks that satisfy an obligation (its sub-steps, or one synthesised task).
 *  `workflow` overlays the session two-step maker-checker (evidence + verify). */
export function tasksForObligation(o: Obligation, workflow?: Record<string, TaskWorkflow>): Task[] {
  const apply = (base: Omit<Task, 'evidenceId' | 'attachedBy' | 'attachedAt' | 'verifiedBy' | 'verifiedAt'>, seedEvidence?: string): Task => {
    const wf = workflow?.[base.id]
    const evidenceId = wf?.evidenceId ?? seedEvidence
    // A session-verified task is Done; otherwise its seed status stands.
    const status: Task['status'] = wf?.checkerAt ? 'Done' : base.status
    return {
      ...base,
      status,
      evidenceId,
      attachedBy: wf?.maker,
      attachedAt: wf?.makerAt,
      attachedOnBehalfOf: wf?.onBehalfOf,
      verifiedBy: wf?.checker,
      verifiedAt: wf?.checkerAt,
    }
  }
  if (o.subSteps && o.subSteps.length) {
    return o.subSteps.map((st) =>
      apply(
        {
          id: tskId(o.id, st.seq),
          obligationId: o.id,
          seq: st.seq,
          title: st.title,
          clauseRefs: st.clauseRef ? [st.clauseRef] : [],
          maker: st.maker,
          checker: st.checker,
          dueDate: st.dueDate,
          status: st.status,
        },
        st.evidenceId,
      ),
    )
  }
  return [
    apply(
      {
        id: tskId(o.id, 1),
        obligationId: o.id,
        seq: 1,
        title: o.requirement ?? `Complete and file: ${o.title}`,
        clauseRefs: o.sourceRefs ?? [],
        maker: o.makerChecker.maker,
        checker: o.makerChecker.checker,
        dueDate: o.dueDate,
        status: statusFromObligation(o.status),
      },
      o.evidence[0],
    ),
  ]
}

/** Control ids that satisfy a given source clause (clause -> control, for the chain). */
export function controlIdsForClause(clauseId: string): string[] {
  return WORLD.controls
    .filter((c) => c.sourceRefs?.includes(clauseId) || c.mappedFrameworkRefs.some((m) => m.sourceRef === clauseId))
    .map((c) => c.id)
}

/** The control(s) a task ultimately maps to, via the clauses it satisfies. */
export function controlIdsForTask(t: Task): string[] {
  return Array.from(new Set(t.clauseRefs.flatMap(controlIdsForClause)))
}

/** The most recent fired reminder/escalation for an open task (its own ladder). */
export function taskFollowUp(t: Task): ReminderEvent | undefined {
  if (t.status === 'Done') return undefined
  return latestFired(ladderFor(t.id, t.dueDate, t.maker, t.checker))
}
