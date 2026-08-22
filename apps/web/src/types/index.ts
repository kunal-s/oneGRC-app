// OneGRC — entity type definitions (A6). All entities cross-link by id.

export type Framework = 'ISO 27001' | 'NIST CSF' | 'PCI DSS' | 'PFRDA ICS'
export type Severity = 'Critical' | 'High' | 'Medium' | 'Low'
export type RiskDomain =
  | 'IT'
  | 'Cyber'
  | 'Operational'
  | 'Investment'
  | 'Compliance'
  | 'ThirdParty'
export type Regulator =
  | 'PFRDA'
  | 'CERT-In'
  | 'DPDP'
  | 'GST'
  | 'Labour'
  | 'Companies Act'

export type LineOfDefence = '1LoD' | '2LoD' | '3LoD'

// The department dimension (enhancement plan 1.1). A department is derived from
// the owner's function; every obligation, control, policy, task and approval
// takes its department from whoever owns it. The set is fixed; every department
// has at least one named owner. Compliance and the administrator keep the
// all-departments view; a department user sees only their own department.
export type Department =
  | 'Compliance and Company Secretarial'
  | 'Risk'
  | 'IT and Information Security'
  | 'Investment Compliance'
  | 'Data Protection'
  | 'Finance and Tax'
  | 'HR and Labour'
  | 'Internal Audit'

// ── Provenance (Epic 1 — Source and Provenance; normalized in Epic 15) ───────
// THE single source model, normalized into a parent SourceInstrument (the legal
// instrument — Act / Rules / Circular / Standard) and provision-level
// SourceProvision children (the exact section / rule / clause). Held inline so a
// future document repository slots behind the same types. Reused by Obligation,
// Policy, Control framework mappings, future penalty/consequence tiers and the
// future Compliance Intake record (Epic 14). There is deliberately no second
// source model anywhere.
export type InstrumentType =
  | 'Act'
  | 'Rules'
  | 'Regulation'
  | 'Master Circular'
  | 'Notification'
  | 'Direction'
  | 'Standard'
  | 'Circular'

// Where the instrument was sourced from.
export type SourceChannel =
  | 'Regulator site'
  | 'Official Gazette'
  | 'Content feed'
  | 'Manual upload'

export type InstrumentStatus = 'In force' | 'Superseded' | 'Draft' | 'Repealed'

// The session-held artifact behind an instrument (a document repository slots
// behind this) — e.g. "replace with newer version".
// is a toast.
export interface AttachedDocument {
  filename: string // 'PFRDA-MC-Investment-Guidelines-10Dec2025.pdf'
  label: string // 'Master Circular (PDF)'
  capturedAt: string // ISO — when the artifact was attached this session
  sizeLabel: string // '412 KB' (non-round, A4)
}

// Parent — the legal instrument. Instrument-level fields live here once.
export interface SourceInstrument {
  id: string // 'INST-EPF-1952'
  title: string // 'Employees’ Provident Funds & Miscellaneous Provisions Act, 1952'
  authority: string // issuing authority, e.g. 'EPFO' | 'MCA' | 'PFRDA' | 'CBIC' | 'ISO'
  regulator?: Regulator // mapped Regulator where one applies
  instrumentType: InstrumentType
  referenceNumber?: string // circular / notification number, only where genuinely known
  dateOfIssue: string // ISO
  effectiveDate?: string // ISO — distinct from any due date
  version?: string // 'v2025.12' / '2022 edition'
  supersedesId?: string // the prior SourceInstrument this replaces
  supersededById?: string // reverse link — set on the older instrument
  sourceChannel: SourceChannel
  sourceLink: string // URL
  attachedDocument?: AttachedDocument
  status: InstrumentStatus
  // Act-level overview shown at the top of the act detail (Sources pipeline).
  summary?: string // plain "what this act covers"
  applicability?: string // plain "how it affects SPF" — the applicability overview
  departments?: Department[] // explicit routing for AI-created acts (E0.6 / 1.6); seed acts derive from owners
  createdInSession?: boolean // minted via the in-app Create Source Act flow
}

// A scripted, deterministic action from an agent (here, the ingestion agent).
// Carries provenance + confidence; never a model API call. The applicability
// recommendation slice — the fuller agentic workflow comes later.
export interface AgentAction {
  agent: string // 'Ingestion Agent'
  recommendation: string // the proposed outcome, plain English
  confidence: number // 0–100 (non-round, A4)
  at: string // ISO — when the agent produced it
  basis: string // provenance — what the recommendation was derived from
}

// One penalty/consequence tier of a clause, each sourced. Its severity feeds
// the deterministic severity-from-penalty.
export interface PenaltyTier {
  trigger: string // 'Late filing of the annual return'
  consequence: string // '₹100 per day, max ₹2,00,000'
  severity: Severity // gravity of this tier
  sourceRef: string // SourceProvision id stating this penalty
}

// The clause pipeline status (Sources pipeline): a new clause is Processing /
// Recommended, then it is Saved (mapped to a control and tracked), sent to a
// specialist, or marked Not applicable.
export type ClauseStatus =
  | 'Processing'
  | 'Recommended'
  | 'Saved'
  | 'Specialist review'
  | 'Not applicable'

