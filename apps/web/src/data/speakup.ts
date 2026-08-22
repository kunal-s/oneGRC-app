// Seeded speak-up reports and fraud cases.
//
// Written as one file because the two registers are deliberately joined at two
// points and nowhere else: a converted report and the case it became must agree
// on the reference code, and a substantiated outcome on either side must point
// at the same risk. Everything else about them differs.
//
// Nothing here holds a reporter's name. Where a reporter identified themselves,
// the record carries a custody note and no identity, because a seed that stored
// one would prove the model does not hold.
import type {
  Control,
  FraudCase,
  Issue,
  Risk,
  WhistleblowerReport,
} from '@/types'
import { NOW_MS } from '@/lib/time'
import { ETHICS_OFFICE } from '@/lib/investigations'

const iso = (d: Date) => d.toISOString()
const daysAgo = (n: number) => iso(new Date(NOW_MS - n * 86400000))
const daysAhead = (n: number) => iso(new Date(NOW_MS + n * 86400000))

/** Acknowledgement inside 7 days, substantive feedback inside 90 — the window
 *  the ethics charter commits to and the Audit Committee measures. */
const ACK_DAYS = 7
const FEEDBACK_DAYS = 90

const ETHICS = [...ETHICS_OFFICE]

/** Reference codes are the reporter's only handle. Fixed, not generated, so the
 *  worked examples can be cited. */
interface WbSpec {
  id: string
  reference: string
  anonymous: boolean
  identityHeld?: boolean
  channel: WhistleblowerReport['channel']
  category: WhistleblowerReport['category']
  severity: WhistleblowerReport['severity']
  receivedDaysAgo: number
  summary: string
  allegationAgainst: string
  stage: WhistleblowerReport['stage']
  outcome?: WhistleblowerReport['outcome']
  acknowledgedDaysAgo?: number
  investigator?: string
  retaliation?: boolean
  retaliationReviewedDaysAgo?: number
  closedDaysAgo?: number
  closureNote?: string
  convertsTo?: string
  recusals?: string[]
  extraAccess?: string[]
  messages?: { fromReporter: boolean; daysAgo: number; text: string }[]
}

