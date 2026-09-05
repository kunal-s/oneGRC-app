/**
 * The seam's public surface.
 *
 * One named function per read and per write, named after what it does
 * (platform.md section 2). A screen calls a function here; it never builds a
 * URL and never touches `api.get`, `api.post` or `api.url` itself. Those three
 * stay in `client.ts`, internal to this module.
 */
import { api } from './client'
import type { ClauseDetail, InstrumentSummary, ScopeResponse, WhoAmI } from './types'
import type { InstrumentTriage, ProvisionDetail, ProvisionRow } from './provision-types'

export interface ControlOption {
  id: string
  shortTitle: string
  title: string
}

/** SCR-049: one rung of the six, fired or scheduled or ended (LDR-009, LDR-066). */
export interface LadderRungResponse {
  offsetDays: number
  intervalLabel: string
  targetRoleLabel: string
  state: 'fired' | 'scheduled' | 'ended'
  moment: string
  recipients: string[]
  delivery: 'delivered' | 'retrying' | 'failed' | 'pending' | null
  unresolvedDepartment: string | null
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
    ladder: LadderRungResponse[]
    tasks: Array<{
      id: string
      shortTitle: string
      state: string
      completionPolicy: string
      /** SLICE-01D, CON-003: the version this read is at. */
      version: number
      assignee: string
      checker: string | null
      evidence: Array<{ id: string; shortTitle: string; state: string }>
      /** Null where the cycle carries only this one task: TIM-02 chases a genuinely multi-step duty, not the same duty twice. */
      ladder: LadderRungResponse[] | null
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

/** R-064: which department am I scoped to (SCR-088-012, SCR-088-013). */
export async function fetchScope(): Promise<ScopeResponse> {
  return api.get<ScopeResponse>('/scope')
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

/** expectedVersion is CON-004, SLICE-01D: the version the caller read the provision at. */
export async function promoteProvision(id: string, basis: string | undefined, expectedVersion: number): Promise<{ clauseId: string }> {
  return api.post<{ clauseId: string }>(`/provisions/${id}/promote`, { basis: basis || undefined, expectedVersion })
}

export async function markProvisionNotApplicable(id: string, reason: string, expectedVersion: number): Promise<void> {
  await api.post(`/provisions/${id}/not-applicable`, { reason, expectedVersion })
}

export async function engageSpecialist(id: string, expectedVersion: number): Promise<void> {
  await api.post(`/provisions/${id}/engage-specialist`, { expectedVersion })
}

/** Resolves a provision flag. Every call site today resolves with this same fixed outcome. */
export async function resolveProvisionFlag(flagId: string, note: string, expectedVersion: number): Promise<void> {
  await api.post(`/provisions/flags/${flagId}/resolve`, { resolution: 'Resolved', note, expectedVersion })
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
  params: { controlId?: string; newControlTitle?: string; basis?: string; expectedVersion: number },
): Promise<{ controlId: string }> {
  return api.post<{ controlId: string }>(`/clauses/${clauseId}/control`, {
    controlId: params.controlId,
    newControlTitle: params.controlId ? undefined : params.newControlTitle,
    basis: params.basis || undefined,
    expectedVersion: params.expectedVersion,
  })
}

/** SCR-088-090 to 092: filter, sort and paging parameters, and a count over the same filter. */
export async function listControls(params?: {
  department?: string
  sort?: string
  page?: number
  pageSize?: number
}): Promise<{ items: ControlOption[]; total: number }> {
  const q = new URLSearchParams()
  if (params?.department) q.set('department', params.department)
  if (params?.sort) q.set('sort', params.sort)
  if (params?.page) q.set('page', String(params.page))
  if (params?.pageSize) q.set('pageSize', String(params.pageSize))
  const qs = q.toString()
  return api.get<{ items: ControlOption[]; total: number }>(`/controls${qs ? `?${qs}` : ''}`)
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

export interface NotificationRow {
  id: string
  at: string
  title: string
  body: string | null
  severity: 'info' | 'warn' | 'critical'
  entityType: string | null
  entityId: string | null
  route: string | null
  rung: string | null
  sentTo: string | null
  channel: 'inApp' | 'email' | 'digest'
  delivery: 'delivered' | 'retrying' | 'failed' | 'pending'
  isUnread: boolean
}

export interface NotificationListParams {
  unreadOnly?: boolean
  limit?: number
  severity?: string
  rung?: string
  channel?: string
  delivery?: string
  read?: 'read' | 'unread'
  search?: string
  sort?: string
  page?: number
  pageSize?: number
}

/** R-007: fired reminders and escalations for the caller, with their delivery state. */
export async function listNotifications(params?: NotificationListParams): Promise<{ items: NotificationRow[]; total: number }> {
  const q = new URLSearchParams()
  if (params?.unreadOnly) q.set('unreadOnly', 'true')
  if (params?.limit) q.set('limit', String(params.limit))
  if (params?.severity) q.set('severity', params.severity)
  if (params?.rung) q.set('rung', params.rung)
  if (params?.channel) q.set('channel', params.channel)
  if (params?.delivery) q.set('delivery', params.delivery)
  if (params?.read) q.set('read', params.read)
  if (params?.search) q.set('search', params.search)
  if (params?.sort) q.set('sort', params.sort)
  if (params?.page) q.set('page', String(params.page))
  if (params?.pageSize) q.set('pageSize', String(params.pageSize))
  const qs = q.toString()
  return api.get<{ items: NotificationRow[]; total: number }>(`/notifications${qs ? `?${qs}` : ''}`)
}

/** SCR-083-012: opening the bell marks the rows it shows as read, kept from the prototype. */
export async function markNotificationsRead(): Promise<void> {
  await api.post('/notifications/mark-read')
}

/** LDR-091: the same tick the interval runs, on demand. Governed as `ladder.run`, Administrator only. */
export async function runLadderNow(): Promise<{ fired: number; auditId: string }> {
  return api.post<{ fired: number; auditId: string }>('/ladder/run')
}

export interface DepartmentHeadRow {
  department: string
  label: string
  head: { personId: string; fullName: string; jobTitle: string } | null
}

/** R-065: who heads each department, so escalation resolves to a name. */
export async function listDepartmentHeads(): Promise<DepartmentHeadRow[]> {
  return api.get<DepartmentHeadRow[]>('/department-heads')
}