// Child — a clause/section of one instrument (act). Owns the per-clause
// structured compliance fields and the act → clause → control pipeline.
export interface SourceProvision {
  id: string // 'SRC-EPF-14B' — keeps the SRC- prefix; cited by obligations/policies/controls
  instrumentId: string // parent SourceInstrument
  provision: string // PINNED — the exact section, rule, clause or paragraph
  title: string // short clause title, e.g. 'Section 14B — Damages for default'
  citation: string // formal full citation line
  sourceExtract: string // short real excerpt of the cited clause
  sourceLink?: string // optional per-clause deep link (else the instrument's)
  attachedDocument?: AttachedDocument // optional per clause
  // Structured compliance fields (set on statutory clauses; absent on pure
  // framework-standard references).
  nameOfCompliance?: string // 'PF contribution — damages on default'
  briefDescription?: string // one-line description
  whatItMeans?: string // plain-English explanation of what the clause requires in practice
  keyParts?: string[] // the key obligations/parts of the clause
  penaltyTiers?: PenaltyTier[] // consequence tiers, each sourced
  severity?: Severity // derived from the penalty tiers (severity-from-penalty)
  frequency?: string // 'Monthly' | 'Quarterly' | 'Annual' | 'Event-based'
  nextDue?: string // ISO — next due date, where applicable
  // Applicability to SPF + the scripted recommendation (no model call).
  applicable?: boolean // applicable / not applicable to SPF
  applicabilityBasis?: string // why it applies (or not)
  aiRecommendation?: AgentAction
  // The act → clause → control pipeline.
  status?: ClauseStatus
  reviewer?: string // person id (Compliance / Company Secretary) who acted
  reviewedAt?: string // ISO
  rationale?: string // the reviewer's reason
  specialistNote?: string // specialist outcome (what to implement), set on completion
  linkedControlId?: string // the control this clause is saved to (Save → Control Library)
}

export interface Person {
  id: string
  name: string
  title: string
  role: RoleKey
  initials: string
  lod: LineOfDefence
  email: string
  department: Department // the function this person belongs to (1.1)
}

// The 7 functional personas the app is organised around. The switcher selects a
// persona; each is backed by a representative roster person (see data/people.ts).
export type RoleKey =
  | 'EXEC' // Executive (board roll-up + exceptions)
  | 'RISK' // Risk Manager (register, heat map, treatment)
  | 'CCO' // Compliance Manager (obligations, approvals, clause decisions)
  | 'ANALYST' // Compliance Analyst (first-line filings + clause-pipeline work)
  | 'CTRLOWNER' // Control Owner (controls, tests, CCM, evidence)
  | 'AUDITOR' // Auditor (audits, findings, remediation, evidence trail)
  | 'ADMIN' // Administrator (org/users/roles/config, audit log)
  // Board-committee audiences. These are governance hats worn by people who also
  // hold an executive persona — Sunita Menon runs Internal Audit AND chairs the
  // Audit Committee — so they are selected as a persona, not a second Person.
  // Read-mostly by construction: a committee oversees, it does not operate.
  | 'ARC' // Audit Committee Chair
  | 'RMC' // Risk Management Committee Chair

export interface Risk {
  id: string
  title: string
  domain: RiskDomain
  owner: string // person id
  likelihood: number // 1-5
  impact: number // 1-5
  inherent: number // 1-25
  residual: number // 1-25
  treatment: 'Mitigate' | 'Accept' | 'Transfer' | 'Avoid'
  linkedControls: string[]
  linkedIncidents: string[]
  linkedIssues: string[]
  status: 'Open' | 'Monitoring' | 'Mitigated' | 'Accepted'
  trend: 'up' | 'down' | 'flat'
  lastReviewed: string // ISO
  description: string
  // The remediation workflow this risk sits on (identification -> assessment ->
  // treatment -> execution -> evidence -> review -> approval -> monitoring).
  // Every risk carries one, so no stage is ever an empty state.
  lifecycle: RiskLifecycle
}

// ── Risk remediation workflow ────────────────────────────────────────────────
// Shaped after ISO 31000:2018 6.5.3 (a treatment plan states the rationale for
// the option chosen, who approves and who implements, the actions, how progress
// is measured, and when actions complete) and 6.6/6.7 (residual risk is
// documented and kept under monitoring and review). The execution layer
// deliberately mirrors ObligationSubStep/Task so maker-checker, evidence and the
// 7/3/1 reminder ladder are the SAME machinery, not a second copy of it.

/** Where a risk came from — always traceable to an originating record. */
export type RiskSourceKind =
  | 'RCSA'
  | 'Audit finding'
  | 'Incident'
  | 'Regulatory change'
  | 'Control failure'
  | 'Manual'

/** The derived position of a risk on its remediation workflow. Never stored —
 *  `deriveRiskStage` computes it, so the register and the detail cannot disagree. */
export type RiskStage =
  | 'Identified'
  | 'Assessed'
  | 'Treatment planned'
  | 'In execution'
  | 'Evidenced'
  | 'Under review'
  | 'Awaiting approval'
  | 'Monitoring'
  | 'Closed'
  | 'Accepted'
  | 'Exception expired'