const WB_SPECS: WbSpec[] = [
  // ── the marquee: an anonymous report that becomes a fraud case ─────────────
  {
    id: 'WB-2026-014',
    reference: 'SPF-9F2K-4TQ',
    anonymous: true,
    channel: 'Web portal (anonymous)',
    category: 'Fraud or theft',
    severity: 'High',
    receivedDaysAgo: 23,
    summary:
      'Three subscriber exit payments in the last quarter went to bank accounts changed within 48 hours of the withdrawal request being raised. The maker and checker on all three were the same two people, and the change requests carry no supporting document in the file. I do not want to raise this with my line manager because one of them reports to him.',
    allegationAgainst: 'Two members of the subscriber-servicing team, Operations',
    stage: 'Investigation',
    acknowledgedDaysAgo: 21,
    investigator: 'sunita',
    retaliation: true,
    retaliationReviewedDaysAgo: 9,
    convertsTo: 'FRD-2026-007',
    // The reporter says the subject reports to a department head, so that head
    // stands down and the case is handled by Internal Audit and Compliance.
    recusals: ['imran'],
    messages: [
      { fromReporter: false, daysAgo: 21, text: 'Your report has been received and logged under reference SPF-9F2K-4TQ. It is being assessed by the ethics office. You will get a substantive response by the date shown against this reference. Nothing you have told us identifies you.' },
      { fromReporter: true, daysAgo: 18, text: 'The three PRANs end 4193, 7724 and 0281. The change requests were keyed after 19:00 IST in each case.' },
      { fromReporter: false, daysAgo: 17, text: 'Thank you — that has let us pull the specific records. The matter has been referred for a formal investigation. You are protected against any detriment for having raised this; if anything changes in how you are treated at work, reply on this reference.' },
      { fromReporter: false, daysAgo: 9, text: 'Interim update: the investigation is under way and a control has been tightened while it runs. We are still inside the response window.' },
    ],
  },
  // ── a substantiated case, closed, that changed a control ──────────────────
  {
    id: 'WB-2026-009',
    reference: 'SPF-3M8P-1RD',
    anonymous: false,
    identityHeld: true,
    channel: 'Dedicated email',
    category: 'Conflict of interest',
    severity: 'Medium',
    receivedDaysAgo: 148,
    summary:
      'A colleague on the vendor selection panel for the records-archival tender has an immediate family member employed by one of the bidders. This was not declared at the panel and the bidder was shortlisted.',
    allegationAgainst: 'A member of the vendor selection panel, Operations',
    stage: 'Closed',
    outcome: 'Substantiated',
    acknowledgedDaysAgo: 146,
    investigator: 'anjali',
    retaliation: true,
    retaliationReviewedDaysAgo: 61,
    closedDaysAgo: 96,
    closureNote:
      'Substantiated. The interest existed and was not declared. The panel member was removed and the shortlist re-run with a fresh panel. The conflicts declaration is now a gate in the procurement workflow rather than a form filed afterwards.',
    messages: [
      { fromReporter: false, daysAgo: 146, text: 'Received and logged under SPF-3M8P-1RD. Your identity is held in the sealed register and has not been shared with anyone involved in the matter.' },
      { fromReporter: false, daysAgo: 96, text: 'The investigation is complete. The allegation was substantiated and remedial action has been taken, including a change to how conflicts are declared in procurement. Thank you for raising it.' },
    ],
  },
  // ── an unsubstantiated case, closed — the channel is not a verdict machine ─
  {
    id: 'WB-2026-011',
    reference: 'SPF-7QX4-8BN',
    anonymous: true,
    channel: 'Ethics hotline',
    category: 'Financial misstatement',
    severity: 'High',
    receivedDaysAgo: 121,
    summary:
      'I believe the NAV for one of the schemes was adjusted after cut-off at the end of the last quarter to avoid showing a dip.',
    allegationAgainst: 'Fund accounting',
    stage: 'Closed',
    outcome: 'Unsubstantiated',
    acknowledgedDaysAgo: 120,
    investigator: 'sunita',
    closedDaysAgo: 74,
    closureNote:
      'Not substantiated. The adjustment was a corporate-action accrual posted within the documented cut-off and independently reviewed. The reporter raised it in good faith and no detriment follows.',
    messages: [
      { fromReporter: false, daysAgo: 120, text: 'Received under SPF-7QX4-8BN. Financial-reporting allegations are referred to Internal Audit for independent review.' },
      { fromReporter: false, daysAgo: 74, text: 'The review is complete. The posting was legitimate and within cut-off, so the allegation is not substantiated. Raising it was the right thing to do and no adverse inference is drawn.' },
    ],
  },
  // ── in triage, feedback window running ────────────────────────────────────
  {
    id: 'WB-2026-016',
    reference: 'SPF-5DR9-2WK',
    anonymous: true,
    channel: 'Web portal (anonymous)',
    category: 'Data misuse',
    severity: 'High',
    receivedDaysAgo: 11,
    summary:
      'Subscriber KYC scans are being downloaded to a personal laptop to work on at home. I have seen the files on a screen in a coffee shop.',
    allegationAgainst: 'A member of the subscriber onboarding team',
    stage: 'Under triage',
    acknowledgedDaysAgo: 9,
    // A data-misuse allegation goes to the DPO, who is already on the ethics
    // office list.
    retaliation: true,
    messages: [
      { fromReporter: false, daysAgo: 9, text: 'Received under SPF-5DR9-2WK. This has been routed to the Data Protection Officer. You will hear from us inside the response window.' },
    ],
  },
  // ── just landed, not yet acknowledged: the breach the queue chases ────────
  {
    id: 'WB-2026-018',
    reference: 'SPF-1JH6-9ZC',
    anonymous: true,
    channel: 'Sealed letter',
    category: 'Bribery & corruption',
    severity: 'Critical',
    receivedDaysAgo: 9,
    summary:
      'A vendor representative offered hospitality to two people during a live tender. One of them accepted and it has not been declared on the gifts register.',
    allegationAgainst: 'Two employees involved in a live procurement',
    stage: 'Received',
    severityOverride: undefined as never,
    retaliation: false,
  } as WbSpec,
  // ── out of scope, rejected — an honest outcome the register must show ─────
  {
    id: 'WB-2026-013',
    reference: 'SPF-2VC7-6LM',
    anonymous: false,
    identityHeld: true,
    channel: 'In person',
    category: 'Other',
    severity: 'Low',
    receivedDaysAgo: 64,
    summary: 'A dispute with a line manager over shift allocation and leave approvals.',
    allegationAgainst: 'A line manager',
    stage: 'Rejected',
    outcome: 'Out of scope',
    acknowledgedDaysAgo: 62,
    closedDaysAgo: 55,
    closureNote:
      'Out of scope for the vigil mechanism — an individual grievance rather than a reportable wrongdoing. Referred to HR under the grievance procedure with the reporter’s agreement. Protection against detriment continues to apply.',
    messages: [
      { fromReporter: false, daysAgo: 55, text: 'This falls under the grievance procedure rather than the speak-up channel, and has been passed to HR with your agreement. You remain protected against any detriment for having raised it.' },
    ],
  },
  // ── harassment: sealed tighter than the rest ──────────────────────────────
  {
    id: 'WB-2026-017',
    reference: 'SPF-8KT2-3FA',
    anonymous: false,
    identityHeld: true,
    channel: 'Ethics hotline',
    category: 'Harassment or discrimination',
    severity: 'High',
    // Four days from the 90-day response deadline: the reminder rungs have
    // fired and the ethics office is being chased on a live case.
    receivedDaysAgo: 86,
    summary:
      'Sustained belittling conduct towards a junior colleague in team meetings, including remarks about their background. Two others have witnessed it.',
    allegationAgainst: 'A team lead',
    stage: 'Awaiting outcome',
    acknowledgedDaysAgo: 84,
    investigator: 'anjali',
    retaliation: true,
    retaliationReviewedDaysAgo: 12,
    // Handled by Compliance and Internal Audit only; the DPO has no locus.
    extraAccess: [],
    messages: [
      { fromReporter: false, daysAgo: 84, text: 'Received under SPF-8KT2-3FA. Your identity is sealed. The investigation is being handled outside your reporting line.' },
      { fromReporter: false, daysAgo: 6, text: 'Interviews are complete and the findings are with the ethics office for a decision. You will have a substantive response inside the window.' },
    ],
  },
  // ── a regulatory-breach report already in remediation ─────────────────────
  {
    id: 'WB-2026-015',
    reference: 'SPF-6BN3-7HP',
    anonymous: true,
    channel: 'Web portal (anonymous)',
    category: 'Regulatory breach',
    severity: 'Medium',
    // Four days past the response deadline. A speak-up channel that goes quiet
    // is the failure the escalation ladder exists to surface.
    receivedDaysAgo: 94,
    summary:
      'Quarterly PFRDA returns have been signed off by the preparer on at least two occasions because the reviewer was on leave and nobody was delegated.',
    allegationAgainst: 'Compliance operations',
    stage: 'Remediation',
    outcome: 'Partially substantiated',
    acknowledgedDaysAgo: 92,
    investigator: 'sunita',
    retaliation: false,
    messages: [
      { fromReporter: false, daysAgo: 92, text: 'Received under SPF-6BN3-7HP and referred for review.' },
      { fromReporter: false, daysAgo: 20, text: 'Partly substantiated: one filing went out without an independent check. A standing delegate is now named for every maker-checker pair and the gap is being tracked to closure.' },
    ],
  },
]

