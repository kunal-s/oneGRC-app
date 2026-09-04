import { create } from 'zustand'
import type {
  Control, RoleKey, Obligation, Issue, Incident, RegulatoryChange, Dsar, Evidence,
  SourceInstrument, SourceProvision, Department, Risk, RiskAction, TimelineEvent, LossEvent,
  WorkingPaper, AuditFinding, Campaign, CampaignTask, CampaignType, Vendor,
  WhistleblowerReport, FraudCase, FraudRegulatoryTrack, Severity,
} from '@/types'
import type { ExtractedAct } from '@/lib/sources/ingest'
import { ROLES, PEOPLE, PEOPLE_BY_ID, checkerFor, COMPLIANCE_OFFICER, CRO } from '@/data/people'
import type { ViewOption } from '@/api/types'
import { roleKeysForView } from '@/lib/views'
import { WORLD, getSource, getObligation, getControl, getRegChange, getIncident, getIssue, getAudit, getDsar, getRisk, getInstrument, getEvidence, getPolicy, getVendor, getReport, getFraudCase, MARQUEE } from '@/data'
import { provisionsForInstrument } from '@/lib/sources'
import { dsarTotalSteps } from '@/lib/dsar'
import { personName } from '@/data/people'
import { nextInstance } from '@/lib/recurrence'
import { escalationSeedNotifications } from '@/lib/reminders'
import { applyRcsa, asRcsa, rcsaDelta } from '@/lib/rcsa'
import { asAttestation, exceptionFromDeclaration } from '@/lib/attestation'
import { applyVendorDd, asVendorDd, vendorDdDelta } from '@/lib/vendors'
import { ETHICS_OFFICE, buildRemediationIssue, remediationDays } from '@/lib/investigations'
import type { TaskWorkflow } from '@/lib/tasks'
import type { AgentRunResult, ProposedAction } from '@/lib/agents'
import type { PackAudience, PackFormat } from '@/lib/packs'

/** A recorded control test (Epic 2.3). Session re-tests prepend to the seeded history. */
export interface TestRun {
  at: string // ISO
  result: 'Pass' | 'Fail' | 'Partial'
  method: string
  tester: string // person id
  note: string
}
import type { ClauseOverride, ClauseOverrides } from '@/lib/sources'
import { NOW, minsFromNow } from '@/lib/time'

/**
 * Tamper-evident session audit log entry (Epic 1.3). Every typed workflow action
 * appends one via recordAction; the Settings audit log shows these alongside the
 * seeded history. Append-only; resets on reload.
 */
export interface AuditEntry {
  id: string
  at: string // ISO
  actor: string // person id or 'system'
  action: string
  entityId?: string
  route?: string
  detail?: string
}

/** The submit -> verify lifecycle carried by an evidence artifact (E3.3). */
export interface EvidenceWorkflow {
  status: 'Submitted' | 'Verified'
  submittedBy?: string
  submittedAt?: string
  verifiedBy?: string
  verifiedAt?: string
}

/** A user notification (Epic 1.3). Seeded baseline + session appends. */
export interface NotificationItem {
  id: string
  at: string // ISO
  title: string
  body?: string
  severity: 'info' | 'warn' | 'critical'
  entityId?: string
  route?: string
  read: boolean
}

// A small seeded baseline so the notification bell is never empty (no empty
// states). Timestamps derive from the frozen NOW. Session events prepend.
// The most recent fired escalations (E0.2) are folded in so the bell reflects the
// reminder/escalation engine, not just static items.
const SEED_NOTIFICATIONS: NotificationItem[] = [
  ...escalationSeedNotifications(3).map((n, i) => ({ ...n, id: `NTF-esc-${i + 1}`, read: false })),
  { id: 'NTF-seed-1', at: minsFromNow(-8), title: 'CERT-In 6-hour clock at risk', body: 'INC-2026-0411 Annexure I awaiting sign-off.', severity: 'critical', entityId: 'INC-2026-0411', route: '/incidents/INC-2026-0411', read: false },
  { id: 'NTF-seed-2', at: minsFromNow(-41), title: 'Patch-SLA CCM rule failing', body: '3 critical CVEs past the 14-day window.', severity: 'warn', entityId: 'CTRL-PCI-6.3.3', route: '/ccm', read: false },
  { id: 'NTF-seed-3', at: minsFromNow(-126), title: 'GSTR-3B Table 4 change ingested', body: 'Reg-change RCM-2026-118 impacts the monthly GST return.', severity: 'warn', entityId: 'RCM-2026-118', route: '/reg-change/RCM-2026-118', read: false },
  { id: 'NTF-seed-4', at: minsFromNow(-205), title: '9 obligations overdue', body: 'Remediation plan pending approval.', severity: 'info', entityId: undefined, route: '/obligations', read: true },
]

export interface Toast {
  id: string
  title: string
  description?: string
  variant?: 'default' | 'success' | 'info' | 'critical'
}

export interface DrawerState {
  open: boolean
  kind: 'cert-in-report' | 'pfrda-notify' | 'dpdp-track' | 'evidence-upload' | 'evidence-view' | 'export-pdf' | 'source-viewer' | 'generic' | null
  title?: string
  payload?: unknown
}

/**
 * Session-held artifact model (design seam — Epic 1; UI wired in Epic 10).
 * Generated templates and uploaded evidence live here in-memory and reset on
 * reload — no persistence, no backend.
 */
export interface Artifact {
  id: string
  kind: 'template' | 'evidence' | 'report'
  title: string
  createdAt: string // ISO
  payload?: unknown
}

interface AppState {
  role: RoleKey
  personId: string // the active persona (1.1 / E0.5) — drives the access boundary
  setRole: (role: RoleKey) => void
  /** Select a persona. `role` overrides the person's own functional role — a
   *  committee chair is the same person under a different mandate. */
  setPersona: (personId: string, role?: RoleKey) => void
  currentPersonId: () => string

  // ── The switcher as a view selector over held roles (SLICE-01B, D-045) ──────
  // `role` above stays the single representative RoleKey every existing screen
  // already reads. `roles` is every RoleKey the CURRENT altitude covers: more
  // than one when the person's functional roles are merged into one view
  // (SCR-082-057), for the nav and the queue, which must union them rather
  // than read the representative role alone.
  roles: RoleKey[]
  /** The selected view's key from R-001, or null before the session hydrates. */
  viewKey: string | null
  /** The real signed-in person's id last hydrated from the server, so a
   *  same-person re-render never resets a manually selected view. */
  _sessionPersonId: string | null
  /** Selecting a view changes altitude only. It never changes the acting
   *  person and mints no new session. SCR-082-055, SCR-082-056. */
  setView: (view: ViewOption) => void
  /** Seeds personId + the default view from the real session (R-001). A
   *  persona switch must never confer access (FRD 4.3): the switcher itself
   *  cannot call this, only the identity gate that reads the server. */
  hydrateIdentity: (who: { personId: string; fullName: string; views: ViewOption[] }) => void

  toasts: Toast[]
  pushToast: (t: Omit<Toast, 'id'>) => void
  dismissToast: (id: string) => void

  drawer: DrawerState
  openDrawer: (d: Omit<DrawerState, 'open'>) => void
  closeDrawer: () => void

  commandOpen: boolean
  setCommandOpen: (v: boolean) => void

  // ── Agentic runs (Phase 0.5) — Agents tab in the embedded Copilot panel ──────
  // Runs are deterministic proposals; approving an action reuses an existing
  // mutation (approve-to-apply). Each run and approval is audit-trailed.
  agentRuns: AgentRunResult[]
  recordAgentRun: (r: AgentRunResult) => void
  approveAgentAction: (run: AgentRunResult, action: ProposedAction) => void

  artifacts: Artifact[]
  addArtifact: (a: Omit<Artifact, 'id'>) => string
  getArtifact: (id: string) => Artifact | undefined

  // Sources pipeline (act → clause → control) — session overrides on a clause's
  // status/applicability, and the session controls minted by "create new".
  clauseOverrides: ClauseOverrides
  sessionControls: Control[]
  getSessionControl: (id: string) => Control | undefined
  // Save a clause to an existing control — adds it to that control's Satisfies.
  saveClauseToControl: (provisionId: string, controlId: string) => void
  // Create a new control from a clause and save the clause to it. Returns the id.
  createControlForClause: (provisionId: string, c: { title: string; owner: string; frequency: string; nextDue?: string; description?: string }) => string
  // Route an unclear clause to an external specialist for an interpretation.
  engageSpecialist: (provisionId: string) => void
  // Record the specialist's outcome so Save is enabled.
  completeSpecialist: (provisionId: string, note: string) => void
  // Officer override of applicability (applicable / not applicable).
  setClauseApplicability: (provisionId: string, applicable: boolean, basis?: string) => void

  // ── AI-assisted Source Act creation (E0.6 / 1.6) ────────────────────────────
  // The accepted act + clauses become session-held tracked sources, routed to
  // departments. Every step is audit-trailed. Role-gated in the UI to Compliance.
  sessionInstruments: SourceInstrument[]
  sessionProvisions: SourceProvision[]
  createSourceAct: (args: { extracted: ExtractedAct; acceptedIdx: number[]; departments: Department[]; entry: 'url' | 'upload' }) => string

  // ── Generalised session-mutation layer (Epic 1.1) ───────────────────────────
  // Each slice holds per-id partial overrides merged over the seed on read via
  // src/lib/effective.ts. Pipeline/workflow actions write here only; the seed is
  // never mutated, so a reload restores the pristine demo. Typed workflow actions
  // (submit/approve/re-test/...) live in their epics and call these patchers.
  obligationOverrides: Record<string, Partial<Obligation>>
  controlOverrides: Record<string, Partial<Control>>
  issueOverrides: Record<string, Partial<Issue>>
  incidentOverrides: Record<string, Partial<Incident>>
  regChangeOverrides: Record<string, Partial<RegulatoryChange>>
  dsarOverrides: Record<string, Partial<Dsar>>
  riskOverrides: Record<string, Partial<Risk>>
  // Session-appended recurring obligation instances (Epic 2.2 schedules these).
  sessionObligations: Obligation[]
  // Session-raised issues — today only exception requests, which mint a new
  // Issue rather than patching an existing one.
  sessionIssues: Issue[]
  // Session-registered regulatory changes (a new circular / version on an Act).
  sessionRegChanges: RegulatoryChange[]
  addInstrumentChange: (instrumentId: string, kind: 'Circular' | 'New version', title: string) => string

  patchObligation: (id: string, patch: Partial<Obligation>) => void
  patchControl: (id: string, patch: Partial<Control>) => void
  patchIssue: (id: string, patch: Partial<Issue>) => void
  patchIncident: (id: string, patch: Partial<Incident>) => void
  patchRegChange: (id: string, patch: Partial<RegulatoryChange>) => void
  patchDsar: (id: string, patch: Partial<Dsar>) => void
  patchRisk: (id: string, patch: Partial<Risk>) => void
  addSessionObligation: (o: Obligation) => void
  addSessionIssue: (i: Issue) => void

  // ── Governance primitives (Epic 1.3) ────────────────────────────────────────
  auditLog: AuditEntry[]
  notifications: NotificationItem[]
  recordAction: (e: Omit<AuditEntry, 'id' | 'at' | 'actor'> & { actor?: string }) => void
  notify: (n: Omit<NotificationItem, 'id' | 'at' | 'read'>) => void
  markNotificationsRead: () => void

  // ── Task two-step maker-checker (E0.3 maker / E0.4 checker) ──────────────────
  // The maker creates+links an Evidence record; a DIFFERENT checker verifies it.
  // Each step records its actor + timestamp; session-only, merged on read.
  sessionEvidence: Evidence[]
  taskWorkflow: Record<string, TaskWorkflow> // tskId -> { evidenceId, maker, makerAt, checker, checkerAt }
  getAnyEvidence: (id: string) => Evidence | undefined
  attachTaskEvidence: (args: { taskId: string; obligationId: string; controlId?: string; title: string; type: Evidence['type']; onBehalfOf?: string }) => string
  verifyTask: (args: { taskId: string; obligationId: string }) => void

  // ── Evidence lifecycle (E3.3) ───────────────────────────────────────────────
  // Evidence is the artifact with one submit -> verify lifecycle. The maker
  // submits (attach); a different checker verifies (separation of duties). Seed
  // evidence is historical (Verified); session-created evidence is Submitted.
  evidenceWorkflow: Record<string, EvidenceWorkflow>
  getEvidenceStatus: (id: string) => 'Submitted' | 'Verified'
  verifyEvidence: (evidenceId: string) => void
  // Context for the "attach evidence" screen (what the new evidence will prove).
  evidenceDraft: { taskId?: string; obligationId?: string; controlId?: string; onBehalfOf?: string } | null
  setEvidenceDraft: (d: { taskId?: string; obligationId?: string; controlId?: string; onBehalfOf?: string } | null) => void
  // Manual evidence upload (e.g. the Evidence Vault "Attach" action) — creates a
  // real session evidence record so the submit is not a no-op.
  addManualEvidence: (args?: { title?: string; type?: Evidence['type']; obligationId?: string; controlId?: string }) => string