export interface RiskIdentification {
  kind: RiskSourceKind
  ref?: string // originating record id — resolved and linked via resolveEntity()
  identifiedOn: string // ISO
  identifiedBy: string // person id
  method: string // how it was found, e.g. 'Half-yearly RCSA workshop — Operational'
}

export interface RiskOwnership {
  delegate?: string // person id acting for the owner
  lod: LineOfDefence // stored, not inferred, so a 2LoD-owned risk is explicit
  reviewFrequency: 'Quarterly' | 'Half-yearly' | 'Annual'
  nextReviewOn: string // ISO — drives the review ladder
}

export interface RiskActionMilestone {
  label: string
  dueDate: string // ISO
  done: boolean
}

/** One discrete remediation action. Same anatomy as ObligationSubStep so it
 *  plugs into ladderFor(), maker-checker and the evidence vault unchanged. */
export interface RiskAction {
  id: string // 'RACT-INV-0070-1'
  seq: number
  title: string
  owner: string // maker — who does the work
  reviewer: string // checker — who verifies it
  dueDate: string // ISO
  status: 'Not started' | 'In progress' | 'Done' | 'Blocked'
  milestones: RiskActionMilestone[]
  residualContribution: number // residual points removed once this action lands
  evidenceIds: string[]
  issueId?: string // the Issue in /issues tracking this action
  dependsOnSeq?: number
}

export interface RiskTreatment {
  decision: Risk['treatment']
  rationale: string // ISO 31000 6.5.3 — why this option was chosen
  targetResidual: number // 1-25 — the "to" of the treatment, a real field
  targetDate: string // ISO
  actions: RiskAction[]
}

export interface RiskReview {
  reviewer: string // person id (2LoD)
  outcome: 'Pending' | 'Endorsed' | 'Returned'
  reviewedOn?: string // ISO
  note?: string
}

/** Structurally compatible with Obligation['makerChecker'], plus dates. */
export interface RiskApproval {
  maker: string
  checker: string
  state: 'Drafted' | 'Submitted' | 'Approved' | 'Pending'
  submittedOn?: string // ISO
  approvedOn?: string // ISO
}

/** Formal acceptance where residual sits above target. Time-bound by design:
 *  an acceptance always expires and is then renewed, closed or escalated. */
export interface RiskAcceptance {
  acceptedBy: string // person id
  acceptedOn: string // ISO
  rationale: string
  compensatingControlId?: string
  expiresOn: string // ISO
}

export interface RiskLifecycle {
  identification: RiskIdentification
  ownership: RiskOwnership
  treatment: RiskTreatment
  review: RiskReview
  approval: RiskApproval
  acceptance?: RiskAcceptance
  history: TimelineEvent[] // reuses the existing TimelineEvent — no widening
}

export interface Control {
  id: string
  title: string
  frameworks: Framework[]
  mappedFrameworkRefs: { framework: Framework; ref: string; sourceRef?: string }[]
  owner: string
  type: 'Preventive' | 'Detective'
  automation: 'CCM' | 'Manual'
  lastTested: string // ISO
  result: 'Pass' | 'Fail' | 'Partial'
  evidenceCount: number
  linkedRisks: string[]
  linkedIssues: string[]
  ccmRuleId?: string
  description: string // the control activity — what must be done
  frequency: string // the cadence
  nextDue?: string // ISO — the "by when", for tracked compliance controls
  sourceRefs?: string[] // SourceProvision ids — provenance for this control
}

// One action that must be taken to satisfy an obligation (enhancement plan 3 /
// functional spec 5.4). A deduction-type duty (PF / PT / TDS) is a sequence:
// deduct -> pay -> file the return. Each sub-step is its own mini-task with a
// maker, a checker, a due date and the evidence that proves it — and different
// departments can own different steps (e.g. HR & Labour deducts, Finance pays).
export interface ObligationSubStep {
  id: string // 'OBL-LAB-JUN26-04-S1'
  seq: number // 1-based order
  title: string // 'Deduct profession tax from payroll (Schedule I)'
  clauseRef?: string // SourceProvision id this action discharges (e.g. SRC-PT-4)
  maker: string // person id who performs the action
  checker: string // person id who verifies it (two-step maker-checker)
  dueDate: string // ISO — the by-when for this step
  status: 'Done' | 'Pending' | 'Overdue'
  evidenceId?: string // the proof, once done (kept for audit)
  dependsOnSeq?: number // prerequisite step (sequential); absent = may run in parallel
}

export interface Obligation {
  id: string
  regulator: Regulator
  title: string
  frequency: string
  dueDate: string // ISO
  owner: string
  status: 'Filed' | 'Due' | 'Overdue' | 'In review'
  makerChecker: { maker: string; checker: string; state: 'Drafted' | 'Submitted' | 'Approved' | 'Pending' }
  evidence: string[]
  linkedRegChange?: string
  reference: string
  sourceRefs?: string[] // SourceProvision ids — the instrument(s) this obligation derives from
  requirement?: string // plain-English outcome the provision imposes — shown as "What this requires"
  applicability?: string // whether/why it applies to SPF + the basis — shown as "Applies because"
  origin?: 'External' | 'Internal' // External = statutory/regulator; Internal = policy-driven duty the firm set itself
  policySource?: string // for internal duties: the policy that mandates it (shown instead of a regulator)
  subSteps?: ObligationSubStep[] // ordered actions to satisfy a multi-step (deduction-type) duty
  filedAt?: string // ISO — when a Filed cycle was actually filed (for on-time vs late, E2.3)
}