export function buildWhistleblower(risks: Risk[]): WhistleblowerReport[] {
  const opsRisk = risks.find((r) => r.domain === 'Operational')
  const compRisk = risks.find((r) => r.domain === 'Compliance')

  return WB_SPECS.map((s) => {
    const receivedAt = daysAgo(s.receivedDaysAgo)
    const accessList = Array.from(new Set([...ETHICS, ...(s.extraAccess ?? []), ...(s.investigator ? [s.investigator] : [])]))
    // Every speak-up report is restricted. There is no unrestricted variant —
    // the moment one exists, the model is advisory rather than enforced.
    return {
      id: s.id,
      reference: s.reference,
      anonymous: s.anonymous,
      identity: s.identityHeld
        ? {
            heldBy: 'anjali',
            // Unsealing takes two: the Compliance Officer plus the Audit
            // Committee chair. Neither can do it alone.
            unsealableBy: ['anjali', 'sunita'],
          }
        : undefined,
      channel: s.channel,
      category: s.category,
      severity: s.severity,
      receivedAt,
      summary: s.summary,
      allegationAgainst: s.allegationAgainst,
      stage: s.stage,
      outcome: s.outcome,
      acknowledgeBy: iso(new Date(NOW_MS - (s.receivedDaysAgo - ACK_DAYS) * 86400000)),
      feedbackBy: iso(new Date(NOW_MS - (s.receivedDaysAgo - FEEDBACK_DAYS) * 86400000)),
      acknowledgedOn: s.acknowledgedDaysAgo !== undefined ? daysAgo(s.acknowledgedDaysAgo) : undefined,
      triagedBy: s.stage === 'Received' ? undefined : 'anjali',
      triagedOn: s.stage === 'Received' ? undefined : daysAgo(Math.max(0, s.receivedDaysAgo - 3)),
      investigator: s.investigator,
      assignedOn: s.investigator ? daysAgo(Math.max(0, s.receivedDaysAgo - 4)) : undefined,
      messages: (s.messages ?? []).map((m) => ({
        at: daysAgo(m.daysAgo),
        from: m.fromReporter ? ('Reporter' as const) : ('Ethics office' as const),
        text: m.text,
      })),
      retaliationWatch: s.retaliation ?? false,
      retaliationReviewedOn: s.retaliationReviewedDaysAgo !== undefined ? daysAgo(s.retaliationReviewedDaysAgo) : undefined,
      linkedFraudCaseId: s.convertsTo,
      linkedRiskIds:
        s.outcome === 'Substantiated' || s.outcome === 'Partially substantiated'
          ? [s.category === 'Regulatory breach' ? compRisk?.id : opsRisk?.id].filter(Boolean) as string[]
          : [],
      linkedIssueIds: [],
      evidenceIds: [],
      closedOn: s.closedDaysAgo !== undefined ? daysAgo(s.closedDaysAgo) : undefined,
      closureNote: s.closureNote,
      restricted: true,
      accessList,
      recusals: s.recusals ?? [],
    }
  })
}