  // ── Obligation workflow (Epic 2.1) ──────────────────────────────────────────
  // Maker submits, a different checker approves; status advances via overrides and
  // the action is written to the audit log + notifications. On approval the next
  // recurring instance is scheduled (Epic 2.2).
  submitObligation: (id: string) => void
  approveObligation: (id: string) => void

  // ── Control test/re-test (Epic 2.3) ─────────────────────────────────────────
  controlTests: Record<string, TestRun[]>
  retestControl: (id: string, opts?: { result?: TestRun['result']; method?: string; note?: string }) => void

  // ── Regulatory change (Epic 3.1) ────────────────────────────────────────────
  acknowledgeRegChange: (id: string) => void

  // ── Incident regulator-track filing (Epic 3.2) ──────────────────────────────
  fileIncidentTrack: (incidentId: string, trackIndex: number) => void

  // ── Operational-risk loss events ────────────────────────────────────────────
  // Net loss is never passed in — it is derived from gross and recovery.
  setIncidentLossEvent: (incidentId: string, le: LossEvent | undefined) => void

  // ── Issue remediation + audit findings (Epic 3.3) ───────────────────────────
  resolveIssue: (id: string) => void
  bulkSetIssueStatus: (ids: string[], status: Issue['status']) => void
  closeFinding: (auditId: string, findingId: string) => void

  // ── DSAR erasure-vs-retention workflow (Epic 4.2) ───────────────────────────
  advanceDsar: (id: string) => void
  flagDsarBreach: (id: string) => void

  // ── Risk remediation workflow ───────────────────────────────────────────────
  // Advancing an action moves residual toward target, so the register cannot
  // show progress that the execution layer has not actually delivered.
  advanceRiskAction: (riskId: string, actionId: string) => void
  submitRiskTreatment: (riskId: string) => void
  approveRiskTreatment: (riskId: string) => void
  returnRiskTreatment: (riskId: string, note?: string) => void
  acceptRisk: (riskId: string, args: { rationale: string; expiresOn: string; compensatingControlId?: string }) => void

  // ── Exception register ──────────────────────────────────────────────────────
  // A deviation is raised against a control or an obligation, approved by a
  // different person, and always expires. Renewal and closure are explicit acts.
  raiseException: (args: {
    refId: string
    refTitle: string
    reason: string
    compensatingControl?: string
    expiresOn: string
    severity: Issue['severity']
    approvedBy: string
  }) => string
  approveException: (issueId: string, approve: boolean) => void
  renewException: (issueId: string, expiresOn: string) => void
  closeException: (issueId: string) => void

  // ── Board / committee reporting packs ───────────────────────────────────────
  // Draft -> approve -> issue. The narrative is maker-checked before the pack can
  // be issued, and issuing files it as evidence against the committee-meeting
  // obligation's task, so producing the pack discharges the duty.
  packs: GeneratedPack[]
  draftPack: (args: {
    audience: PackAudience
    period: string
    sectionIds: string[]
    format: PackFormat
    narrative: string
    obligationId?: string
    taskId?: string
    evidencedControls: string[]
  }) => string
  approvePackNarrative: (packId: string, approve: boolean) => void
  issuePack: (packId: string) => void
  getPack: (packId: string) => GeneratedPack | undefined

  // ── Audit working papers ────────────────────────────────────────────────────
  // Session overrides on papers (a paper is amended when a finding is raised
  // from it), plus the escalation itself.
  paperOverrides: Record<string, Partial<WorkingPaper>>
  /** Findings minted this session from a failed paper, keyed by audit id. */
  sessionFindings: Record<string, AuditFinding[]>
  /**
   * Escalate a failed working paper. Creates the finding AND its remediation
   * issue through the same finding -> issue chain the seeded findings use, then
   * stamps the paper with the finding it produced.
   */
  raiseFindingFromPaper: (paperId: string) => string | undefined

  // ── Campaigns ───────────────────────────────────────────────────────────────
  // The shared fan-out container. Overrides carry session state on seeded
  // campaigns; sessionCampaigns holds ones launched in-session.
  campaignOverrides: Record<string, Partial<Campaign>>
  sessionCampaigns: Campaign[]

  // ── Speak-up and fraud ──────────────────────────────────────────────────────
  // Two registers under one override layer. Every mutation records who did it;
  // nothing here can write a reporter's identity because the type has no field
  // for one.
  reportOverrides: Record<string, Partial<WhistleblowerReport>>
  fraudOverrides: Record<string, Partial<FraudCase>>
  sessionReports: WhistleblowerReport[]
  sessionFraudCases: FraudCase[]
  /** Anonymous intake. Returns the reference code — the reporter's only handle. */
  fileReport: (args: {
    channel: WhistleblowerReport['channel']
    category: WhistleblowerReport['category']
    severity: WhistleblowerReport['severity']
    summary: string
    allegationAgainst: string
    anonymous: boolean
    /** True = the reporter chose to identify. The identity itself is never
     *  passed in, only the fact that custody exists. */
    identityHeld?: boolean
    retaliationWatch: boolean
  }) => string
  acknowledgeReport: (id: string) => void
  triageReport: (id: string, args: { accept: boolean; investigator?: string; note: string }) => void
  /** Convert a report into a fraud case, carrying the reference code and
   *  nothing else. Returns the new case id. */
  convertReportToFraud: (id: string, args: { title: string; scheme: FraudCase['scheme']; estimatedLossLakh: number; investigator: string }) => string | undefined
  messageReporter: (id: string, text: string) => void
  reviewRetaliation: (id: string) => void
  closeReport: (id: string, args: { outcome: WhistleblowerReport['outcome']; note: string }) => void
  /** Raise remediation into the shared Issues register from either module. */
  raiseCaseRemediation: (caseId: string, args: { title: string; owner: string; severity: Severity; linkedControls?: string[] }) => string | undefined
  /** Push a substantiated outcome into the enterprise risk register. */
  linkCaseToRisk: (caseId: string, riskId: string) => void

  advanceFraudCase: (id: string, stage: FraudCase['stage'], note?: string) => void
  fileFraudTrack: (id: string, regulator: FraudRegulatoryTrack['regulator'], reference: string) => void
  recordFraudLoss: (id: string, args: { confirmedLossLakh: number; recoveredLakh: number; accountingRef?: string }) => void
  closeFraudCase: (id: string, args: { outcome: FraudCase['outcome']; note: string; disciplinaryAction?: string; recoveryAction?: string }) => void

  // ── Third parties ───────────────────────────────────────────────────────────
  // The seed is never mutated; a re-rating or an exit decision lands here.
  vendorOverrides: Record<string, Partial<Vendor>>
  patchVendor: (id: string, patch: Partial<Vendor>) => void
  launchCampaign: (args: {
    type: CampaignType
    title: string
    period: string
    dueOn: string
    objectIds: string[]
    assigneeFor: (objectId: string) => string
    obligationId?: string
  }) => string
  submitCampaignTask: (campaignId: string, taskId: string, response: Record<string, unknown>) => void
  reviewCampaignTask: (campaignId: string, taskId: string, approve: boolean, note?: string) => void
  closeCampaign: (campaignId: string) => void
}

/** A pack drafted this session. Reset on reload like every other session record. */
export interface GeneratedPack {
  id: string
  audience: PackAudience
  period: string
  sectionIds: string[]
  format: PackFormat
  narrative: string
  /** The narrative is the only authored content in a pack, so it is the thing
   *  that carries the maker-checker gate. */
  narrativeState: 'Draft' | 'Approved' | 'Returned'
  preparedBy: string
  preparedAt: string
  approvedBy?: string
  approvedOn?: string
  issuedAt?: string
  evidenceId?: string
  /** The committee-meeting obligation and task the issued pack discharges. */
  obligationId?: string
  taskId?: string
  evidencedControls: string[]
}

let toastSeq = 0
let artifactSeq = 0
let sessionControlSeq = 0
let auditSeq = 0
let notifSeq = 0
let regChangeSeq = 0
let evidenceSeq = 0
let sourceActSeq = 0
let exceptionSeq = 0
let packSeq = 0
let paperFindingSeq = 0
let campaignSeq = 0

/** A campaign read through its session override, seeded or session-launched. */
function campaignWithOverride(s: AppState, id: string): Campaign | undefined {
  const base = WORLD.campaigns.find((c) => c.id === id) ?? s.sessionCampaigns.find((c) => c.id === id)
  if (!base) return undefined
  const ov = s.campaignOverrides[id]
  return ov ? { ...base, ...ov } : base
}

/** Session-launched campaigns are amended in place; seeded ones via overrides. */
function patchCampaign(
  s: AppState,
  set: (fn: (prev: AppState) => Partial<AppState>) => void,
  id: string,
  patch: Partial<Campaign>,
): void {
  if (s.sessionCampaigns.some((c) => c.id === id)) {
    set((prev) => ({ sessionCampaigns: prev.sessionCampaigns.map((c) => (c.id === id ? { ...c, ...patch } : c)) }))
    return
  }
  set((prev) => ({ campaignOverrides: { ...prev.campaignOverrides, [id]: { ...prev.campaignOverrides[id], ...patch } } }))
}


let reportSeq = 0
let fraudSeq = 0
let caseIssueSeq = 0

/**
 * Reference codes for anonymous reporters. Deterministic from the sequence so a
 * reload reproduces them, and carrying no timestamp, no counter the reporter
 * could be ordered by, and nothing derived from what they wrote.
 */
const REF_ALPHABET = 'ABCDEFGHJKLMNPQRTUVWXY3479'
function refBlock(seq: number, salt: number): string {
  let n = (seq + 1) * salt * 7919
  let out = ''
  for (let i = 0; i < 4; i++) {
    out += REF_ALPHABET[n % REF_ALPHABET.length]
    n = Math.floor(n / REF_ALPHABET.length) + salt
  }
  return out
}

/** A speak-up report read through its session override, seeded or filed today. */
function reportWithOverride(s: AppState, id: string): WhistleblowerReport | undefined {
  const base = getReport(id) ?? s.sessionReports.find((r) => r.id === id)
  if (!base) return undefined
  const ov = s.reportOverrides[id]
  return ov ? { ...base, ...ov } : base
}

function patchReport(
  s: AppState,
  set: (fn: (prev: AppState) => Partial<AppState>) => void,
  id: string,
  patch: Partial<WhistleblowerReport>,
): void {
  if (s.sessionReports.some((r) => r.id === id)) {
    set((prev) => ({ sessionReports: prev.sessionReports.map((r) => (r.id === id ? { ...r, ...patch } : r)) }))
    return
  }
  set((prev) => ({ reportOverrides: { ...prev.reportOverrides, [id]: { ...prev.reportOverrides[id], ...patch } } }))
}

/** A fraud case read through its session override. */
function fraudWithOverride(s: AppState, id: string): FraudCase | undefined {
  const base = getFraudCase(id) ?? s.sessionFraudCases.find((c) => c.id === id)
  if (!base) return undefined
  const ov = s.fraudOverrides[id]
  return ov ? { ...base, ...ov } : base
}

function patchFraud(
  s: AppState,
  set: (fn: (prev: AppState) => Partial<AppState>) => void,
  id: string,
  patch: Partial<FraudCase>,
): void {
  if (s.sessionFraudCases.some((c) => c.id === id)) {
    set((prev) => ({ sessionFraudCases: prev.sessionFraudCases.map((c) => (c.id === id ? { ...c, ...patch } : c)) }))
    return
  }
  set((prev) => ({ fraudOverrides: { ...prev.fraudOverrides, [id]: { ...prev.fraudOverrides[id], ...patch } } }))
}

/** A vendor read through its session override. */
function vendorWithOverride(s: AppState, id: string): Vendor | undefined {
  const base = getVendor(id)
  if (!base) return undefined
  const ov = s.vendorOverrides[id]
  return ov ? { ...base, ...ov } : base
}

/** A risk read through its session override — the same merge-on-read rule the
 *  effective.ts hooks use, available inside store actions. */
function riskWithOverride(s: AppState, id: string): Risk | undefined {
  const base = getRisk(id)
  if (!base) return undefined
  const ov = s.riskOverrides[id]
  return ov ? { ...base, ...ov } : base
}