export interface RegulatorTrack {
  regulator: Regulator | 'DPDP Board'
  clockLabel: string
  windowHours: number
  deadline: string // ISO
  clockStartedAt: string // ISO
  status: 'On track' | 'At risk' | 'Breached' | 'Filed'
  output: string // the artefact to produce
}

export interface TimelineEvent {
  at: string // ISO
  actor: string // person id or system
  channel: 'Splunk SIEM' | 'CrowdStrike EDR' | 'Sankalp ServiceDesk' | 'OneGRC' | 'CERT-In' | 'PFRDA' | 'DPDP'
  text: string
  kind: 'detect' | 'triage' | 'contain' | 'notify' | 'evidence' | 'note'
}

// ── Campaigns ────────────────────────────────────────────────────────────────
// The shared container behind every "fan a task out to many owners, track
// completion, approve the results, evidence the cycle" exercise: RCSA, policy
// attestation, vendor due diligence. One engine, several payloads — the type
// decides the form and how a response is summarised, nothing else.

export type CampaignType = 'RCSA' | 'Policy attestation' | 'Vendor due diligence'

export interface CampaignScope {
  domains?: RiskDomain[]
  departments?: Department[]
  /** The objects the campaign fans out over — risk / policy / vendor ids. */
  objectIds: string[]
}

export interface CampaignTask {
  id: string // 'CMPT-<campaign>-<n>'
  campaignId: string
  assignee: string // person id — the maker
  objectId: string // the risk / policy / vendor being assessed
  status: 'Not started' | 'Submitted' | 'Approved' | 'Returned' | 'Overdue'
  submittedOn?: string // ISO
  reviewer?: string // person id — the checker; must differ from the assignee
  reviewedOn?: string // ISO
  reviewNote?: string
  /** Type-specific payload. RCSA carries re-scores; attestation carries an
   *  acknowledgement. The container never reads inside it. */
  response: Record<string, unknown>
  evidenceIds?: string[]
}

// ── RCSA payload ─────────────────────────────────────────────────────────────
// The risk-and-control self-assessment a first-line owner completes for one
// risk. Both halves are required: re-score the exposure, and rate the controls
// that are meant to be holding it down — a re-score with no control opinion is
// the failure mode that makes an RCSA an opinion poll.
//
// Nothing here is authoritative until a checker approves it; on approval the
// accepted values are written back onto the Risk itself, so an assessment that
// changes nothing in the register cannot happen.

export type ControlEffectiveness = 'Effective' | 'Partially effective' | 'Ineffective' | 'Not tested'

export interface ControlAssessment {
  controlId: string
  effectiveness: ControlEffectiveness
  /** Required by the form whenever the rating is not 'Effective'. */
  comment?: string
}

export interface RcsaResponse {
  /** False proposes the risk for retirement — the checker decides. */
  stillRelevant: boolean
  /** Re-scored exposure before controls. */
  proposedLikelihood: number // 1-5
  proposedImpact: number // 1-5
  /** Re-scored exposure after controls; 1-25, bounded by inherent. */
  proposedResidual: number
  /** The residual as it stood when the assessment was drafted. Stamped at
   *  submission because the register moves on approval — without it, a closed
   *  cycle cannot say what it changed. */
  priorResidual: number
  proposedTreatment: Risk['treatment']
  controls: ControlAssessment[]
  /** ISO 31000 6.5.3 — the assessor's reasoning, carried into the audit trail. */
  rationale: string
  /** A concern the owner wants raised as a new risk, if any. */
  emergingConcern?: string
  evidenceIds?: string[]
}

// ── Policy attestation payload ───────────────────────────────────────────────
// An acknowledgement is worth nothing unless it says *which version* was read.
// Publishing v3.5 does not carry forward the staff who acknowledged v3.4, so
// the version travels with the response and coverage is computed against the
// policy's current version — never a bare "attested: true".

export type AttestationDeclarationKind = 'None' | 'Conflict of interest' | 'Cannot comply' | 'Clarification needed'

export interface AttestationDeclaration {
  kind: Exclude<AttestationDeclarationKind, 'None'>
  detail: string
  /** Set when a 'Cannot comply' declaration is approved and routed to the
   *  exception register — the Issue tracking the deviation. */
  issueId?: string
}

export interface ComprehensionAnswer {
  questionId: string
  chosen: number
  correct: boolean
}

export interface AttestationResponse {
  /** The exact version acknowledged. */
  version: string
  acknowledged: boolean
  answers: ComprehensionAnswer[]
  /** Percentage correct across the comprehension check. */
  comprehensionScore: number
  declaration?: AttestationDeclaration
}

