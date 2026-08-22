// Agentic runs (Phase 0.5) — SCRIPTED and deterministic, no model call.
//
// A run executes fixed steps over the live effective state (seed + session
// overrides) and returns a structured result: findings + proposed actions. The
// result is a PROPOSAL — nothing mutates on run. A role-gated user approves an
// action, which performs an EXISTING store mutation (approve-to-apply). Same
// inputs always produce the same result. Mirrors the copilot/ seam.
import { WORLD, getSource, getInstrument } from '@/data'
import { effectiveClause, type ClauseOverrides } from '@/lib/sources'
import type { Control, Regulator } from '@/types'

export interface AgentStep {
  label: string
}

export type ApplyOp =
  | { op: 'saveClauseToControl'; provisionId: string; controlId: string }
  | { op: 'createControlForClause'; provisionId: string; title: string; owner: string; frequency: string; description: string }
  | { op: 'addInstrumentChange'; instrumentId: string; kind: 'Circular' | 'New version'; title: string }

export interface ProposedAction {
  id: string
  label: string
  detail: string
  confidence: number // 0-100, non-round
  apply: ApplyOp
  recommended?: boolean
}

export interface AgentFinding {
  label: string
  value: string
  entityId?: string
  route?: string
}

export interface AgentRunResult {
  runId: string
  agent: string
  scopeId?: string
  scopeLabel?: string
  steps: AgentStep[]
  findings: AgentFinding[]
  proposedActions: ProposedAction[]
}

const STOP = new Set(['the', 'and', 'for', 'with', 'its', 'per', 'within', 'from', 'that', 'this', 'are', 'each', 'any'])
function tokens(s?: string): string[] {
  return (s ?? '').toLowerCase().split(/[^a-z0-9]+/).filter((t) => t.length > 2 && !STOP.has(t))
}

const OWNER_BY_REGULATOR: Partial<Record<Regulator, string>> = {
  Labour: 'farhan',
  DPDP: 'priya',
  'CERT-In': 'rajesh',
  PFRDA: 'arvind',
  GST: 'deepa',
  'Companies Act': 'vikram',
}

/** Run 2 — Clause -> control mapping. Ranks existing controls vs create-new. */
export function clauseMappingRun(provisionId: string, overrides: ClauseOverrides, sessionControls: Control[]): AgentRunResult | null {
  const base = getSource(provisionId)
  if (!base) return null
  const clause = effectiveClause(base, overrides)
  const inst = getInstrument(clause.instrumentId)

  const clauseTokens = new Set([
    ...tokens(clause.nameOfCompliance),
    ...tokens(clause.title),
    ...(clause.keyParts ?? []).flatMap(tokens),
  ])
  const all: Control[] = [...WORLD.controls, ...sessionControls]
  const ranked = all
    .map((c) => {
      const ct = new Set([...tokens(c.title), ...tokens(c.description)])
      let overlap = 0
      for (const t of clauseTokens) if (ct.has(t)) overlap++
      return { c, overlap }
    })
    .filter((x) => x.overlap > 0)
    .sort((a, b) => b.overlap - a.overlap)
    .slice(0, 2)

  // Deterministic, non-round confidence derived from the overlap + a stable jitter.
  const jitter = (provisionId.charCodeAt(provisionId.length - 1) % 9) / 10
  const conf = (overlap: number) => Number(Math.min(94, 52 + overlap * 11 + jitter).toFixed(1))

  const proposedActions: ProposedAction[] = ranked.map((r, i) => ({
    id: `${provisionId}-attach-${r.c.id}`,
    label: `Attach to ${r.c.id}`,
    detail: `${r.c.title} (${r.overlap} matching term${r.overlap === 1 ? '' : 's'})`,
    confidence: conf(r.overlap),
    apply: { op: 'saveClauseToControl', provisionId, controlId: r.c.id },
    recommended: i === 0,
  }))

  const owner = (inst?.regulator && OWNER_BY_REGULATOR[inst.regulator]) || 'anjali'
  proposedActions.push({
    id: `${provisionId}-create`,
    label: 'Create a new control from this clause',
    detail: `New "${clause.nameOfCompliance ?? clause.title}" control, owner ${owner}`,
    confidence: Number((44 + jitter).toFixed(1)),
    apply: {
      op: 'createControlForClause',
      provisionId,
      title: clause.nameOfCompliance ?? clause.title,
      owner,
      frequency: clause.frequency ?? 'Quarterly',
      description: clause.whatItMeans ?? clause.title,
    },
    recommended: ranked.length === 0,
  })

  const topTier = clause.penaltyTiers?.[clause.penaltyTiers.length - 1]
  return {
    runId: `RUN-MAP-${provisionId}`,
    agent: 'Clause → control mapping',
    scopeId: provisionId,
    scopeLabel: clause.title,
    steps: [
      { label: 'Read the clause, its penalty tiers and derived severity' },
      { label: 'Search the control library for an existing fit' },
      { label: 'Rank best-fit controls against creating a new one' },
    ],
    findings: [
      { label: 'Clause', value: `${clause.title}`, entityId: provisionId, route: `/sources/section/${provisionId}` },
      { label: 'Severity', value: clause.severity ?? 'n/a' },
      { label: 'Consequence', value: topTier ? topTier.consequence : 'n/a' },
      { label: 'Best existing fit', value: ranked[0] ? `${ranked[0].c.id} (${conf(ranked[0].overlap)}% confidence)` : 'none — create new recommended' },
    ],
    proposedActions,
  }
}

// The clauses showcased in the demo (Recommended, awaiting a mapping decision).
export const MAPPING_DEMO_CLAUSES = ['SRC-PT-4', 'SRC-DPDP-33']

/** Run 1 — Source scan. Detects newly-arrived instruments, assesses impact, and
 *  proposes registering a regulatory change (which alerts the affected owner). */
export function sourceScanRun(): AgentRunResult {
  const detected = WORLD.instruments.filter((i) => i.status === 'Draft')
  const impactByReg = (reg?: Regulator) => (reg ? WORLD.obligations.filter((o) => o.regulator === reg).length : 0)

  const proposedActions: ProposedAction[] = detected.slice(0, 4).map((inst, i) => {
    const impObl = impactByReg(inst.regulator)
    const jitter = (inst.id.charCodeAt(inst.id.length - 1) % 9) / 10
    return {
      id: `scan-${inst.id}`,
      label: `Register change on ${inst.id} & alert owner`,
      detail: `${inst.title} — assessed to affect ~${impObl} ${inst.regulator ?? ''} obligation(s)`,
      confidence: Number((Math.min(93, 70 + impObl + jitter)).toFixed(1)),
      apply: { op: 'addInstrumentChange', instrumentId: inst.id, kind: 'Circular', title: `Newly arrived: ${inst.title}` },
      recommended: i === 0,
    }
  })

  return {
    runId: 'RUN-SCAN',
    agent: 'Source scan',
    steps: [
      { label: 'Scan the source library for newly-arrived / changed instruments' },
      { label: 'Detect drafts not yet assessed' },
      { label: 'Assess impact on existing obligations and controls' },
    ],
    findings: [
      { label: 'Newly arrived', value: `${detected.length} instrument(s) flagged Draft` },
      ...detected.slice(0, 4).map((inst) => ({
        label: inst.regulator ?? 'Instrument',
        value: `${inst.id} — ${inst.title}`,
        entityId: inst.id,
        route: `/sources/${inst.id}`,
      })),
    ],
    proposedActions,
  }
}