export const useApp = create<AppState>((set, get) => ({
  role: 'CCO',
  personId: 'anjali',
  // Selecting a persona sets the active person AND keeps role synced (role still
  // drives the queue + gating; the person drives the department access boundary).
  setPersona: (personId, role) => set({ personId, role: role ?? PEOPLE_BY_ID[personId]?.role ?? 'EXEC' }),
  setRole: (role) => set({ role, personId: ROLES.find((r) => r.key === role)?.person ?? get().personId }),
  currentPersonId: () => get().personId,

  roles: ['CCO'],
  viewKey: null,
  _sessionPersonId: null,
  setView: (view) => {
    const roles = roleKeysForView(view)
    set({ viewKey: view.key, role: roles[0] ?? get().role, roles: roles.length ? roles : [get().role] })
  },
  hydrateIdentity: (who) => {
    if (get()._sessionPersonId === who.personId) return
    // Transitional bridge (D-031): the server's Person.id is a database id
    // the demo roster in data/people.ts was never keyed by. Both sides name
    // the same nine real people, so a match on full name recovers the roster
    // id every unrewired screen still expects; an unmatched signed-in person
    // (outside the sample roster) leaves personId as it was rather than
    // handing those screens an id they cannot look up.
    const bridged = PEOPLE.find((p) => p.name === who.fullName)?.id ?? get().personId
    const defaultView = who.views[0]
    const roles = defaultView ? roleKeysForView(defaultView) : [get().role]
    set({
      _sessionPersonId: who.personId,
      personId: bridged,
      viewKey: defaultView?.key ?? null,
      role: roles[0] ?? get().role,
      roles: roles.length ? roles : [get().role],
    })
  },

  toasts: [],
  pushToast: (t) => {
    const id = `toast-${++toastSeq}`
    set((s) => ({ toasts: [...s.toasts, { ...t, id }] }))
    setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((x) => x.id !== id) }))
    }, 4200)
  },
  dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((x) => x.id !== id) })),

  drawer: { open: false, kind: null },
  openDrawer: (d) => set({ drawer: { ...d, open: true } }),
  closeDrawer: () => set((s) => ({ drawer: { ...s.drawer, open: false } })),

  commandOpen: false,
  setCommandOpen: (v) => set({ commandOpen: v }),

  // ── Agentic runs (Phase 0.5) ────────────────────────────────────────────────
  agentRuns: [],
  recordAgentRun: (r) => {
    if (get().agentRuns.some((x) => x.runId === r.runId)) return
    set((s) => ({ agentRuns: [r, ...s.agentRuns] }))
    get().recordAction({ action: `Agent run — ${r.agent}`, entityId: r.scopeId, route: r.scopeId ? `/sources/section/${r.scopeId}` : undefined, detail: `${r.findings.length} finding(s), ${r.proposedActions.length} proposed action(s) — awaiting human approval` })
  },
  approveAgentAction: (run, action) => {
    const a = action.apply
    if (a.op === 'saveClauseToControl') {
      get().saveClauseToControl(a.provisionId, a.controlId)
      get().recordAction({ action: `Approved agent proposal — ${action.label}`, entityId: a.provisionId, route: `/sources/section/${a.provisionId}`, detail: `${run.agent}: ${action.detail}` })
      get().notify({ title: 'Agent proposal approved', body: `${action.label} — ${run.agent}. The clause is now tracked.`, severity: 'info', entityId: a.provisionId, route: `/sources/section/${a.provisionId}` })
    } else if (a.op === 'createControlForClause') {
      get().createControlForClause(a.provisionId, { title: a.title, owner: a.owner, frequency: a.frequency, description: a.description })
      get().recordAction({ action: `Approved agent proposal — ${action.label}`, entityId: a.provisionId, route: `/sources/section/${a.provisionId}`, detail: `${run.agent}: ${action.detail}` })
      get().notify({ title: 'Agent proposal approved', body: `${action.label} — ${run.agent}. The clause is now tracked.`, severity: 'info', entityId: a.provisionId, route: `/sources/section/${a.provisionId}` })
    } else {
      // addInstrumentChange already records its own audit + owner-alert notification.
      const id = get().addInstrumentChange(a.instrumentId, a.kind, a.title)
      get().recordAction({ action: `Approved agent proposal — ${action.label}`, entityId: id || a.instrumentId, route: id ? `/reg-change/${id}` : `/sources/${a.instrumentId}`, detail: `${run.agent}: ${action.detail}` })
    }
  },

  artifacts: [],
  addArtifact: (a) => {
    const id = `ART-${++artifactSeq}`
    set((s) => ({ artifacts: [...s.artifacts, { ...a, id }] }))
    return id
  },
  getArtifact: (id) => get().artifacts.find((x) => x.id === id),

  clauseOverrides: {},
  sessionControls: [],
  getSessionControl: (id) => get().sessionControls.find((c) => c.id === id),

  saveClauseToControl: (provisionId, controlId) => {
    const reviewer = ROLES.find((r) => r.key === get().role)?.person ?? 'anjali'
    const prev = get().clauseOverrides[provisionId] ?? {}
    const merged: ClauseOverride = { ...prev, status: 'Saved', linkedControlId: controlId, reviewer, reviewedAt: NOW.toISOString() }
    set((s) => ({ clauseOverrides: { ...s.clauseOverrides, [provisionId]: merged } }))
  },
  createControlForClause: (provisionId, c) => {
    const id = `CTRL-COMP-NEW-${String(++sessionControlSeq).padStart(3, '0')}`
    const control: Control = {
      id,
      title: c.title,
      frameworks: [],
      mappedFrameworkRefs: [],
      owner: c.owner,
      type: 'Preventive',
      automation: 'Manual',
      lastTested: NOW.toISOString(),
      result: 'Pass',
      evidenceCount: 0,
      linkedRisks: [],
      linkedIssues: [],
      description: c.description ?? c.title,
      frequency: c.frequency,
      nextDue: c.nextDue,
      sourceRefs: getSource(provisionId) ? [provisionId] : [],
    }
    set((s) => ({ sessionControls: [...s.sessionControls, control] }))
    get().saveClauseToControl(provisionId, id)
    return id
  },
  engageSpecialist: (provisionId) => {
    const reviewer = ROLES.find((r) => r.key === get().role)?.person ?? 'anjali'
    const prev = get().clauseOverrides[provisionId] ?? {}
    const merged: ClauseOverride = { ...prev, status: 'Specialist review', reviewer, reviewedAt: NOW.toISOString() }
    set((s) => ({ clauseOverrides: { ...s.clauseOverrides, [provisionId]: merged } }))
  },
  completeSpecialist: (provisionId, note) => {
    const prev = get().clauseOverrides[provisionId] ?? {}
    set((s) => ({ clauseOverrides: { ...s.clauseOverrides, [provisionId]: { ...prev, specialistNote: note } } }))
  },
  setClauseApplicability: (provisionId, applicable, basis) => {
    // A first-class compliance decision, recorded like any other: the deciding
    // officer, the moment, and the reason are written onto the clause and appended
    // to the audit log, so "why is this not tracked?" is answerable at inspection.
    const reviewer = get().currentPersonId()
    const prev = get().clauseOverrides[provisionId] ?? {}
    const merged: ClauseOverride = {
      ...prev,
      applicable,
      applicabilityBasis: basis,
      status: applicable ? prev.status : 'Not applicable',
      reviewer,
      reviewedAt: NOW.toISOString(),
      rationale: basis ?? prev.rationale,
    }
    set((s) => ({ clauseOverrides: { ...s.clauseOverrides, [provisionId]: merged } }))
    get().recordAction({
      action: applicable ? `Clause marked applicable · ${provisionId}` : `Clause marked not applicable · ${provisionId}`,
      entityId: provisionId,
      route: `/sources/section/${provisionId}`,
      detail: basis ?? 'No reason recorded',
    })
  },

  // ── AI-assisted Source Act creation (E0.6 / 1.6) ────────────────────────────
  sessionInstruments: [],
  sessionProvisions: [],
  createSourceAct: ({ extracted, acceptedIdx, departments, entry }) => {
    const n = ++sourceActSeq
    const instId = `INST-NEW-${String(n).padStart(2, '0')}`
    const accepted = acceptedIdx.map((i) => extracted.clauses[i]).filter(Boolean)
    const provisions: SourceProvision[] = accepted.map((c, k) => {
      const pid = `SRC-NEW-${n}-${k + 1}`
      return {
        id: pid,
        instrumentId: instId,
        provision: c.provision,
        title: c.title,
        citation: c.citation,
        sourceExtract: c.whatItMeans,
        nameOfCompliance: c.nameOfCompliance,
        briefDescription: c.nameOfCompliance,
        whatItMeans: c.whatItMeans,
        keyParts: c.keyParts,
        penaltyTiers: c.penaltyTiers.map((t) => ({ ...t, sourceRef: pid })),
        severity: c.severity,
        frequency: c.frequency,
        applicable: c.applicable,
        applicabilityBasis: c.applicabilityBasis,
        status: 'Recommended',
      }
    })
    const instrument: SourceInstrument = {
      id: instId,
      title: extracted.title,
      authority: extracted.authority,
      instrumentType: extracted.instrumentType,
      dateOfIssue: NOW.toISOString(),
      sourceChannel: entry === 'upload' ? 'Manual upload' : 'Regulator site',
      sourceLink: extracted.sourceLink,
      status: 'In force',
      summary: extracted.summary,
      applicability: extracted.applicability,
      departments,
      createdInSession: true,
    }
    set((s) => ({
      sessionInstruments: [...s.sessionInstruments, instrument],
      sessionProvisions: [...s.sessionProvisions, ...provisions],
    }))
    // Audit-trail the full workflow (1.6): extraction, each acceptance, routing.
    get().recordAction({ action: `AI extraction accepted — created source act ${instId}`, entityId: instId, route: `/sources/${instId}`, detail: `${extracted.title} · ${entry === 'upload' ? 'document upload' : 'name + URL'}` })
    for (const p of provisions) get().recordAction({ action: `Accepted clause ${p.provision}`, entityId: p.id, route: `/sources/section/${p.id}`, detail: `${p.nameOfCompliance} (${instId})` })
    get().recordAction({ action: `Routed ${instId} to ${departments.join(', ') || 'Compliance only'}`, entityId: instId, route: `/sources/${instId}`, detail: extracted.title })
    get().notify({ title: 'Source act created', body: `${instId} — ${extracted.title}: ${provisions.length} clause(s) accepted, routed to ${departments.join(', ') || 'Compliance'}.`, severity: 'info', entityId: instId, route: `/sources/${instId}` })
    return instId
  },

  // ── Generalised session-mutation layer (Epic 1.1) ───────────────────────────
  obligationOverrides: {},
  controlOverrides: {},
  issueOverrides: {},
  incidentOverrides: {},
  regChangeOverrides: {},
  dsarOverrides: {},
  riskOverrides: {},
  sessionObligations: [],
  sessionIssues: [],
  packs: [],
  paperOverrides: {},
  sessionFindings: {},
  campaignOverrides: {},
  vendorOverrides: {},
  reportOverrides: {},
  fraudOverrides: {},
  sessionReports: [],
  sessionFraudCases: [],
  sessionCampaigns: [],

  patchObligation: (id, patch) =>
    set((s) => ({ obligationOverrides: { ...s.obligationOverrides, [id]: { ...s.obligationOverrides[id], ...patch } } })),
  patchControl: (id, patch) =>
    set((s) => ({ controlOverrides: { ...s.controlOverrides, [id]: { ...s.controlOverrides[id], ...patch } } })),
  patchIssue: (id, patch) =>
    set((s) => ({ issueOverrides: { ...s.issueOverrides, [id]: { ...s.issueOverrides[id], ...patch } } })),
  patchIncident: (id, patch) =>
    set((s) => ({ incidentOverrides: { ...s.incidentOverrides, [id]: { ...s.incidentOverrides[id], ...patch } } })),
  patchRegChange: (id, patch) =>
    set((s) => ({ regChangeOverrides: { ...s.regChangeOverrides, [id]: { ...s.regChangeOverrides[id], ...patch } } })),
  patchDsar: (id, patch) =>
    set((s) => ({ dsarOverrides: { ...s.dsarOverrides, [id]: { ...s.dsarOverrides[id], ...patch } } })),
  patchRisk: (id, patch) =>
    set((s) => ({ riskOverrides: { ...s.riskOverrides, [id]: { ...s.riskOverrides[id], ...patch } } })),
  addSessionObligation: (o) => set((s) => ({ sessionObligations: [...s.sessionObligations, o] })),
  addSessionIssue: (i) => set((s) => ({ sessionIssues: [...s.sessionIssues, i] })),

  patchVendor: (id, patch) =>
    set((s) => ({ vendorOverrides: { ...s.vendorOverrides, [id]: { ...s.vendorOverrides[id], ...patch } } })),

  // ── Speak-up channel ────────────────────────────────────────────────────────
  // Intake strips everything. What goes in is what the reporter typed plus the
  // category they chose; what comes back is a reference code. There is no field
  // on the record for an identity, so there is nothing for a later screen,
  // export or log line to leak.

  fileReport: (args) => {
    const seq = ++reportSeq
    const id = `WB-S-${String(seq).padStart(3, '0')}`
    const reference = `SPF-${refBlock(seq, 11)}-${refBlock(seq, 29)}`
    const at = NOW.toISOString()
    const report: WhistleblowerReport = {
      id,
      reference,
      anonymous: args.anonymous,
      identity: args.identityHeld ? { heldBy: COMPLIANCE_OFFICER, unsealableBy: [COMPLIANCE_OFFICER, 'sunita'] } : undefined,
      channel: args.channel,
      category: args.category,
      severity: args.severity,
      receivedAt: at,
      summary: args.summary,
      allegationAgainst: args.allegationAgainst,
      stage: 'Received',
      acknowledgeBy: new Date(NOW.getTime() + 7 * 86400000).toISOString(),
      feedbackBy: new Date(NOW.getTime() + 90 * 86400000).toISOString(),
      messages: [],
      retaliationWatch: args.retaliationWatch,
      linkedRiskIds: [],
      linkedIssueIds: [],
      evidenceIds: [],
      restricted: true,
      accessList: [...ETHICS_OFFICE],
      recusals: [],
    }
    set((s) => ({ sessionReports: [report, ...s.sessionReports] }))
    // The log records that a report arrived and nothing about what it says.
    get().recordAction({
      actor: 'system',
      action: `Speak-up report received under reference ${reference}`,
      entityId: id,
      route: `/whistleblower/${id}`,
      detail: `${args.channel} · acknowledgement due ${report.acknowledgeBy.slice(0, 10)} · substantive response due ${report.feedbackBy.slice(0, 10)}`,
    })
    get().notify({
      title: 'New speak-up report',
      body: `${reference} is awaiting acknowledgement by the ethics office.`,
      severity: 'warn',
      entityId: id,
      route: `/whistleblower/${id}`,
    })
    return reference
  },

  acknowledgeReport: (id) => {
    const r = reportWithOverride(get(), id)
    if (!r || r.acknowledgedOn) return
    const at = NOW.toISOString()
    patchReport(get(), set, id, {
      acknowledgedOn: at,
      stage: r.stage === 'Received' ? 'Acknowledged' : r.stage,
      messages: [
        ...r.messages,
        {
          at,
          from: 'Ethics office',
          text: `Your report has been received and logged under reference ${r.reference}. It is being assessed by the ethics office. Nothing you have told us identifies you.`,
        },
      ],
    })
    get().recordAction({
      action: `Acknowledged speak-up report ${r.reference}`,
      entityId: id,
      route: `/whistleblower/${id}`,
      detail: `Within ${Math.max(0, Math.round((new Date(r.acknowledgeBy).getTime() - NOW.getTime()) / 86400000))} days of the acknowledgement deadline`,
    })
  },

  triageReport: (id, args) => {
    const r = reportWithOverride(get(), id)
    if (!r) return
    const at = NOW.toISOString()
    const actor = get().currentPersonId()
    patchReport(get(), set, id, {
      stage: args.accept ? 'Investigation' : 'Rejected',
      outcome: args.accept ? undefined : 'Out of scope',
      triagedBy: actor,
      triagedOn: at,
      investigator: args.accept ? args.investigator : undefined,
      assignedOn: args.accept ? at : undefined,
      closedOn: args.accept ? undefined : at,
      closureNote: args.accept ? undefined : args.note,
      // The investigator joins the access list; nobody else does.
      accessList: args.accept && args.investigator ? Array.from(new Set([...r.accessList, args.investigator])) : r.accessList,
      messages: [...r.messages, { at, from: 'Ethics office', text: args.note }],
    })
    get().recordAction({
      action: `${args.accept ? 'Referred' : 'Closed at triage'} speak-up report ${r.reference}`,
      entityId: id,
      route: `/whistleblower/${id}`,
      detail: args.accept ? `Assigned to ${personName(args.investigator ?? '')} for investigation` : args.note.slice(0, 140),
    })
  },

  messageReporter: (id, text) => {
    const r = reportWithOverride(get(), id)
    if (!r) return
    patchReport(get(), set, id, { messages: [...r.messages, { at: NOW.toISOString(), from: 'Ethics office', text }] })
    get().recordAction({
      action: `Sent an update to the reporter on ${r.reference}`,
      entityId: id,
      route: `/whistleblower/${id}`,
      detail: 'Delivered through the reference code; no identity is held or used.',
    })
  },

  reviewRetaliation: (id) => {
    const r = reportWithOverride(get(), id)
    if (!r) return
    patchReport(get(), set, id, { retaliationReviewedOn: NOW.toISOString() })
    get().recordAction({
      action: `Retaliation check completed on ${r.reference}`,
      entityId: id,
      route: `/whistleblower/${id}`,
      detail: 'No detriment identified; the watch continues for a further 90 days.',
    })
  },

  convertReportToFraud: (id, args) => {
    const r = reportWithOverride(get(), id)
    if (!r || r.linkedFraudCaseId) return undefined
    const caseId = `FRD-S-${String(++fraudSeq).padStart(3, '0')}`
    const at = NOW.toISOString()
    const actor = get().currentPersonId()
    const fraudCase: FraudCase = {
      id: caseId,
      title: args.title,
      scheme: args.scheme,
      detection: 'Whistleblower report',
      detectedOn: r.receivedAt,
      openedOn: at,
      stage: 'Triage',
      severity: r.severity,
      investigator: args.investigator,
      sponsor: actor === args.investigator ? CRO : actor,
      subjects: [{ ref: r.allegationAgainst, internal: true }],
      indicators: [],
      estimatedLossLakh: args.estimatedLossLakh,
      lossCategory: 'Internal fraud',
      timeline: [
        {
          at,
          actor,
          action: 'Case opened from a converted speak-up report',
          // The one line that makes the conversion safe.
          note: `Carries reference ${r.reference}. The reporter's identity is not held by this case and cannot be reached from it.`,
        },
      ],
      regulatoryTracks: [],
      evidenceIds: [],
      linkedControls: [],
      linkedRiskIds: [...r.linkedRiskIds],
      linkedIssueIds: [],
      whistleblowerRef: r.reference,
      restricted: true,
      accessList: Array.from(new Set([...ETHICS_OFFICE, args.investigator, actor, CRO])),
      recusals: [...r.recusals],
    }
    set((s) => ({ sessionFraudCases: [fraudCase, ...s.sessionFraudCases] }))
    patchReport(get(), set, id, {
      linkedFraudCaseId: caseId,
      stage: 'Investigation',
      messages: [
        ...r.messages,
        {
          at,
          from: 'Ethics office',
          text: 'The matter has been referred for a formal investigation. You are protected against any detriment for having raised it.',
        },
      ],
    })
    get().recordAction({
      action: `Converted ${r.reference} into fraud case ${caseId}`,
      entityId: caseId,
      route: `/fraud/${caseId}`,
      detail: `${args.scheme} · reporter identity not carried across · investigator ${personName(args.investigator)}`,
    })
    get().notify({
      title: 'Fraud case opened from the speak-up channel',
      body: `${caseId} — ${args.title}. The reporter's identity has not been carried across.`,
      severity: 'warn',
      entityId: caseId,
      route: `/fraud/${caseId}`,
    })
    return caseId
  },

  closeReport: (id, args) => {
    const r = reportWithOverride(get(), id)
    if (!r || r.closedOn) return
    const at = NOW.toISOString()
    patchReport(get(), set, id, {
      stage: 'Closed',
      outcome: args.outcome,
      closedOn: at,
      closureNote: args.note,
      messages: [...r.messages, { at, from: 'Ethics office', text: args.note }],
    })
    get().recordAction({
      action: `Closed speak-up report ${r.reference} — ${args.outcome}`,
      entityId: id,
      route: `/whistleblower/${id}`,
      detail: `${Math.round((NOW.getTime() - new Date(r.receivedAt).getTime()) / 86400000)} days from receipt · substantive response delivered to the reporter`,
    })
  },

  // ── shared: the action plan and the push into the register ──────────────────

  raiseCaseRemediation: (caseId, args) => {
    const isFraud = caseId.startsWith('FRD-')
    const c = isFraud ? fraudWithOverride(get(), caseId) : reportWithOverride(get(), caseId)
    if (!c) return undefined
    const issueId = `ISS-CS-${String(++caseIssueSeq).padStart(3, '0')}`
    const issue = buildRemediationIssue({
      id: issueId,
      caseId,
      title: args.title,
      owner: args.owner,
      severity: args.severity,
      dueInDays: remediationDays(args.severity),
      linkedControls: args.linkedControls,
      provenance: isFraud ? `Fraud case ${caseId}` : 'Speak-up investigation',
    })
    get().addSessionIssue(issue)
    if (isFraud) {
      const f = c as FraudCase
      patchFraud(get(), set, caseId, { linkedIssueIds: [...f.linkedIssueIds, issueId] })
    } else {
      const w = c as WhistleblowerReport
      patchReport(get(), set, caseId, { linkedIssueIds: [...w.linkedIssueIds, issueId], stage: 'Remediation' })
    }
    get().recordAction({
      action: `Raised remediation ${issueId} from ${caseId}`,
      entityId: issueId,
      route: `/issues/${issueId}`,
      detail: `${args.title} · owner ${personName(args.owner)} · due in ${remediationDays(args.severity)} days`,
    })
    return issueId
  },

  linkCaseToRisk: (caseId, riskId) => {
    const isFraud = caseId.startsWith('FRD-')
    const risk = riskWithOverride(get(), riskId)
    if (!risk) return
    if (isFraud) {
      const f = fraudWithOverride(get(), caseId)
      if (!f || f.linkedRiskIds.includes(riskId)) return
      patchFraud(get(), set, caseId, { linkedRiskIds: [...f.linkedRiskIds, riskId] })
    } else {
      const w = reportWithOverride(get(), caseId)
      if (!w || w.linkedRiskIds.includes(riskId)) return
      patchReport(get(), set, caseId, { linkedRiskIds: [...w.linkedRiskIds, riskId] })
    }
    // The register gains a dated event, so a risk that an investigation touched
    // says so on its own timeline rather than only in the case file.
    get().patchRisk(riskId, {
      lifecycle: {
        ...risk.lifecycle,
        history: [
          ...risk.lifecycle.history,
          {
            at: NOW.toISOString(),
            actor: get().currentPersonId(),
            channel: 'OneGRC',
            kind: 'triage',
            text: `${isFraud ? 'Fraud case' : 'Speak-up investigation'} ${caseId} linked to this risk as a realised event.`,
          },
        ],
      },
    })
    get().recordAction({
      action: `Linked ${caseId} to ${riskId} in the enterprise risk register`,
      entityId: riskId,
      route: `/risks/${riskId}`,
      detail: `${risk.title} · residual ${risk.residual}/25`,
    })
  },

  // ── Fraud case management ───────────────────────────────────────────────────

  advanceFraudCase: (id, stage, note) => {
    const c = fraudWithOverride(get(), id)
    if (!c || c.stage === 'Closed') return
    const actor = get().currentPersonId()
    patchFraud(get(), set, id, {
      stage,
      timeline: [...c.timeline, { at: NOW.toISOString(), actor, action: `Case moved to ${stage}`, note }],
    })
    get().recordAction({
      action: `Advanced fraud case ${id} to ${stage}`,
      entityId: id,
      route: `/fraud/${id}`,
      detail: note ?? `${c.scheme} · ${c.title}`,
    })
  },

  fileFraudTrack: (id, regulator, reference) => {
    const c = fraudWithOverride(get(), id)
    if (!c) return
    const at = NOW.toISOString()
    const actor = get().currentPersonId()
    patchFraud(get(), set, id, {
      regulatoryTracks: c.regulatoryTracks.map((t) => (t.regulator === regulator ? { ...t, reportedOn: at, reference } : t)),
      timeline: [...c.timeline, { at, actor, action: `${regulator} notification filed`, note: reference }],
    })
    get().recordAction({
      action: `Filed the ${regulator} notification for ${id}`,
      entityId: id,
      route: `/fraud/${id}`,
      detail: `${reference} · ${c.title}`,
    })
    get().notify({
      title: `${regulator} notification filed`,
      body: `${id} — ${reference}.`,
      severity: 'info',
      entityId: id,
      route: `/fraud/${id}`,
    })
  },

  recordFraudLoss: (id, args) => {
    const c = fraudWithOverride(get(), id)
    if (!c) return
    const actor = get().currentPersonId()
    patchFraud(get(), set, id, {
      confirmedLossLakh: args.confirmedLossLakh,
      recoveredLakh: args.recoveredLakh,
      accountingRef: args.accountingRef,
      timeline: [
        ...c.timeline,
        {
          at: NOW.toISOString(),
          actor,
          action: 'Loss confirmed and recovery recorded',
          note: `Gross ₹${args.confirmedLossLakh.toFixed(2)} lakh · recovered ₹${args.recoveredLakh.toFixed(2)} lakh${args.accountingRef ? ` · ${args.accountingRef}` : ''}`,
        },
      ],
    })
    get().recordAction({
      action: `Recorded the loss on fraud case ${id}`,
      entityId: id,
      route: `/fraud/${id}`,
      detail: `Net ₹${(args.confirmedLossLakh - args.recoveredLakh).toFixed(2)} lakh · ${c.lossCategory}`,
    })
  },

  closeFraudCase: (id, args) => {
    const c = fraudWithOverride(get(), id)
    if (!c || c.stage === 'Closed') return
    const at = NOW.toISOString()
    const actor = get().currentPersonId()
    patchFraud(get(), set, id, {
      stage: 'Closed',
      outcome: args.outcome,
      closedOn: at,
      closureNote: args.note,
      disciplinaryAction: args.disciplinaryAction ?? c.disciplinaryAction,
      recoveryAction: args.recoveryAction ?? c.recoveryAction,
      timeline: [...c.timeline, { at, actor, action: `Case closed — ${args.outcome}`, note: args.note }],
    })
    get().recordAction({
      action: `Closed fraud case ${id} — ${args.outcome}`,
      entityId: id,
      route: `/fraud/${id}`,
      detail: `${c.scheme} · ${Math.round((NOW.getTime() - new Date(c.openedOn).getTime()) / 86400000)} days open`,
    })
    get().notify({
      title: 'Fraud case closed',
      body: `${id} — ${args.outcome}. ${args.note.slice(0, 120)}`,
      severity: args.outcome === 'Substantiated' ? 'warn' : 'info',
      entityId: id,
      route: `/fraud/${id}`,
    })
  },

  // ── Add a circular / new version to an existing Act (Item 1) ────────────────
  // Registers a regulatory change against the instrument, flags the records its
  // clauses produced, alerts the owner, and routes into the Reg-Change pipeline
  // (assess → acknowledge). Session-only; never mutates the seed.
  sessionRegChanges: [],
  addInstrumentChange: (instrumentId, kind, title) => {
    const inst = getInstrument(instrumentId)
    if (!inst) return ''
    const regulator: RegulatoryChange['regulator'] = inst.regulator ?? 'Companies Act'
    const provs = provisionsForInstrument(instrumentId)
    const provIds = provs.map((p) => p.id)
    const cites = (refs?: string[]) => (refs ?? []).some((r) => provIds.includes(r))
    let impactedObligations = WORLD.obligations.filter((o) => cites(o.sourceRefs)).map((o) => o.id).slice(0, 8)
    // Fallback for a newly-arrived instrument whose clauses are not yet cited:
    // assess impact (and the owner to alert) by the instrument's regulator.
    if (impactedObligations.length === 0 && inst.regulator) {
      impactedObligations = WORLD.obligations.filter((o) => o.regulator === inst.regulator).map((o) => o.id).slice(0, 8)
    }
    // Controls connect to a clause either by sourceRefs (state-tax style) or by the
    // clause's linkedControlId (the saved-to-control link, e.g. DPDP -> DPB/SEC).
    const linkedCtrls = provs.map((p) => p.linkedControlId).filter((x): x is string => Boolean(x))
    const impactedControls = Array.from(new Set([...WORLD.controls.filter((c) => cites(c.sourceRefs)).map((c) => c.id), ...linkedCtrls])).slice(0, 8)
    const owner = getObligation(impactedObligations[0] ?? '')?.owner ?? 'anjali'
    const id = `RCM-2026-S${String(++regChangeSeq).padStart(2, '0')}`
    const rc: RegulatoryChange = {
      id,
      source: regulator === 'PFRDA' ? 'PFRDA circular' : 'Regulatory Intelligence feed',
      summary: title,
      regulator,
      publishedAt: NOW.toISOString(),
      impactedObligations,
      impactedControls,
      owner,
      status: 'In progress',
      detail: `${kind} registered against ${inst.title}. ${impactedObligations.length} obligation(s) and ${impactedControls.length} control(s) flagged for review; owner ${personName(owner)} alerted to assess and acknowledge.`,
      instrumentId,
    }
    set((s) => ({ sessionRegChanges: [...s.sessionRegChanges, rc] }))
    get().recordAction({ action: `Registered ${kind.toLowerCase()} on ${inst.title}`, entityId: id, route: `/reg-change/${id}`, detail: title })
    get().notify({ title: `${kind} registered`, body: `${id} - ${personName(owner)} alerted; ${impactedObligations.length} obligation(s) and ${impactedControls.length} control(s) to review.`, severity: 'warn', entityId: id, route: `/reg-change/${id}` })
    return id
  },

  // ── Governance primitives (Epic 1.3) ────────────────────────────────────────
  auditLog: [],
  notifications: SEED_NOTIFICATIONS,
  recordAction: (e) => {
    const actor = e.actor ?? get().currentPersonId()
    const entry: AuditEntry = { ...e, actor, id: `ALOG-S-${++auditSeq}`, at: NOW.toISOString() }
    set((s) => ({ auditLog: [entry, ...s.auditLog] }))
  },
  notify: (n) => {
    const item: NotificationItem = { ...n, id: `NTF-${++notifSeq}`, at: NOW.toISOString(), read: false }
    set((s) => ({ notifications: [item, ...s.notifications] }))
  },
  markNotificationsRead: () => set((s) => ({ notifications: s.notifications.map((n) => ({ ...n, read: true })) })),

  // ── Task two-step maker-checker (E0.3 maker / E0.4 checker) ──────────────────
  sessionEvidence: [],
  taskWorkflow: {},
  getAnyEvidence: (id) => getEvidence(id) ?? get().sessionEvidence.find((e) => e.id === id),
  attachTaskEvidence: ({ taskId, obligationId, controlId, title, type, onBehalfOf }) => {
    const actor = get().currentPersonId()
    const id = `EVD-S-${String(++evidenceSeq).padStart(3, '0')}`
    const rec: Evidence = {
      id,
      title,
      type,
      capturedAt: NOW.toISOString(),
      capturedBy: actor,
      auto: false,
      linkedControls: controlId ? [controlId] : [],
      linkedObligations: [obligationId],
      frameworkRefs: [],
      source: 'Manual upload',
    }
    set((s) => ({
      sessionEvidence: [...s.sessionEvidence, rec],
      // Maker step: record the actor + timestamp alongside the evidence link.
      // onBehalfOf is set when a department head steps in for the assigned owner.
      taskWorkflow: { ...s.taskWorkflow, [taskId]: { ...s.taskWorkflow[taskId], evidenceId: id, maker: actor, makerAt: NOW.toISOString(), onBehalfOf } },
      // The evidence is now Submitted by the maker, awaiting checker verification.
      evidenceWorkflow: { ...s.evidenceWorkflow, [id]: { status: 'Submitted', submittedBy: actor, submittedAt: NOW.toISOString() } },
    }))
    // Reflect the proof on the obligation record too (closes the evidence gap).
    const base = getObligation(obligationId) ?? get().sessionObligations.find((o) => o.id === obligationId)
    const curEv = get().obligationOverrides[obligationId]?.evidence ?? base?.evidence ?? []
    get().patchObligation(obligationId, { evidence: [...curEv, id] })
    const onBehalfNote = onBehalfOf ? ` on behalf of ${personName(onBehalfOf)}` : ''
    get().recordAction({ action: `${onBehalfOf ? 'Department head attached' : 'Maker attached'} evidence to ${taskId}${onBehalfNote}`, entityId: id, route: `/tasks/${taskId}`, detail: `${title} — linked to ${obligationId}${controlId ? ` and ${controlId}` : ''}` })
    get().notify({ title: onBehalfOf ? 'Evidence attached (head step-in)' : 'Evidence attached', body: `${id} linked to task ${taskId}${onBehalfNote}; awaiting checker verification.`, severity: 'info', entityId: obligationId, route: `/tasks/${taskId}` })
    return id
  },
  // Checker step: verifying a task verifies its evidence (the single lifecycle).
  verifyTask: ({ taskId }) => {
    const evidenceId = get().taskWorkflow[taskId]?.evidenceId
    if (evidenceId) get().verifyEvidence(evidenceId)
  },

  // ── Evidence lifecycle (E3.3) ───────────────────────────────────────────────
  evidenceWorkflow: {},
  getEvidenceStatus: (id) => get().evidenceWorkflow[id]?.status ?? (getEvidence(id) ? 'Verified' : 'Submitted'),
  evidenceDraft: null,
  setEvidenceDraft: (d) => set({ evidenceDraft: d }),
  verifyEvidence: (evidenceId) => {
    const actor = get().currentPersonId()
    const wf = get().evidenceWorkflow[evidenceId]
    if (wf?.status === 'Verified') return // already verified
    if (wf?.submittedBy && actor === wf.submittedBy) return // separation of duties
    set((s) => ({
      evidenceWorkflow: { ...s.evidenceWorkflow, [evidenceId]: { ...(s.evidenceWorkflow[evidenceId] ?? { status: 'Submitted' }), status: 'Verified', verifiedBy: actor, verifiedAt: NOW.toISOString() } },
    }))
    // Reflect on the owning task (if any) so the task reads verified / Done.
    const tw = get().taskWorkflow
    const tskId = Object.keys(tw).find((k) => tw[k].evidenceId === evidenceId)
    if (tskId) set((s) => ({ taskWorkflow: { ...s.taskWorkflow, [tskId]: { ...s.taskWorkflow[tskId], checker: actor, checkerAt: NOW.toISOString() } } }))
    const ev = get().getAnyEvidence(evidenceId)
    get().recordAction({ action: `Checker verified evidence ${evidenceId}`, entityId: evidenceId, route: `/evidence/${evidenceId}`, detail: ev?.title })
    get().notify({ title: 'Evidence verified', body: `${evidenceId} verified by ${personName(actor)}.`, severity: 'info', entityId: evidenceId, route: `/evidence/${evidenceId}` })
  },

  addManualEvidence: (args) => {
    const actor = get().currentPersonId()
    const id = `EVD-S-${String(++evidenceSeq).padStart(3, '0')}`
    const rec: Evidence = {
      id,
      title: args?.title || 'Manual evidence upload',
      type: args?.type ?? 'Attestation',
      capturedAt: NOW.toISOString(),
      capturedBy: actor,
      auto: false,
      linkedControls: args?.controlId ? [args.controlId] : [],
      linkedObligations: args?.obligationId ? [args.obligationId] : [],
      frameworkRefs: [],
      source: 'Manual upload',
    }
    set((s) => ({
      sessionEvidence: [...s.sessionEvidence, rec],
      evidenceWorkflow: { ...s.evidenceWorkflow, [id]: { status: 'Submitted', submittedBy: actor, submittedAt: NOW.toISOString() } },
    }))
    get().recordAction({ action: `Submitted evidence ${id}`, entityId: id, route: `/evidence/${id}`, detail: rec.title })
    get().notify({ title: 'Evidence submitted', body: `${id} — ${rec.title} submitted; awaiting checker verification.`, severity: 'info', entityId: id, route: `/evidence/${id}` })
    return id
  },

  // ── Obligation workflow (Epic 2.1) ──────────────────────────────────────────
  submitObligation: (id) => {
    const base = getObligation(id) ?? get().sessionObligations.find((o) => o.id === id)
    if (!base) return
    const mc = { ...base.makerChecker, ...(get().obligationOverrides[id]?.makerChecker ?? {}) }
    get().patchObligation(id, { status: 'In review', makerChecker: { ...mc, state: 'Submitted' } })
    get().recordAction({ action: `Submitted obligation ${id} for check`, entityId: id, route: `/obligations/${id}`, detail: base.title })
    get().notify({ title: 'Filing submitted for check', body: `${id} - ${base.title}`, severity: 'info', entityId: id, route: `/obligations/${id}` })
  },
  approveObligation: (id) => {
    const base = getObligation(id) ?? get().sessionObligations.find((o) => o.id === id)
    if (!base) return
    const mc = { ...base.makerChecker, ...(get().obligationOverrides[id]?.makerChecker ?? {}) }
    get().patchObligation(id, { status: 'Filed', makerChecker: { ...mc, state: 'Approved' }, filedAt: NOW.toISOString() })
    get().recordAction({ action: `Approved & filed obligation ${id}`, entityId: id, route: `/obligations/${id}`, detail: base.title })
    get().notify({ title: 'Obligation filed', body: `${id} - ${base.title} approved under maker-checker.`, severity: 'info', entityId: id, route: `/obligations/${id}` })
    // Schedule the next recurring instance (spec 5.4) as a session-appended duty.
    const merged = { ...base, ...(get().obligationOverrides[id] ?? {}), status: 'Filed' as const }
    const next = nextInstance(merged)
    if (next) {
      get().addSessionObligation(next)
      get().recordAction({ action: `Scheduled next ${next.frequency.toLowerCase()} cycle ${next.id}`, entityId: next.id, route: `/obligations/${next.id}`, detail: next.title })
      get().notify({ title: 'Next cycle scheduled', body: `${next.id} - ${next.title} is now due ${new Date(next.dueDate).toLocaleDateString('en-IN')}.`, severity: 'info', entityId: next.id, route: `/obligations/${next.id}` })
    }
  },

  // ── Control test/re-test (Epic 2.3) ─────────────────────────────────────────
  controlTests: {},
  retestControl: (id, opts) => {
    const base = getControl(id) ?? get().getSessionControl(id)
    if (!base) return
    // Protect the load-bearing marquee CCM chain: a re-test of the patch-SLA
    // control records remediation-in-progress (Partial), not a clean Pass, so the
    // failing CCM rule -> issue -> incident story survives.
    const marquee = id === 'CTRL-PCI-6.3.3'
    const result = opts?.result ?? (marquee ? 'Partial' : 'Pass')
    const tester = get().currentPersonId()
    const run: TestRun = {
      at: NOW.toISOString(),
      result,
      method: opts?.method ?? 'Manual re-test',
      tester,
      note: opts?.note ?? (marquee ? 'Re-tested; patch remediation in progress, critical CVEs being closed.' : 'Re-tested and operating effectively.'),
    }
    set((s) => ({ controlTests: { ...s.controlTests, [id]: [run, ...(s.controlTests[id] ?? [])] } }))
    get().patchControl(id, { result, lastTested: run.at })
    get().recordAction({ action: `Re-tested control ${id} - ${result}`, entityId: id, route: `/controls/${id}`, detail: base.title })
    get().notify({ title: 'Control re-tested', body: `${id} - ${base.title}: ${result}.`, severity: result === 'Pass' ? 'info' : 'warn', entityId: id, route: `/controls/${id}` })
  },

  // ── Regulatory change (Epic 3.1) ────────────────────────────────────────────
  acknowledgeRegChange: (id) => {
    const c = getRegChange(id) ?? get().sessionRegChanges.find((r) => r.id === id)
    if (!c) return
    get().patchRegChange(id, { status: 'Closed' })
    get().recordAction({ action: `Acknowledged regulatory change ${id}`, entityId: id, route: `/reg-change/${id}`, detail: c.summary })
    get().notify({ title: 'Regulatory change acknowledged', body: `${id} - ${personName(c.owner)} alerted; ${c.impactedObligations.length} obligation(s) and ${c.impactedControls.length} control(s) updated.`, severity: 'info', entityId: id, route: `/reg-change/${id}` })
  },

  // ── Incident regulator-track filing (Epic 3.2) ──────────────────────────────
  // Files one regulator track (it leaves activeTracks); the incident itself stays
  // open so the marquee "1 Critical live" vital is preserved.
  fileIncidentTrack: (incidentId, trackIndex) => {
    const base = getIncident(incidentId)
    if (!base) return
    const cur = { ...base, ...(get().incidentOverrides[incidentId] ?? {}) }
    const tracks = cur.regulatorTracks.map((t, i) => (i === trackIndex ? { ...t, status: 'Filed' as const } : t))
    const filed = tracks[trackIndex]
    get().patchIncident(incidentId, { regulatorTracks: tracks })
    get().recordAction({ action: `Filed ${filed.regulator} report for ${incidentId}`, entityId: incidentId, route: `/incidents/${incidentId}`, detail: filed.output })
    get().notify({ title: `${filed.regulator} report filed`, body: `${incidentId} - ${filed.clockLabel} satisfied under maker-checker sign-off.`, severity: 'info', entityId: incidentId, route: `/incidents/${incidentId}` })
  },

  // Recognise (or withdraw) an incident's operational-risk loss. Net loss is
  // derived on read, so nothing here can record a net that disagrees with its
  // gross and recovery.
  setIncidentLossEvent: (incidentId, le) => {
    const base = getIncident(incidentId)
    if (!base) return
    const prior = { ...base, ...(get().incidentOverrides[incidentId] ?? {}) }.lossEvent
    get().patchIncident(incidentId, { lossEvent: le })
    if (!le?.isLossEvent) {
      get().recordAction({
        action: `Withdrew operational-risk loss event on ${incidentId}`,
        entityId: incidentId,
        route: `/incidents/${incidentId}`,
        detail: base.title,
      })
      return
    }
    const net = Math.max(0, le.grossLoss - le.recovery)
    const verb = prior?.isLossEvent ? 'Updated' : 'Recorded'
    get().recordAction({
      action: `${verb} operational-risk loss event on ${incidentId}`,
      entityId: incidentId,
      route: `/incidents/${incidentId}`,
      detail: `${le.category} · gross ₹${le.grossLoss.toLocaleString('en-IN')} · recovery ₹${le.recovery.toLocaleString('en-IN')} · net ₹${net.toLocaleString('en-IN')}${le.accountingRef ? ` · ${le.accountingRef}` : ''}`,
    })
    get().notify({
      title: `Loss event ${verb.toLowerCase()}`,
      body: `${incidentId} - net loss ₹${net.toLocaleString('en-IN')} recognised under ${le.category}.`,
      severity: net >= 10_00_000 ? 'warn' : 'info',
      entityId: incidentId,
      route: `/incidents/${incidentId}`,
    })
  },

  // ── Issue remediation + audit findings (Epic 3.3) ───────────────────────────
  // Resolving an audit-finding-sourced issue is what retires the finding and drops
  // the Open-findings metric (see lib/metrics). Session-override only; seed intact.
  resolveIssue: (id) => {
    const base = getIssue(id)
    if (!base) return
    const cur = { ...base, ...(get().issueOverrides[id] ?? {}) }
    if (cur.status === 'Resolved') return
    get().patchIssue(id, { status: 'Resolved' })
    get().recordAction({ action: `Resolved issue ${id}`, entityId: id, route: `/issues/${id}`, detail: cur.title })
    get().notify({ title: 'Issue resolved', body: `${id} - ${cur.title} closed with remediation evidence.`, severity: 'info', entityId: id, route: `/issues/${id}` })
  },

  // Bulk status write across selected issues — one audit-log line for the batch.
  bulkSetIssueStatus: (ids, status) => {
    const targets = ids.filter((id) => {
      const b = getIssue(id)
      return b && { ...b, ...(get().issueOverrides[id] ?? {}) }.status !== status
    })
    if (!targets.length) return
    for (const id of targets) get().patchIssue(id, { status })
    const verb = status === 'Resolved' ? 'Resolved' : `Set to "${status}"`
    get().recordAction({ action: `${verb} ${targets.length} issue(s)`, entityId: targets[0], route: '/issues', detail: targets.join(', ') })
    get().notify({ title: `${targets.length} issue(s) ${status === 'Resolved' ? 'resolved' : 'updated'}`, body: `Bulk ${status === 'Resolved' ? 'closure recorded with remediation evidence' : `status set to ${status}`}.`, severity: 'info', route: '/issues' })
  },

  // Closing an audit finding resolves its 1:1 remediation issue; the finding then
  // reads Closed through effectiveFinding and the Open-findings metric drops.
  closeFinding: (auditId, findingId) => {
    const audit = getAudit(auditId)
    if (!audit) return
    const f = audit.findings.find((x) => x.id === findingId)
    if (!f) return
    if (f.linkedIssue) get().patchIssue(f.linkedIssue, { status: 'Resolved' })
    get().recordAction({ action: `Closed audit finding ${findingId}`, entityId: auditId, route: `/audits/${auditId}`, detail: f.title })
    get().notify({ title: 'Audit finding closed', body: `${findingId} - ${f.title}${f.linkedIssue ? ` · remediation ${f.linkedIssue} resolved` : ''}.`, severity: 'info', entityId: auditId, route: `/audits/${auditId}` })
  },

  // ── DSAR erasure-vs-retention workflow (Epic 4.2) ───────────────────────────
  // Walks the 5-step locate→retain→erase→log→audit sequence one stage at a time.
  // The final stage marks the request Fulfilled and generates an immutable
  // ATR-DSAR-* audit record (a session artifact) — the provable handling the DPDP
  // Board and internal audit can inspect. Session-override only; seed intact.
  advanceDsar: (id) => {
    const base = getDsar(id)
    if (!base) return
    const cur = { ...base, ...(get().dsarOverrides[id] ?? {}) }
    const total = dsarTotalSteps(cur.type)
    if (cur.step >= total) return
    const next = cur.step + 1
    const isFinal = next >= total
    get().patchDsar(id, isFinal ? { step: next, status: 'Fulfilled' } : { step: next, status: 'In review' })
    if (isFinal) {
      const atr = `ATR-${id}`
      get().addArtifact({ kind: 'report', title: `DSAR audit record ${atr}`, createdAt: NOW.toISOString(), payload: { dsarId: id, kind: 'dsar-audit-record' } })
      get().recordAction({ action: `Generated DSAR audit record ${atr}`, entityId: id, route: `/dpdp/dsar/${id}`, detail: `${cur.type} request fulfilled; immutable audit record written.` })
      get().notify({ title: 'DSAR fulfilled', body: `${id} - ${cur.type} request closed; audit record ${atr} generated.`, severity: 'info', entityId: id, route: `/dpdp/dsar/${id}` })
    } else {
      get().recordAction({ action: `Advanced DSAR ${id} to step ${next}/${total}`, entityId: id, route: `/dpdp/dsar/${id}`, detail: cur.note })
    }
  },

  // A personal-data breach surfaced while handling a request feeds the same
  // incident workflow (DPDP breach intimation) — routed to the live incident.
  flagDsarBreach: (id) => {
    const base = getDsar(id)
    if (!base) return
    get().recordAction({ action: `Flagged personal-data breach from ${id}`, entityId: MARQUEE.id, route: `/incidents/${MARQUEE.id}`, detail: `Routed to incident ${MARQUEE.id} for DPDP Board breach intimation.` })
    get().notify({ title: 'Breach routed to incident workflow', body: `${id} - personal-data breach escalated to ${MARQUEE.id}; DPDP Board 72-hour intimation track engaged.`, severity: 'warn', entityId: MARQUEE.id, route: `/incidents/${MARQUEE.id}` })
  },

  // ── Risk remediation workflow ───────────────────────────────────────────────
  // All five actions follow the house triad: patch the override, write the audit
  // entry, notify. The seed is never mutated, so a reload restores the demo.

  advanceRiskAction: (riskId, actionId) => {
    const risk = riskWithOverride(get(), riskId)
    if (!risk) return
    const action = risk.lifecycle.treatment.actions.find((a) => a.id === actionId)
    if (!action || action.status === 'Done') return

    // Not started -> In progress -> Done. Only the final step banks the residual
    // reduction, so the register never shows a gain that has not been delivered.
    const next: RiskAction['status'] = action.status === 'Not started' ? 'In progress' : 'Done'
    const done = next === 'Done'
    const actions = risk.lifecycle.treatment.actions.map((a) =>
      a.id !== actionId
        ? a
        : {
            ...a,
            status: next,
            milestones: a.milestones.map((m, i) => ({ ...m, done: done || i < a.milestones.length - 1 })),
          },
    )
    const residual = done ? Math.max(1, risk.residual - action.residualContribution) : risk.residual
    const history: TimelineEvent[] = [
      ...risk.lifecycle.history,
      {
        at: NOW.toISOString(),
        actor: get().currentPersonId(),
        channel: 'OneGRC',
        kind: done ? 'evidence' : 'note',
        text: done
          ? `Remediation action ${actionId} completed — residual reduced by ${action.residualContribution} to ${residual}/25.`
          : `Remediation action ${actionId} started.`,
      },
    ]
    get().patchRisk(riskId, {
      residual,
      trend: done && residual < risk.residual ? 'down' : risk.trend,
      lifecycle: { ...risk.lifecycle, treatment: { ...risk.lifecycle.treatment, actions }, history },
    })
    get().recordAction({
      action: done ? `Completed risk remediation action ${actionId}` : `Started risk remediation action ${actionId}`,
      entityId: riskId,
      route: `/risks/${riskId}`,
      detail: `${action.title}${done ? ` — residual ${risk.residual} → ${residual}` : ''}`,
    })
    if (done) {
      get().notify({
        title: 'Remediation action completed',
        body: `${riskId} - ${action.title}; residual now ${residual}/25 against a target of ${risk.lifecycle.treatment.targetResidual}/25.`,
        severity: 'info',
        entityId: riskId,
        route: `/risks/${riskId}`,
      })
    }
  },

  submitRiskTreatment: (riskId) => {
    const risk = riskWithOverride(get(), riskId)
    if (!risk) return
    const at = NOW.toISOString()
    const lifecycle = {
      ...risk.lifecycle,
      review: { ...risk.lifecycle.review, outcome: 'Pending' as const, reviewedOn: at },
      approval: { ...risk.lifecycle.approval, state: 'Submitted' as const, submittedOn: at },
      history: [
        ...risk.lifecycle.history,
        { at, actor: get().currentPersonId(), channel: 'OneGRC' as const, kind: 'note' as const, text: 'Treatment plan submitted for 2LoD review and maker-checker approval.' },
      ],
    }
    get().patchRisk(riskId, { lifecycle })
    get().recordAction({ action: `Submitted risk treatment plan ${riskId} for approval`, entityId: riskId, route: `/risks/${riskId}`, detail: risk.title })
    get().notify({ title: 'Risk treatment submitted', body: `${riskId} - ${risk.title} awaiting approval by ${personName(risk.lifecycle.approval.checker)}.`, severity: 'info', entityId: riskId, route: `/risks/${riskId}` })
  },

  approveRiskTreatment: (riskId) => {
    const risk = riskWithOverride(get(), riskId)
    if (!risk) return
    const at = NOW.toISOString()
    const checker = get().currentPersonId()
    const lifecycle = {
      ...risk.lifecycle,
      review: { ...risk.lifecycle.review, reviewer: checker, outcome: 'Endorsed' as const, reviewedOn: at },
      approval: { ...risk.lifecycle.approval, checker, state: 'Approved' as const, approvedOn: at },
      history: [
        ...risk.lifecycle.history,
        { at, actor: checker, channel: 'OneGRC' as const, kind: 'notify' as const, text: `Treatment plan approved under maker-checker; risk moved to monitoring on a ${risk.lifecycle.ownership.reviewFrequency.toLowerCase()} review cycle.` },
      ],
    }
    get().patchRisk(riskId, { lifecycle, status: 'Monitoring', lastReviewed: at })
    get().recordAction({ action: `Approved risk treatment plan ${riskId}`, entityId: riskId, route: `/risks/${riskId}`, detail: `${risk.title} — residual ${risk.residual}/25 against target ${risk.lifecycle.treatment.targetResidual}/25` })
    get().notify({ title: 'Risk treatment approved', body: `${riskId} - ${risk.title} approved under maker-checker and moved to monitoring.`, severity: 'info', entityId: riskId, route: `/risks/${riskId}` })
  },

  returnRiskTreatment: (riskId, note) => {
    const risk = riskWithOverride(get(), riskId)
    if (!risk) return
    const at = NOW.toISOString()
    const checker = get().currentPersonId()
    const reason = note?.trim() || 'Returned to the owner for further evidence before approval.'
    const lifecycle = {
      ...risk.lifecycle,
      review: { ...risk.lifecycle.review, reviewer: checker, outcome: 'Returned' as const, reviewedOn: at, note: reason },
      approval: { ...risk.lifecycle.approval, state: 'Drafted' as const },
      history: [
        ...risk.lifecycle.history,
        { at, actor: checker, channel: 'OneGRC' as const, kind: 'triage' as const, text: `2LoD review returned — ${reason}` },
      ],
    }
    get().patchRisk(riskId, { lifecycle })
    get().recordAction({ action: `Returned risk treatment plan ${riskId}`, entityId: riskId, route: `/risks/${riskId}`, detail: reason })
    get().notify({ title: 'Risk treatment returned', body: `${riskId} - returned to ${personName(risk.owner)}. ${reason}`, severity: 'warn', entityId: riskId, route: `/risks/${riskId}` })
  },

  acceptRisk: (riskId, args) => {
    const risk = riskWithOverride(get(), riskId)
    if (!risk) return
    const at = NOW.toISOString()
    const acceptedBy = get().currentPersonId()
    const lifecycle = {
      ...risk.lifecycle,
      treatment: { ...risk.lifecycle.treatment, decision: 'Accept' as const },
      approval: { ...risk.lifecycle.approval, checker: acceptedBy, state: 'Approved' as const, approvedOn: at },
      acceptance: { acceptedBy, acceptedOn: at, rationale: args.rationale, compensatingControlId: args.compensatingControlId, expiresOn: args.expiresOn },
      history: [
        ...risk.lifecycle.history,
        { at, actor: acceptedBy, channel: 'OneGRC' as const, kind: 'notify' as const, text: `Risk formally accepted at residual ${risk.residual}/25 until ${args.expiresOn.slice(0, 10)}; acceptance expires and does not auto-renew.` },
      ],
    }
    get().patchRisk(riskId, { lifecycle, treatment: 'Accept', status: 'Accepted' })
    get().recordAction({ action: `Accepted risk ${riskId} with a bounded expiry`, entityId: riskId, route: `/risks/${riskId}`, detail: `${risk.title} — expires ${args.expiresOn.slice(0, 10)}` })
    get().notify({ title: 'Risk accepted', body: `${riskId} - accepted at residual ${risk.residual}/25; acceptance expires ${args.expiresOn.slice(0, 10)}.`, severity: 'warn', entityId: riskId, route: `/risks/${riskId}` })
  },

  // ── Exception register ──────────────────────────────────────────────────────

  raiseException: (args) => {
    const id = `ISS-EX-${String(++exceptionSeq).padStart(3, '0')}`
    const requester = get().currentPersonId()
    const issue: Issue = {
      id,
      title: `Exception — ${args.refTitle}`,
      source: 'Exception',
      sourceRef: args.refId,
      severity: args.severity,
      owner: requester,
      dueDate: args.expiresOn,
      ageDays: 0,
      status: 'Open',
      linkedControls: args.refId.startsWith('CTRL-') ? [args.refId] : args.compensatingControl ? [args.compensatingControl] : [],
      exception: {
        reason: args.reason,
        compensatingControl: args.compensatingControl,
        requestedBy: requester,
        approvedBy: args.approvedBy,
        approvalState: 'Requested',
        requestedOn: NOW.toISOString(),
        expiresOn: args.expiresOn,
        renewalCount: 0,
      },
    }
    get().addSessionIssue(issue)
    get().recordAction({
      action: `Raised exception request ${id} against ${args.refId}`,
      entityId: id,
      route: `/issues/${id}`,
      detail: `${args.reason.slice(0, 120)} · expires ${args.expiresOn.slice(0, 10)} · to ${personName(args.approvedBy)} for approval`,
    })
    get().notify({
      title: 'Exception raised',
      body: `${id} against ${args.refId} — awaiting approval by ${personName(args.approvedBy)}.`,
      severity: 'warn',
      entityId: id,
      route: `/issues/${id}`,
    })
    return id
  },

  approveException: (issueId, approve) => {
    const base = getIssue(issueId) ?? get().sessionIssues.find((i) => i.id === issueId)
    if (!base) return
    const cur = { ...base, ...(get().issueOverrides[issueId] ?? {}) }
    if (!cur.exception) return
    const actor = get().currentPersonId()
    const exception = {
      ...cur.exception,
      approvedBy: actor,
      approvalState: (approve ? 'Approved' : 'Rejected') as 'Approved' | 'Rejected',
      approvedOn: NOW.toISOString(),
    }
    get().patchIssue(issueId, { exception, status: approve ? 'Open' : 'Resolved' })
    get().recordAction({
      action: `${approve ? 'Approved' : 'Rejected'} exception ${issueId}`,
      entityId: issueId,
      route: `/issues/${issueId}`,
      detail: `${cur.sourceRef} · ${approve ? `in force until ${exception.expiresOn.slice(0, 10)}` : 'deviation refused; remediation stands'}`,
    })
    get().notify({
      title: `Exception ${approve ? 'approved' : 'rejected'}`,
      body: `${issueId} on ${cur.sourceRef}${approve ? ` — expires ${exception.expiresOn.slice(0, 10)}.` : ' — the original remediation date stands.'}`,
      severity: approve ? 'warn' : 'info',
      entityId: issueId,
      route: `/issues/${issueId}`,
    })
  },

  renewException: (issueId, expiresOn) => {
    const base = getIssue(issueId) ?? get().sessionIssues.find((i) => i.id === issueId)
    if (!base) return
    const cur = { ...base, ...(get().issueOverrides[issueId] ?? {}) }
    if (!cur.exception) return
    const exception = {
      ...cur.exception,
      expiresOn,
      renewalCount: cur.exception.renewalCount + 1,
      approvedBy: get().currentPersonId(),
      approvedOn: NOW.toISOString(),
      approvalState: 'Approved' as const,
    }
    get().patchIssue(issueId, { exception, dueDate: expiresOn, status: 'Open' })
    get().recordAction({
      action: `Renewed exception ${issueId} (renewal ${exception.renewalCount})`,
      entityId: issueId,
      route: `/issues/${issueId}`,
      detail: `${cur.sourceRef} · new expiry ${expiresOn.slice(0, 10)}`,
    })
    get().notify({
      title: 'Exception renewed',
      body: `${issueId} extended to ${expiresOn.slice(0, 10)} — renewal ${exception.renewalCount}.`,
      severity: 'warn',
      entityId: issueId,
      route: `/issues/${issueId}`,
    })
  },

  closeException: (issueId) => {
    const base = getIssue(issueId) ?? get().sessionIssues.find((i) => i.id === issueId)
    if (!base) return
    const cur = { ...base, ...(get().issueOverrides[issueId] ?? {}) }
    if (!cur.exception) return
    get().patchIssue(issueId, { exception: { ...cur.exception, closedOn: NOW.toISOString() }, status: 'Resolved' })
    get().recordAction({
      action: `Closed exception ${issueId}`,
      entityId: issueId,
      route: `/issues/${issueId}`,
      detail: `${cur.sourceRef} · underlying condition remediated; deviation withdrawn`,
    })
    get().notify({
      title: 'Exception closed',
      body: `${issueId} on ${cur.sourceRef} closed — the deviation no longer applies.`,
      severity: 'info',
      entityId: issueId,
      route: `/issues/${issueId}`,
    })
  },

  // ── Board / committee reporting packs ───────────────────────────────────────

  getPack: (packId) => get().packs.find((p) => p.id === packId),

  draftPack: (args) => {
    const id = `PACK-${++packSeq}`
    const pack: GeneratedPack = {
      id,
      audience: args.audience,
      period: args.period,
      sectionIds: args.sectionIds,
      format: args.format,
      narrative: args.narrative,
      narrativeState: 'Draft',
      preparedBy: get().currentPersonId(),
      preparedAt: NOW.toISOString(),
      obligationId: args.obligationId,
      taskId: args.taskId,
      evidencedControls: args.evidencedControls,
    }
    set((s) => ({ packs: [pack, ...s.packs] }))
    get().recordAction({
      action: `Drafted ${args.audience} pack ${id}`,
      entityId: args.obligationId ?? id,
      route: args.obligationId ? `/obligations/${args.obligationId}` : undefined,
      detail: `${args.period} · ${args.sectionIds.length} sections · ${args.format} · narrative awaiting approval`,
    })
    return id
  },

  approvePackNarrative: (packId, approve) => {
    const pack = get().packs.find((p) => p.id === packId)
    if (!pack) return
    const actor = get().currentPersonId()
    set((s) => ({
      packs: s.packs.map((p) =>
        p.id === packId
          ? { ...p, narrativeState: approve ? 'Approved' : 'Returned', approvedBy: actor, approvedOn: NOW.toISOString() }
          : p,
      ),
    }))
    get().recordAction({
      action: `${approve ? 'Approved' : 'Returned'} executive narrative on ${pack.audience} pack ${packId}`,
      entityId: packId,
      detail: approve ? 'Cleared for issue under maker-checker.' : 'Returned to the preparer; the pack cannot be issued.',
    })
  },

  issuePack: (packId) => {
    const pack = get().packs.find((p) => p.id === packId)
    if (!pack) return
    // The gate: an unapproved narrative cannot be issued. Enforced here as well
    // as in the UI, so the rule holds however the action is reached.
    if (pack.narrativeState !== 'Approved') return

    const stem = pack.audience.toLowerCase().replace(/[^a-z]+/g, '-')
    const title = `${pack.audience} pack — ${pack.period}`

    // Filing the pack IS the evidence for the committee-meeting task. Reuses the
    // existing task evidence flow, so the pack lands on the obligation's proof
    // chain rather than in a separate reports bucket.
    let evidenceId: string | undefined
    if (pack.taskId && pack.obligationId) {
      evidenceId = get().attachTaskEvidence({
        taskId: pack.taskId,
        obligationId: pack.obligationId,
        controlId: pack.evidencedControls[0],
        title,
        type: 'Attestation',
      })
    } else {
      evidenceId = get().addManualEvidence({ title, type: 'Attestation' })
    }

    get().addArtifact({
      kind: 'report',
      title,
      createdAt: NOW.toISOString(),
      payload: { packId, filename: `${stem}-${pack.period.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.${pack.format === 'PDF' ? 'pdf' : 'xlsx'}` },
    })

    set((s) => ({ packs: s.packs.map((p) => (p.id === packId ? { ...p, issuedAt: NOW.toISOString(), evidenceId } : p)) }))

    get().recordAction({
      action: `Issued ${pack.audience} pack ${packId}`,
      entityId: pack.obligationId ?? packId,
      route: pack.obligationId ? `/obligations/${pack.obligationId}` : `/evidence/${evidenceId}`,
      detail: `${pack.format} · filed as evidence ${evidenceId}${pack.obligationId ? ` against ${pack.obligationId}` : ''} · evidences ${pack.evidencedControls.join(', ') || 'no controls'}`,
    })
    get().notify({
      title: `${pack.audience} pack issued`,
      body: `${title} filed as evidence ${evidenceId}${pack.obligationId ? ` against ${pack.obligationId}.` : '.'}`,
      severity: 'info',
      entityId: evidenceId,
      route: `/evidence/${evidenceId}`,
    })
  },

  // ── Audit working papers ────────────────────────────────────────────────────

  raiseFindingFromPaper: (paperId) => {
    const base = WORLD.workingPapers.find((p) => p.id === paperId)
    if (!base) return undefined
    const paper = { ...base, ...(get().paperOverrides[paperId] ?? {}) }
    if (paper.result !== 'Fail' || paper.findingId) return undefined

    const audit = getAudit(paper.auditId)
    if (!audit) return undefined

    // Continue the audit's own finding numbering, including any raised this session.
    const existing = [...audit.findings, ...(get().sessionFindings[audit.id] ?? [])]
    const nextNum = existing.reduce((m, f) => {
      const n = Number(f.id.split('-F')[1])
      return Number.isFinite(n) ? Math.max(m, n) : m
    }, 0) + 1
    const findingId = `${audit.id}-F${nextNum}`

    // Severity follows how much of the sample failed, where a sample was taken.
    const severity: Issue['severity'] = paper.controlTested && (paper.sampleSize ?? 0) >= 20 ? 'High' : 'Medium'

    // The remediation issue is created through the same shape as every seeded
    // finding-sourced issue, so it enters the existing chain unchanged.
    const issueId = `ISS-WP-${String(++paperFindingSeq).padStart(3, '0')}`
    const owner = paper.controlTested ? getControl(paper.controlTested)?.owner ?? paper.tester : paper.tester
    get().addSessionIssue({
      id: issueId,
      title: `Audit finding remediation (${findingId}) — ${paper.objective.replace(/^Test that /, '')}`,
      source: 'Audit finding',
      sourceRef: findingId,
      severity,
      owner,
      dueDate: new Date(NOW.getTime() + 45 * 86400000).toISOString(),
      ageDays: 0,
      status: 'Open',
      linkedControls: paper.controlTested ? [paper.controlTested] : [],
    })

    const finding: AuditFinding = { id: findingId, title: paper.conclusion.split('.')[0], severity, status: 'Remediation', linkedIssue: issueId }
    set((s) => ({
      sessionFindings: { ...s.sessionFindings, [audit.id]: [...(s.sessionFindings[audit.id] ?? []), finding] },
      paperOverrides: { ...s.paperOverrides, [paperId]: { ...s.paperOverrides[paperId], findingId } },
    }))

    get().recordAction({
      action: `Raised finding ${findingId} from working paper ${paper.reference}`,
      entityId: audit.id,
      route: `/audits/${audit.id}`,
      detail: `${paper.objective} · ${paper.sampleSize ?? '—'}/${paper.populationSize ?? '—'} sampled · remediation ${issueId} against ${personName(owner)}`,
    })
    get().notify({
      title: 'Audit finding raised',
      body: `${findingId} from ${paper.reference} — remediation ${issueId} assigned to ${personName(owner)}.`,
      severity: severity === 'High' ? 'warn' : 'info',
      entityId: audit.id,
      route: `/audits/${audit.id}`,
    })
    return findingId
  },

  // ── Campaigns ───────────────────────────────────────────────────────────────

  launchCampaign: (args) => {
    const id = `CMP-${args.type === 'RCSA' ? 'RCSA' : args.type === 'Policy attestation' ? 'ATT' : 'VDD'}-S${++campaignSeq}`
    const launchedBy = get().currentPersonId()
    const tasks: CampaignTask[] = args.objectIds.map((objectId, i) => {
      const assignee = args.assigneeFor(objectId)
      // A reviewer is never the assignee — the same separation the rest of the
      // platform enforces on every maker-checker pair.
      const reviewer = checkerFor(assignee)
      return {
        id: `CMPT-${id}-${String(i + 1).padStart(2, '0')}`,
        campaignId: id,
        assignee,
        objectId,
        status: 'Not started',
        reviewer,
        response: {},
        evidenceIds: [],
      }
    })
    const campaign: Campaign = {
      id,
      type: args.type,
      title: args.title,
      scope: { objectIds: args.objectIds },
      period: args.period,
      launchedOn: NOW.toISOString(),
      dueOn: args.dueOn,
      launchedBy,
      status: 'In progress',
      tasks,
      obligationId: args.obligationId,
    }
    set((s) => ({ sessionCampaigns: [campaign, ...s.sessionCampaigns] }))
    get().recordAction({
      action: `Launched ${args.type} campaign ${id}`,
      entityId: id,
      route: `/campaigns/${id}`,
      detail: `${args.title} · ${tasks.length} assessments fanned out · due ${args.dueOn.slice(0, 10)}`,
    })
    get().notify({
      title: 'Campaign launched',
      body: `${id} — ${tasks.length} tasks routed to their owners, due ${args.dueOn.slice(0, 10)}.`,
      severity: 'info',
      entityId: id,
      route: `/campaigns/${id}`,
    })
    return id
  },

  submitCampaignTask: (campaignId, taskId, response) => {
    const c = campaignWithOverride(get(), campaignId)
    if (!c || c.status === 'Closed') return
    const tasks = c.tasks.map((t) =>
      t.id === taskId ? { ...t, status: 'Submitted' as const, submittedOn: NOW.toISOString(), response, reviewNote: undefined } : t,
    )
    patchCampaign(get(), set, campaignId, { tasks })
    const task = tasks.find((t) => t.id === taskId)
    get().recordAction({
      action: `Submitted campaign task ${taskId}`,
      entityId: campaignId,
      route: `/campaigns/${campaignId}`,
      detail: `${c.title} · ${task?.objectId} · awaiting review by ${personName(task?.reviewer ?? '')}`,
    })
  },

  reviewCampaignTask: (campaignId, taskId, approve, note) => {
    const c = campaignWithOverride(get(), campaignId)
    if (!c || c.status === 'Closed') return
    const actor = get().currentPersonId()
    const tasks = c.tasks.map((t) =>
      t.id === taskId
        ? {
            ...t,
            status: (approve ? 'Approved' : 'Returned') as CampaignTask['status'],
            reviewer: actor,
            reviewedOn: NOW.toISOString(),
            reviewNote: approve ? undefined : note?.trim() || 'Returned to the assignee for rework.',
          }
        : t,
    )
    patchCampaign(get(), set, campaignId, { tasks })
    const task = tasks.find((t) => t.id === taskId)

    // An approved self-assessment is authoritative: it re-scores the risk on
    // the register. A cycle that collects opinions and files them changes
    // nothing, which is the failure mode this exists to avoid.
    if (approve && c.type === 'RCSA' && task) {
      const risk = riskWithOverride(get(), task.objectId)
      const response = risk ? asRcsa(task) : undefined
      if (risk && response) {
        const changes = rcsaDelta(risk, response)
        get().patchRisk(risk.id, applyRcsa(risk, response, actor, campaignId))
        get().recordAction({
          action: `Re-scored ${risk.id} from self-assessment ${campaignId}`,
          entityId: risk.id,
          route: `/risks/${risk.id}`,
          detail:
            changes.length > 0
              ? changes.map((ch) => `${ch.field} ${ch.from} → ${ch.to}`).join(' · ')
              : 'Position re-confirmed — no change to the score.',
        })
        if (changes.some((ch) => ch.field === 'Residual')) {
          get().notify({
            title: 'Risk re-scored',
            body: `${risk.id} residual ${risk.residual} → ${response.proposedResidual} following ${campaignId}.`,
            severity: response.proposedResidual > risk.residual ? 'warn' : 'info',
            entityId: risk.id,
            route: `/risks/${risk.id}`,
          })
        }
      }
    }

    // An approved due-diligence review is the decision of record on an
    // outsourcing arrangement: it stamps the diligence date, re-rates the
    // vendor where the reviewer said so, and moves a vendor into exit or
    // remediation. The register reflects the review, not the other way round.
    if (approve && c.type === 'Vendor due diligence' && task) {
      const vendor = vendorWithOverride(get(), task.objectId)
      const dd = vendor ? asVendorDd(task) : undefined
      if (vendor && dd) {
        const changes = vendorDdDelta(vendor, dd)
        get().patchVendor(vendor.id, applyVendorDd(vendor, dd))
        get().recordAction({
          action: `Concluded due diligence on ${vendor.id} — ${dd.recommendation}`,
          entityId: vendor.id,
          route: `/vendors/${vendor.id}`,
          detail: `${vendor.name} · ${changes.map((ch) => `${ch.field} ${ch.from} → ${ch.to}`).join(' · ')}`,
        })
        if (dd.recommendation === 'Exit' || dd.recommendation === 'Remediate') {
          get().notify({
            title: dd.recommendation === 'Exit' ? 'Vendor exit triggered' : 'Vendor routed to remediation',
            body: `${vendor.name} — ${dd.conditions ?? dd.rationale.slice(0, 120)}`,
            severity: 'warn',
            entityId: vendor.id,
            route: `/vendors/${vendor.id}`,
          })
        }
      }
    }

    // An acknowledgement does not change the policy — coverage is derived. What
    // does write back is a declared inability to comply: it leaves the campaign
    // and becomes a time-boxed exception with an owner and an expiry, which is
    // the only place a known deviation is allowed to live.
    if (approve && c.type === 'Policy attestation' && task) {
      const policy = getPolicy(task.objectId)
      const ack = asAttestation(task)
      if (policy && ack?.declaration?.kind === 'Cannot comply' && !ack.declaration.issueId) {
        const spec = exceptionFromDeclaration(policy, ack.declaration.detail)
        const issueId = `ISS-EX-${String(++exceptionSeq).padStart(3, '0')}`
        get().addSessionIssue({
          id: issueId,
          title: `Exception — ${policy.title} ${policy.version}`,
          source: 'Exception',
          sourceRef: policy.id,
          severity: spec.severity,
          owner: task.assignee,
          dueDate: spec.expiresOn,
          ageDays: 0,
          status: 'Open',
          linkedControls: policy.mappedControls.slice(0, 1),
          exception: {
            reason: spec.reason,
            requestedBy: task.assignee,
            approvedBy: actor,
            approvalState: 'Requested',
            requestedOn: NOW.toISOString(),
            expiresOn: spec.expiresOn,
            renewalCount: 0,
          },
        })
        // Stamp the issue id back onto the response so the record shows where
        // the declaration went.
        patchCampaign(get(), set, campaignId, {
          tasks: tasks.map((t) =>
            t.id === taskId
              ? { ...t, response: { ...t.response, declaration: { ...ack.declaration!, issueId } } }
              : t,
          ),
        })
        get().recordAction({
          action: `Raised exception ${issueId} from attestation declaration on ${policy.id}`,
          entityId: issueId,
          route: `/issues/${issueId}`,
          detail: `${personName(task.assignee)} declared they cannot comply with ${policy.title} ${policy.version} · expires ${spec.expiresOn.slice(0, 10)}`,
        })
        get().notify({
          title: 'Attestation declaration raised as an exception',
          body: `${personName(task.assignee)} cannot comply with ${policy.title} ${policy.version} — ${issueId} awaits approval.`,
          severity: 'warn',
          entityId: issueId,
          route: `/issues/${issueId}`,
        })
      }
    }

    get().recordAction({
      action: `${approve ? 'Approved' : 'Returned'} campaign task ${taskId}`,
      entityId: campaignId,
      route: `/campaigns/${campaignId}`,
      detail: `${c.title} · ${task?.objectId}${approve ? '' : ` · ${task?.reviewNote}`}`,
    })
    if (!approve) {
      get().notify({
        title: 'Campaign submission returned',
        body: `${task?.objectId} returned to ${personName(task?.assignee ?? '')}.`,
        severity: 'warn',
        entityId: campaignId,
        route: `/campaigns/${campaignId}`,
      })
    }
  },

  closeCampaign: (campaignId) => {
    const c = campaignWithOverride(get(), campaignId)
    if (!c || c.status === 'Closed') return
    const approved = c.tasks.filter((t) => t.status === 'Approved').length
    const title = `${c.type} completion certificate — ${c.title} (${approved}/${c.tasks.length} approved)`
    // The certificate is a real Evidence Vault item, filed against the recurring
    // obligation the cycle discharges where there is one.
    const evidenceId = get().addManualEvidence({ title, type: 'Attestation', obligationId: c.obligationId })
    patchCampaign(get(), set, campaignId, { status: 'Closed', closedOn: NOW.toISOString(), evidenceId })
    get().recordAction({
      action: `Closed campaign ${campaignId}`,
      entityId: campaignId,
      route: `/campaigns/${campaignId}`,
      detail: `${approved} of ${c.tasks.length} approved · certificate ${evidenceId}${c.obligationId ? ` filed against ${c.obligationId}` : ''}`,
    })
    get().notify({
      title: 'Campaign closed',
      body: `${c.title} — completion certificate ${evidenceId} filed to the Evidence Vault.`,
      severity: 'info',
      entityId: evidenceId,
      route: `/evidence/${evidenceId}`,
    })
  },
}))