export interface Campaign {
  id: string // 'CMP-RCSA-01'
  type: CampaignType
  title: string
  scope: CampaignScope
  period: string // 'H1 FY2026-27'
  launchedOn: string // ISO
  dueOn: string // ISO
  launchedBy: string // person id
  status: 'Draft' | 'In progress' | 'In review' | 'Closed'
  tasks: CampaignTask[]
  /** The recurring duty this cycle discharges, where there is one. */
  obligationId?: string
  /** Set when the campaign closes — the completion certificate. */
  evidenceId?: string
  closedOn?: string // ISO
}

// ── Key Risk Indicators ──────────────────────────────────────────────────────
// A KRI is a measured early-warning signal hanging off a Risk. Four things make
// one usable, and all four are required here: a clear metric, a threshold that
// triggers escalation, a named owner and a measurement frequency.

/** Where the number comes from. Every source is a system the platform already
 *  names as a spoke, so a KRI is traceable to a feed rather than a spreadsheet. */
export type KriSource =
  | 'Manual'
  | 'Splunk SIEM'
  | 'Qualys VM'
  | 'CrowdStrike EDR'
  | 'CCM'
  | 'Okta/AD'
  | 'NPS Trust / CRA'
  | 'Sankalp ServiceDesk'
  | 'Fund Accounting'

/**
 * Which way is bad. This is the field that makes a threshold readable:
 *  - `higher-is-worse` (unpatched vulnerabilities): green is a ceiling, so
 *    green < amber < red numerically.
 *  - `lower-is-worse` (MFA coverage %): green is a floor, so green > amber > red.
 * `kriBand()` is the single place that interpretation lives.
 */
export type KriDirection = 'higher-is-worse' | 'lower-is-worse'

export type KriBand = 'Green' | 'Amber' | 'Red'

export interface KriReading {
  period: string // 'Apr F1', 'Q1 FY27' — the measurement period label
  value: number
  at: string // ISO — when the reading was taken
}

export interface KRI {
  id: string // 'KRI-OPS-04'
  riskId: string // the parent risk this indicator warns about
  name: string
  metricSource: KriSource
  unit: string // 'records', '%', 'days', 'count', '₹ lakh'
  direction: KriDirection
  thresholds: { green: number; amber: number; red: number }
  currentValue: number
  /** Derived by `kriBand()` from thresholds + direction — never stored. */
  history: KriReading[] // >= 6 points, oldest first
  owner: string // person id
  lastRefreshed: string // ISO
  frequency: 'Daily' | 'Weekly' | 'Fortnightly' | 'Monthly' | 'Quarterly'
  /** Controls whose effectiveness this indicator measures. */
  linkedControls: string[]
  /** What the board is being told this number means. */
  rationale: string
}

// ── Operational-risk loss events ─────────────────────────────────────────────
// The Basel-style event-type taxonomy a regulated FI's risk function expects an
// operational-loss record to be classified against.
export type LossEventCategory =
  | 'Internal fraud'
  | 'External fraud'
  | 'Employment practices & workplace safety'
  | 'Clients, products & business practices'
  | 'Damage to physical assets'
  | 'Business disruption & system failures'
  | 'Execution, delivery & process management'

/** The financial impact of an incident, where one has been recognised.
 *  Net loss is DERIVED (gross − recovery) by `netLoss()`, never entered. */
export interface LossEvent {
  isLossEvent: boolean
  grossLoss: number // INR
  recovery: number // INR — insurance, restitution
  currency: 'INR'
  category: LossEventCategory
  accountingRef?: string
  recognisedOn?: string // ISO date
}

export interface Incident {
  id: string
  title: string
  classification: Severity
  detectedAt: string // ISO
  source: 'Sankalp ServiceDesk (ITSM)' | 'Splunk SIEM' | 'CrowdStrike EDR' | 'Qualys VM' | 'Consent & Privacy platform'
  assets: string[]
  owner: string
  status: 'Open' | 'Contained' | 'Eradicated' | 'Closed'
  regulatorTracks: RegulatorTrack[]
  timeline: TimelineEvent[]
  subscriberImpacting: boolean
  personalDataInvolved: boolean
  linkedRisks: string[]
  linkedControls: string[]
  linkedIssues: string[]
  evidence: string[]
  summary: string
  /** Financial impact, where the incident has been recognised as an
   *  operational-risk loss event. Absent = no loss recognised. */
  lossEvent?: LossEvent
}

export interface Policy {
  id: string
  title: string
  version: string
  owner: string
  approvedBy: string
  approvedOn: string
  nextReview: string
  mappedControls: string[]
  status: 'Published' | 'In review' | 'Draft'
  category: string
  sourceRefs?: string[] // SourceProvision ids — the instrument(s) this policy derives from
}

/** A time-boxed, approved deviation from a control or an obligation.
 *
 *  An exception is NOT an excuse: it is a decision with an owner, a compensating
 *  control, an approver and — always — an expiry. `status` is derived from
 *  `expiresOn` by `exceptionState()`, never stored, so an exception cannot read
 *  "Active" a month after it lapsed. */
