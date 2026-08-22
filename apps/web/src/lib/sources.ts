// Source & Provenance helpers (Sources pipeline: act → clause → control).
// Forward: a record's instrument sources. Reverse: a source resolves to the
// records that cite it. Plus the clause-pipeline status/applicability merge with
// session overrides, and the control "Satisfies" lookup (clauses across acts).
import { WORLD, getSource, getInstrument } from '@/data'
import { severityFromPenalty } from '@/data/sources'
import type { ClauseStatus, Evidence, Obligation, SourceInstrument, SourceProvision } from '@/types'
import { tasksForObligation, type Task, controlIdsForClause } from '@/lib/tasks'

export { getSource, getInstrument, severityFromPenalty }

export function allSources(): SourceProvision[] {
  return WORLD.sources
}

export function allInstruments(): SourceInstrument[] {
  return WORLD.instruments
}

/** The parent act/instrument of a clause (by id or object). */
export function instrumentForRef(ref: string | SourceProvision): SourceInstrument | undefined {
  const r = typeof ref === 'string' ? getSource(ref) : ref
  return r ? getInstrument(r.instrumentId) : undefined
}

/** Every clause belonging to an act, in seed order. */
export function provisionsForInstrument(instrumentId: string): SourceProvision[] {
  return WORLD.sources.filter((s) => s.instrumentId === instrumentId)
}

/** A display title for a clause: act title + clause title. */
export function refDisplayTitle(ref: string | SourceProvision): string {
  const r = typeof ref === 'string' ? getSource(ref) : ref
  if (!r) return typeof ref === 'string' ? ref : ''
  const inst = getInstrument(r.instrumentId)
  return inst ? `${inst.title} — ${r.title}` : r.title
}


// ── Clause pipeline (act → clause → control) ────────────────────────────────
// Session overrides from the Save / Engage-specialist actions (reset on reload).
export interface ClauseOverride {
  status?: ClauseStatus
  applicable?: boolean
  applicabilityBasis?: string
  linkedControlId?: string
  reviewer?: string
  reviewedAt?: string
  rationale?: string
  specialistNote?: string
}
export type ClauseOverrides = Record<string, ClauseOverride>

/** A clause merged with any session override. */
export function effectiveClause(p: SourceProvision, overrides: ClauseOverrides): SourceProvision {
  const o = overrides[p.id]
  return o ? { ...p, ...o } : p
}

/** A clause still awaiting a Save / specialist decision. */
export function awaitingDecision(status?: ClauseStatus): boolean {
  return status === 'Recommended' || status === 'Processing' || status === 'Specialist review'
}

/** StatusChip tone for a clause status — one consistent chip everywhere. */
export function statusTone(status: ClauseStatus): 'ok' | 'warn' | 'danger' | 'info' | 'progress' | 'neutral' {
  switch (status) {
    case 'Saved':
      return 'ok'
    case 'Recommended':
      return 'info'
    case 'Processing':
      return 'progress'
    case 'Specialist review':
      return 'warn'
    case 'Not applicable':
      return 'neutral'
  }
}

export interface InstrumentSummary {
  clauses: number // sections/clauses in the act
  reviewable: number // clauses that carry a pipeline status (statutory)
  applicable: number // clauses applicable to SPF
  saved: number // clauses saved to a control
  awaiting: number // clauses still awaiting a decision
}

/** Per-act rollup for the Source Library list, honouring overrides. */
export function instrumentSummary(instrumentId: string, overrides: ClauseOverrides): InstrumentSummary {
  const provisions = provisionsForInstrument(instrumentId)
  let reviewable = 0
  let applicable = 0
  let saved = 0
  let awaiting = 0
  for (const p0 of provisions) {
    const p = effectiveClause(p0, overrides)
    if (!p.status) continue
    reviewable++
    if (p.applicable) applicable++
    if (p.status === 'Saved') saved++
    else if (awaitingDecision(p.status)) awaiting++
  }
  return { clauses: provisions.length, reviewable, applicable, saved, awaiting }
}

/** A single act-level status chip for the list: Processing / In review / Tracked. */
export function actStatus(instrumentId: string, overrides: ClauseOverrides): 'Processing' | 'In review' | 'Tracked' | undefined {
  const provisions = provisionsForInstrument(instrumentId).map((p) => effectiveClause(p, overrides))
  const withStatus = provisions.filter((p) => p.status)
  if (withStatus.length === 0) return undefined // reference-only act (standards)
  if (withStatus.some((p) => p.status === 'Processing')) return 'Processing'
  if (withStatus.some((p) => awaitingDecision(p.status))) return 'In review'
  return 'Tracked'
}

/** Every clause saved to a control (effective linkedControlId === controlId),
 *  for the Control "Satisfies — clauses across acts" panel. */
export function clausesForControl(controlId: string, overrides: ClauseOverrides): SourceProvision[] {
  return WORLD.sources
    .map((p) => effectiveClause(p, overrides))
    .filter((p) => p.linkedControlId === controlId)
}

// ── Reverse lookups for the Source clause spine ────────────────────────────
// A clause resolves to the controls that satisfy it, the obligations that
// derive from it, the evidence that proves those, and the tasks that perform
// them. Used by ProofChain on /sources/section/:id.

/** Obligations whose sourceRefs cite this clause. */
export function obligationsForClause(clauseId: string): Obligation[] {
  return WORLD.obligations.filter((o) => o.sourceRefs?.includes(clauseId))
}

/** Evidence linked either to a control that satisfies the clause, or to an
 *  obligation that derives from it. Deduplicated. */
export function evidenceForClause(clauseId: string): Evidence[] {
  const controlIds = new Set(controlIdsForClause(clauseId))
  const oblIds = new Set(obligationsForClause(clauseId).map((o) => o.id))
  const seen = new Set<string>()
  const out: Evidence[] = []
  for (const e of WORLD.evidence) {
    const hit =
      e.linkedControls.some((c) => controlIds.has(c)) ||
      e.linkedObligations.some((o) => oblIds.has(o))
    if (hit && !seen.has(e.id)) {
      seen.add(e.id)
      out.push(e)
    }
  }
  return out
}

/** Tasks (across all obligations that cite the clause) whose clauseRefs include it.
 *  Falls back to all tasks of obligations linked to the clause when the per-task
 *  clauseRefs are empty (single-action obligations). */
export function tasksForClause(clauseId: string): Task[] {
  const out: Task[] = []
  for (const o of obligationsForClause(clauseId)) {
    const tasks = tasksForObligation(o)
    for (const t of tasks) {
      if (t.clauseRefs.length === 0 || t.clauseRefs.includes(clauseId)) out.push(t)
    }
  }
  return out
}