// ── fraud ────────────────────────────────────────────────────────────────────

interface FraudSpec {
  id: string
  title: string
  scheme: FraudCase['scheme']
  detection: FraudCase['detection']
  severity: FraudCase['severity']
  detectedDaysAgo: number
  openedDaysAgo: number
  stage: FraudCase['stage']
  outcome?: FraudCase['outcome']
  investigator: string
  sponsor: string
  subjects: { ref: string; internal: boolean; suspended?: boolean }[]
  indicators: { label: string; source: string; value?: string; daysAgo: number }[]
  estimated: number
  confirmed?: number
  recovered?: number
  lossCategory: FraudCase['lossCategory']
  accountingRef?: string
  wbRef?: string
  tracks: { regulator: FraudCase['regulatoryTracks'][number]['regulator']; required: boolean; basis: string; dueInDays?: number; reportedDaysAgo?: number; reference?: string }[]
  steps: { daysAgo: number; actor: string; action: string; note?: string }[]
  disciplinary?: string
  recovery?: string
  closedDaysAgo?: number
  closureNote?: string
  restricted?: boolean
  controlHint?: RegExp
}

const FRAUD_SPECS: FraudSpec[] = [
  // ── the marquee, converted from WB-2026-014 ───────────────────────────────
  {
    id: 'FRD-2026-007',
    title: 'Exit payments redirected after unsupported bank-mandate changes',
    scheme: 'Asset misappropriation',
    detection: 'Whistleblower report',
    severity: 'Critical',
    detectedDaysAgo: 21,
    openedDaysAgo: 20,
    stage: 'Investigation',
    investigator: 'lakshmi',
    sponsor: 'meera',
    wbRef: 'SPF-9F2K-4TQ',
    subjects: [
      { ref: 'Subject A — Subscriber Servicing (maker)', internal: true, suspended: true },
      { ref: 'Subject B — Subscriber Servicing (checker)', internal: true, suspended: true },
    ],
    indicators: [
      { label: 'Bank mandate changed within 48 hours of a withdrawal request', source: 'CRA change log', value: '3 of 3 cases', daysAgo: 20 },
      { label: 'Same maker–checker pair on every affected transaction', source: 'Fund accounting workflow', value: '3 of 3 cases', daysAgo: 20 },
      { label: 'Change requests keyed outside business hours', source: 'Application access log', value: 'after 19:04 IST', daysAgo: 19 },
      { label: 'No scanned mandate attached to the change record', source: 'Document management', value: '3 of 3 cases', daysAgo: 19 },
      { label: 'Two beneficiary accounts share an IFSC and branch', source: 'Payment file analysis', value: 'HDFC0004291', daysAgo: 16 },
    ],
    estimated: 47.8,
    lossCategory: 'Internal fraud',
    tracks: [
      { regulator: 'PFRDA', required: true, basis: 'Subscriber-impacting event — reportable within 48 hours and in the quarterly return.', reportedDaysAgo: 19, reference: 'PFRDA/SPF/INC/2026/044' },
      { regulator: 'Statutory auditor', required: true, basis: 'Loss above the ₹10 lakh reporting threshold.', reportedDaysAgo: 17 },
      { regulator: 'Police / EOW', required: false, basis: 'Below the ₹1 crore board threshold for criminal referral; kept under review as the quantum firms up.' },
      { regulator: 'DPDP Board', required: false, basis: 'No personal data was disclosed to a third party; bank details were altered, not exfiltrated.' },
    ],
    steps: [
      { daysAgo: 20, actor: 'anjali', action: 'Case opened from a converted speak-up report', note: 'Reporter identity not held; the case carries the reference code only.' },
      { daysAgo: 20, actor: 'meera', action: 'Both subjects suspended from the payments workflow pending investigation' },
      { daysAgo: 19, actor: 'lakshmi', action: 'PFRDA 48-hour notification filed', note: 'PFRDA/SPF/INC/2026/044' },
      { daysAgo: 19, actor: 'lakshmi', action: 'CRA change log and payment files pulled for the quarter' },
      { daysAgo: 16, actor: 'lakshmi', action: 'Common IFSC identified across two beneficiary accounts' },
      { daysAgo: 12, actor: 'rohan', action: 'Four-eyes rule tightened on bank-mandate changes while the case runs', note: 'Interim control — the permanent fix is tracked as a remediation issue.' },
      { daysAgo: 5, actor: 'lakshmi', action: 'Interviews completed with both subjects; forensic report in draft' },
    ],
    controlHint: /maker|checker|segregation|four.?eyes|payment|reconcil/i,
  },
  // ── closed, substantiated, recovered ──────────────────────────────────────
  {
    id: 'FRD-2026-003',
    title: 'Duplicate vendor invoices paid against a single purchase order',
    scheme: 'Procurement fraud',
    detection: 'Reconciliation break',
    severity: 'High',
    detectedDaysAgo: 168,
    openedDaysAgo: 166,
    stage: 'Closed',
    outcome: 'Substantiated',
    investigator: 'lakshmi',
    sponsor: 'anjali',
    subjects: [{ ref: 'Subject C — Accounts Payable', internal: true }, { ref: 'Vendor — facilities contractor', internal: false }],
    indicators: [
      { label: 'Two invoices with identical line items and different invoice numbers', source: 'Accounts payable ledger', value: '₹18.40 lakh', daysAgo: 168 },
      { label: 'Payment approved outside the delegation matrix', source: 'Payment workflow', daysAgo: 167 },
      { label: 'Vendor bank account changed one week before the second payment', source: 'Vendor master', daysAgo: 166 },
    ],
    estimated: 18.4,
    confirmed: 18.4,
    recovered: 14.2,
    lossCategory: 'Internal fraud',
    accountingRef: 'JV-FY26-1188',
    tracks: [
      { regulator: 'Statutory auditor', required: true, basis: 'Loss above the ₹10 lakh reporting threshold.', reportedDaysAgo: 160 },
      { regulator: 'PFRDA', required: false, basis: 'No subscriber impact — a corporate payables matter.' },
    ],
    steps: [
      { daysAgo: 166, actor: 'lakshmi', action: 'Case opened from a month-end reconciliation break' },
      { daysAgo: 158, actor: 'lakshmi', action: 'Forensic review of 14 months of payments to the vendor completed' },
      { daysAgo: 140, actor: 'anjali', action: 'Recovery demanded from the vendor under the contract' },
      { daysAgo: 118, actor: 'deepa', action: '₹14.20 lakh recovered by set-off against outstanding invoices' },
      { daysAgo: 96, actor: 'anjali', action: 'Case closed; duplicate-invoice detection added to the CCM rule set' },
    ],
    disciplinary: 'Employment terminated following the disciplinary process; the vendor was removed from the approved list.',
    recovery: '₹14.20 lakh of ₹18.40 lakh recovered by set-off. The balance was written off with Audit Committee approval.',
    closedDaysAgo: 96,
    closureNote:
      'Substantiated. Duplicate invoices were paid because the three-way match was overridden manually and the override was never sampled. The control has been made preventive and the override is now an exception requiring approval.',
    controlHint: /invoice|payment|procure|vendor|three.?way/i,
  },
  // ── cyber-enabled, open, with a live CERT-In clock ────────────────────────
  {
    id: 'FRD-2026-009',
    title: 'Credential-stuffing attempts against the subscriber withdrawal portal',
    scheme: 'Cyber-enabled fraud',
    detection: 'Transaction monitoring alert',
    severity: 'High',
    detectedDaysAgo: 6,
    openedDaysAgo: 6,
    stage: 'Triage',
    investigator: 'karthik',
    sponsor: 'rajesh',
    subjects: [{ ref: 'External actor — credential list of unknown origin', internal: false }],
    indicators: [
      { label: 'Login attempts from 412 distinct IPs against 1,180 PRAN accounts', source: 'Splunk SIEM', value: '1,180 accounts', daysAgo: 6 },
      { label: 'Success rate consistent with credential reuse rather than brute force', source: 'Splunk SIEM', value: '0.7%', daysAgo: 6 },
      { label: 'Two withdrawal requests raised from a session that succeeded', source: 'Portal transaction log', value: '₹3.90 lakh', daysAgo: 5 },
    ],
    estimated: 3.9,
    recovered: 3.9,
    lossCategory: 'External fraud',
    tracks: [
      { regulator: 'CERT-In', required: true, basis: 'Cyber-enabled fraud — CERT-In Direction 20(3)/2022, 6 hours from detection.', reportedDaysAgo: 6, reference: 'CERTIN/2026/INC/8871' },
      { regulator: 'PFRDA', required: true, basis: 'Subscriber accounts affected — 48-hour notification.', reportedDaysAgo: 5, reference: 'PFRDA/SPF/INC/2026/051' },
      { regulator: 'DPDP Board', required: true, basis: 'Subscriber personal data accessed without authorisation.', dueInDays: 1 },
      { regulator: 'Statutory auditor', required: false, basis: 'Below the ₹10 lakh reporting threshold; both withdrawals were stopped.' },
    ],
    steps: [
      { daysAgo: 6, actor: 'karthik', action: 'Alert raised by transaction monitoring and triaged as fraud rather than availability' },
      { daysAgo: 6, actor: 'karthik', action: 'CERT-In 6-hour notification filed', note: 'CERTIN/2026/INC/8871' },
      { daysAgo: 5, actor: 'neha', action: 'Both withdrawal requests intercepted before settlement; funds not lost' },
      { daysAgo: 5, actor: 'rajesh', action: 'Step-up authentication forced on withdrawal journeys' },
      { daysAgo: 2, actor: 'priya', action: 'DPDP assessment under way on the accounts successfully accessed' },
    ],
    recovery: 'Both withdrawal requests were stopped before settlement; no subscriber funds were lost.',
    controlHint: /authenticat|mfa|access|portal|monitor/i,
  },
  // ── payroll, in recovery, unsubstantiated on the main allegation ──────────
  {
    id: 'FRD-2026-005',
    title: 'Expense claims submitted against cancelled travel',
    scheme: 'Payroll & expenses',
    detection: 'CCM rule failure',
    severity: 'Medium',
    // Six days past the 90-day investigation target for a medium case.
    detectedDaysAgo: 98,
    openedDaysAgo: 96,
    stage: 'Recovery & action',
    outcome: 'Partially substantiated',
    investigator: 'deepa',
    sponsor: 'anjali',
    subjects: [{ ref: 'Subject D — Investments', internal: true }],
    indicators: [
      { label: 'Expense claims matched to airline cancellations', source: 'CCM rule — expense vs travel booking', value: '6 claims', daysAgo: 98 },
      { label: 'Claims submitted on the last day of the approval window', source: 'Expense system', value: '5 of 6', daysAgo: 97 },
    ],
    estimated: 2.7,
    confirmed: 1.9,
    recovered: 1.9,
    lossCategory: 'Internal fraud',
    accountingRef: 'JV-FY27-0221',
    tracks: [
      { regulator: 'Statutory auditor', required: false, basis: 'Below the ₹10 lakh reporting threshold.' },
      { regulator: 'PFRDA', required: false, basis: 'No subscriber impact.' },
    ],
    steps: [
      { daysAgo: 96, actor: 'deepa', action: 'Case opened from a failing continuous-control rule' },
      { daysAgo: 86, actor: 'deepa', action: 'Four of six claims explained by re-booked travel; two unsupported' },
      { daysAgo: 64, actor: 'farhan', action: '₹1.90 lakh recovered through payroll deduction with consent' },
      { daysAgo: 41, actor: 'anjali', action: 'Written warning issued; expense policy re-issued to the department' },
    ],
    disciplinary: 'Written warning; repayment agreed and completed.',
    recovery: '₹1.90 lakh recovered in full through payroll deduction.',
    controlHint: /expense|travel|claim|approval/i,
  },
  // ── external, subscriber identity fraud, closed unsubstantiated ───────────
  {
    id: 'FRD-2026-002',
    title: 'Suspected impersonation on a nomination change request',
    scheme: 'Identity & subscriber fraud',
    detection: 'Subscriber complaint',
    severity: 'Medium',
    detectedDaysAgo: 205,
    openedDaysAgo: 204,
    stage: 'Closed',
    outcome: 'Unsubstantiated',
    investigator: 'lakshmi',
    sponsor: 'anjali',
    subjects: [{ ref: 'External — claimed nominee', internal: false }],
    indicators: [
      { label: 'Nomination change submitted with a signature variance', source: 'CRA document check', daysAgo: 205 },
      { label: 'Subscriber contacted the call centre disputing the change', source: 'Subscriber servicing', daysAgo: 204 },
    ],
    estimated: 0,
    confirmed: 0,
    lossCategory: 'External fraud',
    tracks: [
      { regulator: 'PFRDA', required: true, basis: 'Subscriber-impacting event — notified within 48 hours.', reportedDaysAgo: 203, reference: 'PFRDA/SPF/INC/2025/318' },
      { regulator: 'DPDP Board', required: false, basis: 'No personal data was disclosed to an unauthorised party.' },
    ],
    steps: [
      { daysAgo: 204, actor: 'lakshmi', action: 'Case opened from a subscriber complaint' },
      { daysAgo: 203, actor: 'anjali', action: 'PFRDA notification filed as a precaution', note: 'PFRDA/SPF/INC/2025/318' },
      { daysAgo: 190, actor: 'lakshmi', action: 'Signature verified against the original KYC record; variance explained by a change of name on marriage' },
      { daysAgo: 186, actor: 'anjali', action: 'Case closed as unsubstantiated; the subscriber was informed' },
    ],
    closedDaysAgo: 186,
    closureNote:
      'Not substantiated. The nomination change was genuine; the signature variance followed a documented change of name. The complaint arose from a servicing communication that did not reach the subscriber, which has been fixed.',
    restricted: false,
    controlHint: /kyc|identity|nomination|verification/i,
  },
]

