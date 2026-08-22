import type { CopilotAnswer } from './response'

// Scripted, grounded answers for the shortlisted demo records (DPDP + profession-
// tax chains). Keyed by entity id; the first entry whose keywords match the
// question wins. Anything unmatched falls back to the grounded summary responder,
// so every record still answers. Deterministic — no model call.
interface Script {
  keywords: string[]
  text: string
  citedIds?: string[]
  sourceIds?: string[]
}

const SCRIPTS: Record<string, Script[]> = {
  // ── DPDP clauses ──────────────────────────────────────────────────────────
  'SRC-DPDP-2025': [
    { keywords: ['require', 'what', 'mean', 'do'], text: 'Section 8(6) requires SPF, as a Data Fiduciary, to intimate a personal-data breach to the Data Protection Board and to each affected Data Principal in the form and within the time the DPDP Rules 2025 prescribe. It is satisfied by CTRL-COMP-DPB-01 — the single breach-detection-and-notification control that also covers the CERT-In six-hour report.', citedIds: ['CTRL-COMP-DPB-01'], sourceIds: ['SRC-DPDP-2025'] },
    { keywords: ['penalt', 'fine', 'consequence', 'miss'], text: 'A breach following a failure to safeguard personal data is penalised up to ₹250 crore under the Schedule to Section 33 — that tier is why this clause carries a Critical severity.', sourceIds: ['SRC-DPDP-2025'] },
    { keywords: ['control', 'satisf', 'map', 'who'], text: 'CTRL-COMP-DPB-01 satisfies it — one control mapped to DPDP §8(6), ISO 27001 A.5.24 and NIST CSF RS.CO, so the firm responds once and satisfies several duties together.', citedIds: ['CTRL-COMP-DPB-01'] },
  ],
  'SRC-DPDP-8-5': [
    { keywords: ['require', 'what', 'mean'], text: 'Section 8(5) requires reasonable security safeguards over personal data — encryption, access control and monitoring. It is Saved to CTRL-COMP-SEC-01, which runs those safeguards on the CRA and KYC stores.', citedIds: ['CTRL-COMP-SEC-01'], sourceIds: ['SRC-DPDP-8-5'] },
    { keywords: ['penalt', 'fine', 'consequence'], text: 'Failure resulting in a breach is penalised up to ₹250 crore (Schedule, s.33) — the source of this clause’s Critical severity.', sourceIds: ['SRC-DPDP-8-5'] },
  ],
  'SRC-DPDP-33': [
    { keywords: ['penalt', 'fine', 'how much', 'amount', 'consequence', 'what'], text: 'The Schedule to Section 33 sets the maximum penalties — up to ₹250 crore for failing to take reasonable security safeguards. These tiers feed the derived severity on the DPDP security and breach clauses.', sourceIds: ['SRC-DPDP-33'] },
  ],
  // ── DPDP control ──────────────────────────────────────────────────────────
  'CTRL-COMP-DPB-01': [
    { keywords: ['framework', 'satisf', 'map', 'standard'], text: 'It satisfies three at once from a single test and evidence trail: DPDP §8(6) breach intimation, ISO 27001 A.5.24 (incident management) and NIST CSF RS.CO — the map-once-satisfy-many control.', sourceIds: ['SRC-DPDP-2025'] },
    { keywords: ['test', 'implement', 'operat', 'assur', 'work'], text: 'A Detective control run continuously; last tested 12 days ago with a Pass. The breach-notification runbook (EVD-44604) and the auto-captured config evidence prove it operates.' },
    { keywords: ['derive', 'source', 'why', 'come from'], text: 'It derives from DPDP §8(6) (SRC-DPDP-2025) — the breach-intimation clause it was saved from — and is the control behind the marquee incident INC-2026-0411’s three regulator tracks.', sourceIds: ['SRC-DPDP-2025'] },
  ],
  'CTRL-COMP-SEC-01': [
    { keywords: ['derive', 'source', 'framework', 'satisf'], text: 'It derives from DPDP §8(5) reasonable security safeguards (SRC-DPDP-8-5), mapped to ISO 27001 A.8.24 / A.5.15.', sourceIds: ['SRC-DPDP-8-5'] },
    { keywords: ['test', 'implement', 'operat', 'evidence'], text: 'A Preventive CCM control; last tested 4 days ago with a Pass. The KYC-store encryption & access-control config export (EVD-44605) is auto-captured proof.' },
  ],
  // ── DPDP obligation ───────────────────────────────────────────────────────
  'OBL-DPDP-JUN26-01': [
    { keywords: ['source', 'derive', 'why', 'come from'], text: 'It derives from DPDP §6 consent (SRC-DPDP-2025) — reconciling subscriber consent records each quarter.', sourceIds: ['SRC-DPDP-2025'] },
    { keywords: ['evidence', 'prove', 'proof'], text: 'Proven by the quarterly consent-ledger reconciliation attestation (EVD-44606).' },
    { keywords: ['due', 'when', 'next'], text: 'Quarterly; next due 02 Jul 2026, owned by Anjali Deshmukh under maker-checker.' },
  ],
  // ── Marquee incident ──────────────────────────────────────────────────────
  'INC-2026-0411': [
    { keywords: ['regulator', 'notif', 'clock', 'report', 'who'], text: 'Three regulators on one record, on one clock: CERT-In (6-hour), PFRDA (48-hour, subscriber-impacting) and the DPDP Board (~72-hour). One breach-response control, CTRL-COMP-DPB-01, drafts all three filings from the same evidence.', citedIds: ['CTRL-COMP-DPB-01'] },
    { keywords: ['control', 'risk', 'touch', 'evidence'], text: 'It links the controls that failed and mitigate it, the risks it realised (RISK-IT-0034/0037/0038), the remediation issue ISS-2026-0103, and a shared evidence trail — one object, every view.' },
  ],
  // ── Profession-tax chain ──────────────────────────────────────────────────
  'INST-PT-MAH-1975': [
    { keywords: ['require', 'what', 'about', 'cover', 'do', 'us'], text: 'The Maharashtra Profession Tax Act, 1975 makes SPF, as an employer, deduct profession tax from salaries, pay it to the State and file the periodic return — and it is liable whether or not it actually deducts. The operative clause is s.4 (deduct & pay), saved to CTRL-COMP-PT-01.', citedIds: ['SRC-PT-4', 'CTRL-COMP-PT-01'], sourceIds: ['SRC-PT-4'] },
    { keywords: ['control', 'satisf', 'map', 'owner', 'who'], text: 'One control satisfies this act end-to-end: CTRL-COMP-PT-01 — the profession-tax deduction, remittance & return control owned by Farhan Ali — which in turn supports the monthly remittance duty OBL-LAB-JUN26-02.', citedIds: ['CTRL-COMP-PT-01', 'OBL-LAB-JUN26-02'] },
    { keywords: ['penalt', 'consequence', 'late', 'miss', 'fine', 'non-compl'], text: 'Late deposit attracts simple interest of 1.25% per month (s.9) and a penalty of up to 10% of the tax due (s.10) — the tiers behind this act’s clause severities.', sourceIds: ['SRC-PT-4'] },
    { keywords: ['decision', 'awaiting', 'pending', 'need', 'outstanding', 'clause'], text: 'The clause table above shows where each clause stands; the lead clause s.4 (deduct & pay) is already Saved to CTRL-COMP-PT-01. Open any clause for its extract, penalty tiers and decision.', citedIds: ['SRC-PT-4', 'CTRL-COMP-PT-01'] },
  ],
  'SRC-PT-4': [
    { keywords: ['require', 'what', 'mean', 'do'], text: 'Section 4 makes SPF, as employer, deduct Maharashtra profession tax from salaries and pay it to the State — and it is liable whether or not it actually deducts. It is Saved to CTRL-COMP-PT-01.', citedIds: ['CTRL-COMP-PT-01'], sourceIds: ['SRC-PT-4'] },
    { keywords: ['control', 'satisf', 'map'], text: 'Saved to CTRL-COMP-PT-01 — the profession-tax deduction, remittance & return control owned by Farhan Ali.', citedIds: ['CTRL-COMP-PT-01'] },
    { keywords: ['penalt', 'consequence', 'late', 'miss'], text: 'Late deposit attracts simple interest of 1.25% per month (s.9) and a penalty of up to 10% of the tax due (s.10).' },
  ],
  'CTRL-COMP-PT-01': [
    { keywords: ['derive', 'source', 'why', 'satisf'], text: 'It derives from the Maharashtra PT Act — s.4 (deduct & pay), s.6 (return) and s.8 (payment) — and supports the monthly remittance duty OBL-LAB-JUN26-02.', sourceIds: ['SRC-PT-4'] },
    { keywords: ['evidence', 'prove', 'implement', 'test', 'operat'], text: 'Proven by the PTRC registration certificate (EVD-44600), the monthly PT challan acknowledgement (EVD-44601), the PT return acknowledgement (EVD-44602) and the payroll deduction register (EVD-44603).' },
  ],
  'OBL-LAB-JUN26-02': [
    { keywords: ['source', 'derive', 'why', 'come from'], text: 'It derives from the Maharashtra PT Act (s.4/6/8) and is satisfied by CTRL-COMP-PT-01.', citedIds: ['CTRL-COMP-PT-01'], sourceIds: ['SRC-PT-4'] },
    { keywords: ['evidence', 'prove', 'proof', 'audit'], text: 'Proven by the monthly PT challan acknowledgement (EVD-44601), the return acknowledgement (EVD-44602) and the payroll deduction register (EVD-44603) — a complete, audit-ready trail.' },
    { keywords: ['due', 'when', 'status', 'filed'], text: 'Monthly; currently Filed for the period and approved under maker-checker (maker Farhan Ali, checker Meera Krishnan).' },
  ],
  // ── Companies Act / ROC filings ───────────────────────────────────────────
  'SRC-CA-92-5': [
    { keywords: ['require', 'what', 'mean', 'do'], text: 'Section 92(5) requires the company to file the annual return (MGT-7) within the prescribed period; officers in default may be penalised. It is satisfied in OneGRC by CTRL-COMP-CA-02 which owns the MGT-7 preparation and filing process.', citedIds: ['CTRL-COMP-CA-02'], sourceIds: ['SRC-CA-92-5'] },
    { keywords: ['penalt', 'fine', 'consequence', 'miss'], text: 'Failure to file attracts a company-level penalty and a per-day additional fee under the ROC Fees Rules; the platform captures filing acknowledgements as evidence (EVD-44610).', sourceIds: ['SRC-CA-92-5', 'SRC-CA-403'] },
  ],
  'SRC-CA-137-3': [
    { keywords: ['require', 'what', 'mean'], text: 'Section 137(3) requires timely filing of financial statements (AOC-4); CTRL-COMP-CA-03 is the control that prepares and files AOC-4 and captures the auditors’ sign-off.', citedIds: ['CTRL-COMP-CA-03'], sourceIds: ['SRC-CA-137-3'] },
    { keywords: ['penalt', 'fine'], text: 'Late filing attracts per-day penalties and additional fees under the Fees Rules; preserve the filing acknowledgements for audit (EVD-44611).', sourceIds: ['SRC-CA-137-3', 'SRC-CA-403'] },
  ],
  'CTRL-COMP-CA-02': [
    { keywords: ['derive', 'source', 'why', 'satisf'], text: 'This preventive control prepares, reviews and files the MGT-7 annual return; it derives from Companies Act Section 92(5) and the Fees Rules (SRC-CA-92-5, SRC-CA-403).', sourceIds: ['SRC-CA-92-5', 'SRC-CA-403'] },
    { keywords: ['evidence', 'prove', 'file', 'ack'], text: 'Proven by the MGT-7 filing acknowledgement (EVD-44610) and board-signed minutes approving the annual return (EVD-44612).', citedIds: ['EVD-44610', 'EVD-44612'] },
  ],
  'SRC-CA-164-2': [
    { keywords: ['require', 'what', 'mean', 'do'], text: 'Section 164(2) is a consequence provision: a continuous three-year filing default would disqualify directors. OneGRC tracks the risk through CTRL-COMP-CA-04 and a quarterly ROC filing health review obligation, keeping the risk visible even while SPF is current on filings.', citedIds: ['CTRL-COMP-CA-04'], sourceIds: ['SRC-CA-164-2'] },
    { keywords: ['penalt', 'fine', 'disqualif', 'consequence'], text: 'The clause is about director disqualification for continuous default, not a regular filing. The platform models it as a monitoring risk rather than a separate filing duty.', sourceIds: ['SRC-CA-164-2'] },
  ],
  'CTRL-COMP-CA-04': [
    { keywords: ['derive', 'source', 'why', 'satisf'], text: 'It monitors ROC filing health and the director-disqualification trigger in Section 164(2); it is mapped to SRC-CA-164-2, SRC-CA-92-5 and SRC-CA-137-3 so the team sees the end-to-end filing risk.', sourceIds: ['SRC-CA-164-2', 'SRC-CA-92-5', 'SRC-CA-137-3'] },
    { keywords: ['evidence', 'prove', 'file', 'ack'], text: 'Proven by the ROC filing health attestation (EVD-44613).', citedIds: ['EVD-44613'] },
  ],
  'OBL-CA-FY26-05': [
    { keywords: ['source', 'derive', 'why', 'come from'], text: 'This obligation is a quarterly ROC filing health review derived from Section 164(2) and the Companies Act filing duties. It keeps the director-disqualification risk visible even though the trigger has not occurred.', sourceIds: ['SRC-CA-164-2', 'SRC-CA-92-5', 'SRC-CA-137-3'] },
    { keywords: ['evidence', 'prove', 'proof'], text: 'Proven by the ROC filing health attestation (EVD-44613).', citedIds: ['EVD-44613'] },
    { keywords: ['monitor', 'risk', 'health', 'due'], text: 'Quarterly monitoring; this obligation surfaces the health check, not a one-time ROC filing itself.', sourceIds: ['SRC-CA-164-2'] },
  ],
  'OBL-CA-FY26-03': [
    { keywords: ['source', 'derive', 'why', 'come from'], text: 'This obligation is the annual MGT-7 ROC filing derived from Section 92(5) of the Companies Act; maker-checker is assigned to the Company Secretary and Finance.', sourceIds: ['SRC-CA-92-5'] },
    { keywords: ['evidence', 'prove', 'proof'], text: 'Proven by the MGT-7 filing acknowledgement (EVD-44610) and supporting board minutes (EVD-44612).', citedIds: ['EVD-44610', 'EVD-44612'] },
    { keywords: ['when', 'due', 'next'], text: 'Annual; check the obligation card for the exact due date and the next filing window in the obligations list.' },
  ],
}

/** Return a crafted answer for a known demo question, or null to fall back. */
export function scriptedAnswer(entityId: string, question: string): CopilotAnswer | null {
  const entries = SCRIPTS[entityId]
  if (!entries) return null
  const q = question.toLowerCase()
  const hit = entries.find((e) => e.keywords.some((k) => q.includes(k)))
  if (!hit) return null
  return { text: hit.text, citedIds: hit.citedIds ?? [], sourceIds: hit.sourceIds ?? [], confidence: 'high' }
}
