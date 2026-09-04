/**
 * The seam's public surface.
 *
 * One named function per read and per write, named after what it does
 * (platform.md section 2). A screen calls a function here; it never builds a
 * URL and never touches `api.get`, `api.post` or `api.url` itself. Those three
 * stay in `client.ts`, internal to this module.
 */
import { api } from './client'
import type { ClauseDetail, InstrumentSummary, WhoAmI } from './types'
import type { InstrumentTriage, ProvisionDetail, ProvisionRow } from './provision-types'

export interface ControlOption {
  id: string
  shortTitle: string
  title: string
}

export interface ObligationDetailResponse {
  id: string
  title: string
  shortTitle: string
  regulator: string
  frequency: string
  evidenceRequirement: string | null
  owner: { fullName: string; department: string }
  checker: { fullName: string } | null
  provenance: { clauseId: string; clauseRef: string; instrument: string } | null
  controls: Array<{ id: string; shortTitle: string }>
  cycles: Array<{
    id: string
    period: string
    dueDate: string
    state: string
    overdue: boolean
    tasks: Array<{
      id: string
      shortTitle: string
      state: string
      completionPolicy: string
      assignee: string
      checker: string | null
      evidence: Array<{ id: string; shortTitle: string; state: string }>
    }>
  }>
}

export interface ApiControl {
  id: string
  title: string
  shortTitle: string
  description: string | null
  owner: { fullName: string; department: string }
  clausesByAct: Record<
    string,
    {
      instrument: string
      citation: string | null
      clauses: Array<{ id: string; clauseRef: string; shortTitle: string; pageNumber: number | null; instrumentId: string }>
    }
  >
  obligations: Array<{ id: string; shortTitle: string; regulator: string; frequency: string; cycleCount: number }>
}

export interface ChainNode {
  kind: string
  id: string
  label: string
  sub?: string
  route: string
  current: boolean
}

/** R-001: who am I acting as. */
export async function whoAmI(): Promise<WhoAmI> {
  return api.get<WhoAmI>('/whoami')
}

/** Mints a session for a named person. Refused outside `AUTH_MODE=dev`. */
export async function signInAs(email: string): Promise<void> {
  await api.post('/dev/impersonate', { email })
}

/** Ends the session server side. GAP-SCR-011-012, GAP-SCR-011-014. */
export async function signOut(): Promise<void> {
  await api.post('/auth/logout')
}

/** Where an unauthenticated visitor is sent, preserving the route they asked for. GAP-SCR-011-002. */
export function authLoginUrl(returnTo: string): string {
  return `${api.url('/auth/login')}?returnTo=${encodeURIComponent(returnTo)}`
}

export async function listInstruments(): Promise<InstrumentSummary[]> {
  return api.get<InstrumentSummary[]>('/instruments')
}

export async function getInstrument(id: string): Promise<InstrumentTriage> {
  return api.get<InstrumentTriage>(`/instruments/${id}`)
}

/** Absolute URL to an instrument's source document, for a link the browser follows itself. */
export function instrumentDocumentUrl(instrumentId: string): string {
  return api.url(`/instruments/${instrumentId}/document`)
}

export async function listProvisions(params: { instrumentId: string; classification?: string }): Promise<ProvisionRow[]> {
  const query = params.classification
    ? `instrumentId=${params.instrumentId}&classification=${params.classification}`
    : `instrumentId=${params.instrumentId}`
  return api.get<ProvisionRow[]>(`/provisions?${query}`)
}

export async function getProvision(id: string): Promise<ProvisionDetail> {
  return api.get<ProvisionDetail>(`/provisions/${id}`)
}

export async function promoteProvision(id: string, basis?: string): Promise<{ clauseId: string }> {
  return api.post<{ clauseId: string }>(`/provisions/${id}/promote`, { basis: basis || undefined })
}

export async function markProvisionNotApplicable(id: string, reason: string): Promise<void> {
  await api.post(`/provisions/${id}/not-applicable`, { reason })
}

export async function engageSpecialist(id: string): Promise<void> {
  await api.post(`/provisions/${id}/engage-specialist`, {})
}

/** Resolves a provision flag. Every call site today resolves with this same fixed outcome. */
export async function resolveProvisionFlag(flagId: string, note: string): Promise<void> {
  await api.post(`/provisions/flags/${flagId}/resolve`, { resolution: 'Resolved', note })
}

export async function getClause(id: string): Promise<ClauseDetail> {
  return api.get<ClauseDetail>(`/clauses/${id}`)
}

export async function saveClauseToControl(id: string, params: { newControlTitle?: string; basis?: string }): Promise<void> {
  await api.post(`/clauses/${id}/save-to-control`, {
    newControlTitle: params.newControlTitle || undefined,
    basis: params.basis || undefined,
  })
}

export async function createControlFromClause(
  clauseId: string,
  params: { controlId?: string; newControlTitle?: string; basis?: string },
): Promise<{ controlId: string }> {
  return api.post<{ controlId: string }>(`/clauses/${clauseId}/control`, {
    controlId: params.controlId,
    newControlTitle: params.controlId ? undefined : params.newControlTitle,
    basis: params.basis || undefined,
  })
}

export async function listControls(): Promise<ControlOption[]> {
  return api.get<ControlOption[]>('/controls')
}

export async function getControl(id: string): Promise<ApiControl> {
  return api.get<ApiControl>(`/controls/${id}`)
}

export async function getObligation(id: string): Promise<ObligationDetailResponse> {
  return api.get<ObligationDetailResponse>(`/obligations/${id}`)
}

/** R-013: the proof chain for a record, resolved identically from any anchor on the spine. */
export async function getProofChain(anchor: string): Promise<ChainNode[]> {
  return api.get<ChainNode[]>(`/proof-chain?anchor=${encodeURIComponent(anchor)}`)
}