export function buildFraudCases(risks: Risk[], controls: Control[], issues: Issue[]): FraudCase[] {
  const opsRisk = risks.find((r) => r.domain === 'Operational')
  const cyberRisk = risks.find((r) => r.domain === 'Cyber')
  const tprRisk = risks.find((r) => r.domain === 'ThirdParty')

  return FRAUD_SPECS.map((s) => {
    const matched = controls.filter((c) => s.controlHint?.test(c.title)).slice(0, 3)
    const linkedControls = matched.length ? matched.map((c) => c.id) : [controls[0].id]
    const linkedRiskIds =
      s.scheme === 'Cyber-enabled fraud'
        ? [cyberRisk?.id, opsRisk?.id]
        : s.scheme === 'Procurement fraud'
          ? [tprRisk?.id, opsRisk?.id]
          : [opsRisk?.id]
    // A substantiated case links to the issues that carry its remediation; the
    // seed binds real open issues so the action plan is never an empty panel.
    const openIssues = issues.filter((i) => i.status !== 'Resolved' && linkedControls.some((c) => i.linkedControls.includes(c))).slice(0, 2)

    return {
      id: s.id,
      title: s.title,
      scheme: s.scheme,
      detection: s.detection,
      sourceRef: s.detection === 'Whistleblower report' ? undefined : linkedControls[0],
      detectedOn: daysAgo(s.detectedDaysAgo),
      openedOn: daysAgo(s.openedDaysAgo),
      stage: s.stage,
      outcome: s.outcome,
      severity: s.severity,
      investigator: s.investigator,
      sponsor: s.sponsor,
      subjects: s.subjects,
      indicators: s.indicators.map((i) => ({ label: i.label, source: i.source, value: i.value, observedOn: daysAgo(i.daysAgo) })),
      estimatedLossLakh: s.estimated,
      confirmedLossLakh: s.confirmed,
      recoveredLakh: s.recovered,
      lossCategory: s.lossCategory,
      accountingRef: s.accountingRef,
      timeline: s.steps.map((st) => ({ at: daysAgo(st.daysAgo), actor: st.actor, action: st.action, note: st.note })),
      regulatoryTracks: s.tracks.map((t) => ({
        regulator: t.regulator,
        required: t.required,
        basis: t.basis,
        dueBy: t.dueInDays !== undefined ? daysAhead(t.dueInDays) : undefined,
        reportedOn: t.reportedDaysAgo !== undefined ? daysAgo(t.reportedDaysAgo) : undefined,
        reference: t.reference,
      })),
      evidenceIds: [],
      linkedControls,
      linkedRiskIds: linkedRiskIds.filter(Boolean) as string[],
      linkedIssueIds: openIssues.map((i) => i.id),
      whistleblowerRef: s.wbRef,
      disciplinaryAction: s.disciplinary,
      recoveryAction: s.recovery,
      closedOn: s.closedDaysAgo !== undefined ? daysAgo(s.closedDaysAgo) : undefined,
      closureNote: s.closureNote,
      // Fraud cases are restricted while they name subjects; a closed,
      // unsubstantiated case with no internal subject is not.
      restricted: s.restricted ?? true,
      accessList: Array.from(new Set([...ETHICS, s.investigator, s.sponsor, 'meera'])),
      recusals: [],
    }
  })
}

/** Bind case evidence to real Vault items once the pool exists. */
export function bindCaseEvidence(reports: WhistleblowerReport[], cases: FraudCase[], evidence: { id: string; type: string }[]): void {
  const pool = evidence.filter((e) => e.type === 'Log' || e.type === 'Config export' || e.type === 'Attestation')
  let i = 0
  for (const c of cases) {
    // Enough to stand up an investigation file: one artefact per indicator, to
    // a maximum of four.
    c.evidenceIds = c.indicators.slice(0, 4).map(() => pool[(i += 5) % Math.max(1, pool.length)]?.id).filter(Boolean) as string[]
  }
  for (const r of reports) {
    if (r.stage === 'Received' || r.stage === 'Rejected') continue
    r.evidenceIds = [pool[(i += 7) % Math.max(1, pool.length)]?.id].filter(Boolean) as string[]
  }
}