export interface IssueException {
  reason: string
  compensatingControl?: string // control id
  requestedBy: string // person id (maker)
  approvedBy: string // person id (checker) — must differ from requestedBy
  /** Maker-checker state; an exception only bites once Approved. */
  approvalState: 'Requested' | 'Approved' | 'Rejected'
  requestedOn: string // ISO
  approvedOn?: string // ISO — set on approval
  expiresOn: string // ISO
  renewalCount: number
  /** Set when the exception is closed early (remediated rather than lapsed). */
  closedOn?: string // ISO
}

export interface Issue {
  id: string
  title: string
  source: 'Control failure' | 'Audit finding' | 'Incident' | 'Exception'
  sourceRef: string
  severity: Severity
  owner: string
  dueDate: string
  ageDays: number
  status: 'Open' | 'In progress' | 'Overdue' | 'Resolved'
  linkedControls: string[]
  /** Present only when `source === 'Exception'`. */
  exception?: IssueException
}

export interface Evidence {
  id: string
  title: string
  type: 'Screenshot' | 'Log' | 'Config export' | 'Attestation' | 'Filing ack'
  capturedAt: string
  capturedBy: string // 'CCM (auto)' | person id
  auto: boolean
  linkedControls: string[]
  linkedObligations: string[]
  frameworkRefs: Framework[]
  source: string
}

export interface AuditFinding {
  id: string
  title: string
  severity: Severity
  status: 'Open' | 'Remediation' | 'Closed'
  linkedIssue?: string
}

/**
 * One test step in an audit — the execution layer between a scope and a finding.
 * A paper records what was tested, over what population, on what sample, by whom,
 * with what evidence, and what the tester concluded. A Fail is what a finding is
 * raised FROM, so a finding always has a test behind it.
 */
export interface WorkingPaper {
  id: string // 'WP-AUD-IS-2026-01-03'
  auditId: string
  reference: string // 'WP-03' — the reference the auditor cites in the report
  controlTested?: string // control id
  objective: string
  procedure: string
  populationSize?: number
  sampleSize?: number
  sampleBasis?: 'Random' | 'Judgemental' | 'Full population'
  result: 'Pass' | 'Fail' | 'Partial' | 'Not applicable'
  tester: string // person id
  testedOn: string // ISO
  evidenceIds: string[]
  conclusion: string
  /** Set once a failed paper has been escalated — one finding per paper. */
  findingId?: string
}

/**
 * One row of the annual risk-based audit plan: an auditable entity, when it is
 * scheduled, and the risks that justify its priority. Plan-vs-actual is the
 * measure the audit committee reads.
 */
export interface AuditPlanEntry {
  id: string // 'PLAN-FY2627-04'
  auditableEntity: string
  linkedRiskIds: string[]
  lastAudited?: string // ISO
  priority: 'High' | 'Medium' | 'Low' // risk-based, derived from the linked risks
  plannedQuarter: 'Q1' | 'Q2' | 'Q3' | 'Q4'
  fy: string // 'FY2026-27'
  auditor: string // person id or firm name
  auditType: Audit['type']
  status: 'Planned' | 'In progress' | 'Complete' | 'Deferred'
  linkedAuditId?: string
  /** The cadence the entry satisfies, where a regulator sets one. */
  cadenceBasis?: string
}

export interface Audit {
  id: string
  title: string
  type: 'IS audit (CERT-In empanelled)' | 'Internal' | 'PFRDA'
  auditor: string
  period: string
  status: 'Planned' | 'Fieldwork' | 'Reporting' | 'Closed'
  findings: AuditFinding[]
  scope: string
}

export interface RegulatoryChange {
  id: string
  source: 'Regulatory Intelligence feed' | 'PFRDA circular'
  summary: string
  regulator: Regulator
  publishedAt: string
  impactedObligations: string[]
  impactedControls: string[]
  owner: string
  status: 'Assessed' | 'In progress' | 'Closed'
  detail: string
  instrumentId?: string // set when registered against an existing instrument (a new circular/version)
}

export interface DataAsset {
  id: string
  name: string
  store: 'CRA' | 'KYC DB' | 'Fund Accounting' | 'CRM'
  piiTypes: ('PRAN' | 'KYC' | 'Nominee' | 'Bank' | 'Financial')[]
  classification: 'Restricted' | 'Confidential' | 'Internal'
  retentionRule: string
  consentStatus: 'Captured' | 'Partial' | 'Legacy'
  records: number
}

// ── Third-party / vendor management ──────────────────────────────────────────
// Shaped by what a PFRDA-regulated pension fund manager is actually held to on
// outsourcing: material arrangements are identified and board-visible, each one
// has a named owner, current independent assurance, a data-processing basis, a
// right to audit, disclosed sub-outsourcing (the fourth party) and an exit plan
// that has been tested. Everything the register reports — the risk tier, the
// assurance state, whether diligence has lapsed — is derived from those facts
// rather than typed in, so a vendor cannot be marked "low risk" while its SOC 2
// is two years expired.

export type VendorCriticality = 'Material' | 'Important' | 'Standard'

export type VendorCategory =
  | 'Registrar & CRA'
  | 'Custodian & banking'
  | 'Technology & cloud'
  | 'Security services'
  | 'Professional services'
  | 'BPO & facilities'
  | 'Data & market feeds'

export type AssuranceKind =
  | 'SOC 2 Type II'
  | 'ISO/IEC 27001:2022'
  | 'ISAE 3402 Type II'
  | 'CERT-In empanelled audit'
  | 'PCI DSS AoC'

export interface VendorAssurance {
  kind: AssuranceKind
  reference: string
  issuedOn: string // ISO
  expiresOn: string // ISO
  /** The report itself, in the Evidence Vault. */
  evidenceId?: string
  /** Qualifications or exceptions carried in the report. */
  qualifications?: string
}

export interface VendorService {
  name: string
  criticality: VendorCriticality
  /** Recovery time objective agreed in the contract. */
  rto: string
  linkedControls: string[]
}

export interface Vendor {
  id: string // 'VND-0041'
  name: string
  category: VendorCategory
  /** Material = material outsourcing: board-visible, annual diligence, exit plan. */
  criticality: VendorCriticality
  status: 'Active' | 'Onboarding' | 'Under review' | 'Exiting' | 'Terminated'
  /** Relationship owner in the first line. */
  owner: string // person id
  services: VendorService[]
  contractRef: string
  contractStart: string // ISO
  contractEnd: string // ISO
  annualSpendLakh: number
  /** Where the service is performed from — data localisation bites here. */
  jurisdiction: string
  dataAccess: ('PRAN' | 'KYC' | 'Nominee' | 'Bank' | 'Financial')[]
  /** Fourth parties the vendor has disclosed. */
  subOutsourcing: string[]
  assurance: VendorAssurance[]
  exitPlan: { documented: boolean; testedOn?: string; rto: string }
  rightToAudit: boolean
  dataProcessingAgreement: boolean
  linkedRisks: string[]
  linkedIncidents: string[]
  linkedControls: string[]
  onboardedOn: string // ISO
  lastDueDiligenceOn?: string // ISO
  dueDiligenceFrequency: 'Annual' | 'Half-yearly' | 'Biennial'
}

/** The due-diligence questionnaire — the third campaign payload. */
export interface VendorDdResponse {
  financialsReviewed: boolean
  assuranceCurrent: boolean
  assuranceGap?: string
  dataProcessingAgreement: boolean
  subOutsourcingDisclosed: boolean
  subOutsourcingNotes?: string
  exitPlanTested: boolean
  incidentsInPeriod: number
  slaBreaches: number
  proposedCriticality: VendorCriticality
  recommendation: 'Continue' | 'Continue with conditions' | 'Remediate' | 'Exit'
  conditions?: string
  rationale: string
}

// ── Speak-up and fraud ───────────────────────────────────────────────────────
// Two modules, deliberately not one. They differ where it matters — a
// whistleblower intake exists to protect a person, a fraud intake exists to
// process data — and they meet only at the platform level: both push their
// outcome into the risk register, both raise remediation through the single
// Issues engine, both evidence themselves in the one Vault.
//
// The confidentiality model is shared and is the reason these are not ordinary
// records: `restricted` + `accessList` decide who may open the body at all, and
// a reporter's identity is never a field the UI can render.

export interface Confidential {
  /** True = the body is visible only to the people on the access list. */
  restricted: boolean
  /** Person ids cleared to open this case. Empty on an unrestricted record. */
  accessList: string[]
  /** People conflicted out — named in the allegation, or in the subject's
   *  reporting line. Recusal is recorded, not merely observed. */
  recusals: string[]
}

export type WbChannel =
  | 'Web portal (anonymous)'
  | 'Ethics hotline'
  | 'Dedicated email'
  | 'Sealed letter'
  | 'In person'

export type WbCategory =
  | 'Financial misstatement'
  | 'Fraud or theft'
  | 'Bribery & corruption'
  | 'Conflict of interest'
  | 'Harassment or discrimination'
  | 'Data misuse'
  | 'Regulatory breach'
  | 'Health & safety'
  | 'Other'

export type WbStage =
  | 'Received'
  | 'Acknowledged'
  | 'Under triage'
  | 'Investigation'
  | 'Awaiting outcome'
  | 'Remediation'
  | 'Closed'
  | 'Rejected'

export type WbOutcome = 'Substantiated' | 'Partially substantiated' | 'Unsubstantiated' | 'Out of scope' | 'Withdrawn'

/** Two-way contact through the reference code — the only channel that exists to
 *  an anonymous reporter. */
export interface WbMessage {
  at: string // ISO
  from: 'Reporter' | 'Ethics office'
  text: string
}

/**
 * A sealed identity. The platform records *that* an identity is held and who
 * could unseal it; the identity itself is never a field, so no screen, export
 * or search can leak it.
 */
export interface SealedIdentity {
  heldBy: string // person id — the custodian
  unsealableBy: string[] // person ids who could jointly unseal
  unsealedOn?: string
  unsealedBy?: string
  unsealReason?: string
}

export interface WhistleblowerReport extends Confidential {
  id: string // 'WB-2026-014'
  /** The only handle the reporter is given. Metadata is stripped at intake. */
  reference: string // 'SPF-9F2K-4TQ'
  anonymous: boolean
  identity?: SealedIdentity
  channel: WbChannel
  category: WbCategory
  severity: Severity
  receivedAt: string // ISO
  /** The reporter's account, held as written. */
  summary: string
  /** Never a name at intake — a role or a team. A name only enters the record
   *  once an allegation is substantiated. */
  allegationAgainst: string
  stage: WbStage
  outcome?: WbOutcome
  /** Companies Act 2013 s.177 vigil mechanism: the Audit Committee has direct
   *  access, and the ethics office owes an acknowledgement then a substantive
   *  response inside a stated window. */
  acknowledgeBy: string // ISO
  feedbackBy: string // ISO
  acknowledgedOn?: string
  triagedBy?: string
  triagedOn?: string
  investigator?: string
  assignedOn?: string
  messages: WbMessage[]
  /** Protection is a tracked commitment, not a sentiment. */
  retaliationWatch: boolean
  retaliationReviewedOn?: string
  /** Where it went. The fraud case carries the reference, never the reporter. */
  linkedFraudCaseId?: string
  linkedRiskIds: string[]
  linkedIssueIds: string[]
  evidenceIds: string[]
  closedOn?: string
  closureNote?: string
}

export type FraudScheme =
  | 'Asset misappropriation'
  | 'Corruption'
  | 'Financial statement fraud'
  | 'Cyber-enabled fraud'
  | 'Payroll & expenses'
  | 'Procurement fraud'
  | 'Identity & subscriber fraud'

export type FraudDetection =
  | 'Transaction monitoring alert'
  | 'CCM rule failure'
  | 'Internal audit finding'
  | 'Reconciliation break'
  | 'Whistleblower report'
  | 'Subscriber complaint'
  | 'External notification'
  | 'Management review'

export type FraudStage = 'Reported' | 'Triage' | 'Investigation' | 'Recovery & action' | 'Closed'
export type FraudOutcome = 'Substantiated' | 'Partially substantiated' | 'Unsubstantiated' | 'Inconclusive'

/** A red flag observed in the data — what a fraud intake ingests instead of a
 *  narrative. */
export interface FraudIndicator {
  label: string
  observedOn: string // ISO
  source: string // the system that produced it
  value?: string
}

export interface FraudStep {
  at: string // ISO
  actor: string // person id
  action: string
  note?: string
}

/** A person or party under investigation. Held by reference, not by name,
 *  until an allegation is substantiated. */
export interface FraudSubject {
  ref: string // 'Subject A — Fund Accounting'
  internal: boolean
  suspended?: boolean
}

export interface FraudRegulatoryTrack {
  regulator: 'PFRDA' | 'CERT-In' | 'DPDP Board' | 'Police / EOW' | 'Statutory auditor'
  required: boolean
  basis: string
  dueBy?: string // ISO
  reportedOn?: string
  reference?: string
}

export interface FraudCase extends Confidential {
  id: string // 'FRD-2026-007'
  title: string
  scheme: FraudScheme
  detection: FraudDetection
  /** The record that raised it — a CCM rule, an audit finding, an incident.
   *  Resolves through the shared entity resolver where it is a platform id. */
  sourceRef?: string
  detectedOn: string // ISO
  openedOn: string // ISO
  stage: FraudStage
  outcome?: FraudOutcome
  severity: Severity
  investigator: string // person id — 1LoD/2LoD lead
  sponsor: string // person id — the second line sponsoring the case
  subjects: FraudSubject[]
  indicators: FraudIndicator[]
  estimatedLossLakh: number
  confirmedLossLakh?: number
  recoveredLakh?: number
  /** Basel category, so a confirmed fraud lands in the same loss engine as an
   *  operational incident rather than a parallel one. */
  lossCategory: LossEventCategory
  accountingRef?: string
  timeline: FraudStep[]
  regulatoryTracks: FraudRegulatoryTrack[]
  evidenceIds: string[]
  linkedControls: string[]
  linkedRiskIds: string[]
  linkedIssueIds: string[]
  linkedIncidentId?: string
  /** Set when the case came from the speak-up channel. Carries the reporter's
   *  reference code, never their identity. */
  whistleblowerRef?: string
  disciplinaryAction?: string
  recoveryAction?: string
  closedOn?: string
  closureNote?: string
}

export interface Dsar {
  id: string
  pran: string // masked
  type: 'Access' | 'Erasure' | 'Correction' | 'Nomination'
  raisedAt: string
  dueDate: string
  status: 'Open' | 'In review' | 'Fulfilled' | 'On hold'
  owner: string
  note: string
  step: number // completed steps in the locate→retain→erase→log→audit workflow (5.9)
}

export interface ActivityItem {
  id: string
  at: string // ISO
  actor: string
  kind:
    | 'ccm-fail'
    | 'ccm-pass'
    | 'reg-change'
    | 'evidence'
    | 'dsar'
    | 'incident'
    | 'obligation'
    | 'approval'
    | 'audit'
    | 'policy'
  text: string
  ref: string // entity id
  route: string
}

export interface QueueTask {
  id: string
  role: RoleKey
  kind: 'Approval' | 'Control re-test' | 'Incident action' | 'DSAR' | 'Evidence request' | 'Reg-change review'
  title: string
  ref: string
  route: string
  due: string
  priority: Severity
}
