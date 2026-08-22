// Policy attestation — the second payload on the WI-09 campaign container.
//
// One rule shapes everything here: **an attestation is against a version.**
// Republishing a policy at v3.5 does not carry forward the staff who
// acknowledged v3.4, so the version travels inside the response and every
// coverage figure is computed against `policy.version` as it stands now. A
// register that reports "94% attested" while the document has moved on is the
// failure mode this exists to prevent.
//
// The write-back on approval is narrower than the RCSA's: an acknowledgement
// does not change the policy, so coverage stays derived. What *does* write back
// is a 'Cannot comply' declaration — it routes to the exception register as a
// real, time-boxed Issue rather than sitting inside a campaign response.
import type {
  AttestationResponse,
  Campaign,
  CampaignTask,
  ComprehensionAnswer,
  Policy,
} from '@/types'
import { WORLD, getPolicy } from '@/data'
import { PEOPLE_BY_ID, personName } from '@/data/people'
import { NOW_MS } from '@/lib/time'

const DAY = 86400000

// ── comprehension check ──────────────────────────────────────────────────────
// Three questions per policy, drawn from a bank keyed to its category. A tick
// box proves the page was opened; a wrong answer is what tells the second line
// the message did not land.

export interface ComprehensionQuestion {
  id: string
  prompt: string
  options: string[]
  answer: number
}

const BANK: Record<string, Omit<ComprehensionQuestion, 'id'>[]> = {
  Security: [
    {
      prompt: 'You receive an email asking you to approve an MFA prompt you did not trigger. What do you do?',
      options: ['Approve it — it is probably a stale session', 'Deny it and report to SecOps the same day', 'Ignore it and carry on'],
      answer: 1,
    },
    {
      prompt: 'A CERT-In reportable incident must be notified within what window of detection?',
      options: ['6 hours', '24 hours', '72 hours'],
      answer: 0,
    },
    {
      prompt: 'Where may subscriber PRAN data be stored?',
      options: ['Any cloud region the team prefers', 'In-India systems only, per the retention rule', 'Anywhere, if encrypted'],
      answer: 1,
    },
  ],
  Data: [
    {
      prompt: 'A subscriber asks for erasure of data the fund must retain by statute. What happens?',
      options: ['Erase it — the request wins', 'Refuse and record the statutory retention basis on the DSAR', 'Ignore the request'],
      answer: 1,
    },
    {
      prompt: 'How is a personal-data breach affecting subscribers escalated?',
      options: ['To the DPO, who assesses the DPDP Board clock', 'To your line manager only', 'It is not escalated unless money is lost'],
      answer: 0,
    },
    {
      prompt: 'Full PRAN numbers may be shown in an internal report.',
      options: ['True', 'False — masked display only'],
      answer: 1,
    },
  ],
  Governance: [
    {
      prompt: 'You are asked to both prepare and approve the same regulatory filing. What do you do?',
      options: ['Complete both — it is faster', 'Decline the approval and route it to a second person', 'Approve and note it afterwards'],
      answer: 1,
    },
    {
      prompt: 'A gift is offered by a vendor during a live tender. What is required?',
      options: ['Nothing, if under ₹5,000', 'Declare it and decline', 'Accept and inform the vendor'],
      answer: 1,
    },
    {
      prompt: 'Who may waive a control requirement?',
      options: ['Any department head', 'Nobody — it needs an approved, time-boxed exception', 'The control owner'],
      answer: 1,
    },
  ],
  Investment: [
    {
      prompt: 'An order would breach a PFRDA exposure limit at execution. What is the required action?',
      options: ['Execute and correct at month-end', 'Block the order and escalate to Investment Compliance', 'Split the order across two days'],
      answer: 1,
    },
    {
      prompt: 'Who signs off a deviation from the investment mandate?',
      options: ['The dealer', 'The Investment Committee, on a recorded exception', 'The fund accountant'],
      answer: 1,
    },
    {
      prompt: 'Personal trading in a security on the restricted list is permitted if disclosed afterwards.',
      options: ['True', 'False — pre-clearance is required'],
      answer: 1,
    },
  ],
  Resilience: [
    {
      prompt: 'How often must the recovery plan for a critical system be tested?',
      options: ['At least annually, with results evidenced', 'Only after an outage', 'When the vendor asks'],
      answer: 0,
    },
    {
      prompt: 'During an outage, who declares invocation of the continuity plan?',
      options: ['Whoever notices first', 'The crisis management team lead', 'The affected user'],
      answer: 1,
    },
    {
      prompt: 'A failed backup job may be closed without evidence of a successful re-run.',
      options: ['True', 'False'],
      answer: 1,
    },
  ],
}

const DEFAULT_BANK: Omit<ComprehensionQuestion, 'id'>[] = [
  {
    prompt: 'Who do you tell first if you believe this policy has been breached?',
    options: ['Nobody, unless asked', 'Your line manager and the policy owner, the same day', 'The regulator'],
    answer: 1,
  },
  {
    prompt: 'A requirement in this policy cannot be met by your team. What is the correct route?',
    options: ['Carry on and note it informally', 'Raise a time-boxed exception with a compensating control', 'Assume it does not apply'],
    answer: 1,
  },
  {
    prompt: 'Acknowledging this policy covers every later version of it.',
    options: ['True', 'False — each published version is acknowledged separately'],
    answer: 1,
  },
]

/** The three questions asked against a policy — deterministic, so the same
 *  policy always asks the same thing. */
export function questionsFor(policy: Pick<Policy, 'id' | 'category'>): ComprehensionQuestion[] {
  const bank = BANK[policy.category] ?? DEFAULT_BANK
  return bank.map((q, i) => ({ ...q, id: `${policy.id}-Q${i + 1}` }))
}

export const PASS_MARK = 67

// ── the payload ──────────────────────────────────────────────────────────────

export function asAttestation(task: CampaignTask): AttestationResponse | undefined {
  const r = task.response as Partial<AttestationResponse>
  if (typeof r.acknowledged !== 'boolean') return undefined
  return {
    version: r.version ?? getPolicy(task.objectId)?.version ?? '',
    acknowledged: r.acknowledged,
    answers: r.answers ?? [],
    comprehensionScore: r.comprehensionScore ?? 0,
    declaration: r.declaration,
  }
}

export function draftAttestation(policy: Policy): AttestationResponse {
  return { version: policy.version, acknowledged: false, answers: [], comprehensionScore: 0 }
}

export const scoreAnswers = (answers: ComprehensionAnswer[], total: number): number =>
  total === 0 ? 100 : Math.round((answers.filter((a) => a.correct).length / total) * 100)

/** What still stands between the reader and a submission. */
export function attestationGaps(r: AttestationResponse, policy: Policy): string[] {
  const gaps: string[] = []
  const qs = questionsFor(policy)
  if (!r.acknowledged) gaps.push(`Confirm you have read ${policy.title} ${policy.version}.`)
  if (r.answers.length < qs.length) gaps.push(`Answer all ${qs.length} comprehension questions.`)
  else if (r.comprehensionScore < PASS_MARK)
    gaps.push(`Comprehension ${r.comprehensionScore}% is below the ${PASS_MARK}% pass mark — review the answers marked wrong.`)
  if (r.declaration && !r.declaration.detail.trim()) gaps.push(`A ${r.declaration.kind.toLowerCase()} declaration needs detail.`)
  if (r.version !== policy.version)
    gaps.push(`This response is against ${r.version}; the policy is now ${policy.version}. Re-read and re-acknowledge.`)
  return gaps
}

export const isAttestationComplete = (r: AttestationResponse, p: Policy) => attestationGaps(r, p).length === 0

// ── reading attestations back off the policy ─────────────────────────────────

export interface AttestationRecord {
  campaign: Campaign
  task: CampaignTask
  response: AttestationResponse
  /** False where the acknowledgement predates the policy's current version. */
  currentVersion: boolean
  at: string
}

/** Every approved acknowledgement against a policy, newest first. */
export function attestationsFor(policyId: string, all: Campaign[] = WORLD.campaigns): AttestationRecord[] {
  const policy = getPolicy(policyId)
  const out: AttestationRecord[] = []
  for (const c of all) {
    if (c.type !== 'Policy attestation') continue
    for (const t of c.tasks) {
      if (t.objectId !== policyId || t.status !== 'Approved') continue
      const response = asAttestation(t)
      if (!response) continue
      out.push({
        campaign: c,
        task: t,
        response,
        currentVersion: !!policy && response.version === policy.version,
        at: t.reviewedOn ?? t.submittedOn ?? c.dueOn,
      })
    }
  }
  return out.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
}

/** Has this person acknowledged the version currently in force? */
export function hasAttested(policyId: string, personId: string, all: Campaign[] = WORLD.campaigns): AttestationRecord | undefined {
  return attestationsFor(policyId, all).find((a) => a.task.assignee === personId && a.currentVersion)
}

/** An attestation cycle asking this policy of someone right now. */
export function openAttestation(policyId: string, all: Campaign[] = WORLD.campaigns): { campaign: Campaign; outstanding: number } | undefined {
  for (const c of all) {
    if (c.type !== 'Policy attestation' || c.status === 'Closed' || c.status === 'Draft') continue
    const outstanding = c.tasks.filter((t) => t.objectId === policyId && t.status !== 'Approved').length
    if (c.tasks.some((t) => t.objectId === policyId)) return { campaign: c, outstanding }
  }
  return undefined
}

// ── coverage ─────────────────────────────────────────────────────────────────

export type PolicyAttestationState = 'Current' | 'Partial' | 'Superseded' | 'Never attested'

export interface PolicyCoverage {
  policy: Policy
  /** Everyone an attestation cycle has ever asked — the audience of record. */
  audience: number
  /** Acknowledged the version in force. */
  attested: number
  /** Acknowledged an earlier version and not since re-acknowledged. */
  stale: number
  outstanding: number
  coveragePct: number
  state: PolicyAttestationState
  lastAt?: string
}

export function policyCoverage(policy: Policy, all: Campaign[] = WORLD.campaigns): PolicyCoverage {
  const records = attestationsFor(policy.id, all)
  const audienceIds = new Set<string>()
  for (const c of all) {
    if (c.type !== 'Policy attestation') continue
    for (const t of c.tasks) if (t.objectId === policy.id) audienceIds.add(t.assignee)
  }
  const currentIds = new Set(records.filter((r) => r.currentVersion).map((r) => r.task.assignee))
  const anyIds = new Set(records.map((r) => r.task.assignee))
  const stale = [...anyIds].filter((id) => !currentIds.has(id)).length
  const audience = audienceIds.size
  const attested = currentIds.size
  const coveragePct = audience ? Math.round((attested / audience) * 100) : 0

  const state: PolicyAttestationState =
    audience === 0 || anyIds.size === 0
      ? 'Never attested'
      : attested === 0
        ? 'Superseded'
        : attested === audience
          ? 'Current'
          : 'Partial'

  return { policy, audience, attested, stale, outstanding: audience - attested, coveragePct, state, lastAt: records[0]?.at }
}

export const coverageTone = (s: PolicyAttestationState): 'ok' | 'warn' | 'danger' | 'neutral' =>
  s === 'Current' ? 'ok' : s === 'Partial' ? 'warn' : s === 'Superseded' ? 'danger' : 'neutral'

export interface AttestationEstate {
  policies: number
  /** Published policies that have been through at least one cycle. */
  inScope: number
  fullyAttested: number
  partial: number
  superseded: number
  never: number
  /** Acknowledgements outstanding across every policy that has an audience. */
  outstanding: number
  /** Weighted by audience, not by policy count — one policy with 23 people
   *  outstanding is not the same as one with 1. */
  coveragePct: number
  worst: PolicyCoverage[]
}

export function attestationEstate(policies: Policy[], all: Campaign[] = WORLD.campaigns): AttestationEstate {
  const rows = policies.filter((p) => p.status === 'Published').map((p) => policyCoverage(p, all))
  const inScopeRows = rows.filter((r) => r.audience > 0)
  const audience = inScopeRows.reduce((n, r) => n + r.audience, 0)
  const attested = inScopeRows.reduce((n, r) => n + r.attested, 0)
  return {
    policies: rows.length,
    inScope: inScopeRows.length,
    fullyAttested: rows.filter((r) => r.state === 'Current').length,
    partial: rows.filter((r) => r.state === 'Partial').length,
    superseded: rows.filter((r) => r.state === 'Superseded').length,
    never: rows.filter((r) => r.state === 'Never attested').length,
    outstanding: inScopeRows.reduce((n, r) => n + r.outstanding, 0),
    coveragePct: audience ? Math.round((attested / audience) * 100) : 0,
    worst: inScopeRows.filter((r) => r.state !== 'Current').sort((a, b) => b.outstanding - a.outstanding),
  }
}

// ── what a cycle surfaces ────────────────────────────────────────────────────

/** Who has not acknowledged, grouped by department — how the chase is actually
 *  run. */
export function outstandingByDepartment(c: Campaign): { department: string; outstanding: number; total: number; people: string[] }[] {
  const map = new Map<string, { outstanding: number; total: number; people: string[] }>()
  for (const t of c.tasks) {
    const dept = PEOPLE_BY_ID[t.assignee]?.department ?? 'Unassigned'
    const cur = map.get(dept) ?? { outstanding: 0, total: 0, people: [] }
    cur.total++
    if (t.status !== 'Approved') {
      cur.outstanding++
      cur.people.push(personName(t.assignee))
    }
    map.set(dept, cur)
  }
  return [...map.entries()]
    .map(([department, v]) => ({ department, ...v }))
    .sort((a, b) => b.outstanding - a.outstanding || b.total - a.total)
}

/** Declarations raised during a cycle — conflicts, clarifications and the
 *  'cannot comply' cases that become exceptions. */
export function declarations(c: Campaign): { task: CampaignTask; declaration: NonNullable<AttestationResponse['declaration']> }[] {
  const out: { task: CampaignTask; declaration: NonNullable<AttestationResponse['declaration']> }[] = []
  for (const t of c.tasks) {
    const r = asAttestation(t)
    if (!r?.declaration) continue
    out.push({ task: t, declaration: r.declaration })
  }
  return out.sort((a, b) => (a.declaration.kind === 'Cannot comply' ? -1 : 1) - (b.declaration.kind === 'Cannot comply' ? -1 : 1))
}

export interface ComprehensionSummary {
  answered: number
  meanScore: number
  /** Questions most often answered wrong — where the message did not land. */
  weakest: { questionId: string; prompt: string; wrong: number; asked: number }[]
}

export function comprehensionSummary(c: Campaign): ComprehensionSummary {
  const scores: number[] = []
  const tally = new Map<string, { wrong: number; asked: number }>()
  for (const t of c.tasks) {
    const r = asAttestation(t)
    if (!r || !r.acknowledged) continue
    scores.push(r.comprehensionScore)
    for (const a of r.answers) {
      const cur = tally.get(a.questionId) ?? { wrong: 0, asked: 0 }
      cur.asked++
      if (!a.correct) cur.wrong++
      tally.set(a.questionId, cur)
    }
  }
  const policy = getPolicy(c.scope.objectIds[0])
  const prompts = new Map(policy ? questionsFor(policy).map((q) => [q.id, q.prompt]) : [])
  return {
    answered: scores.length,
    meanScore: scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0,
    weakest: [...tally.entries()]
      .map(([questionId, v]) => ({ questionId, prompt: prompts.get(questionId) ?? questionId, ...v }))
      .filter((q) => q.wrong > 0)
      .sort((a, b) => b.wrong - a.wrong),
  }
}

/** The exception a 'Cannot comply' declaration becomes on approval. Time-boxed
 *  like every other exception — 90 days to close the gap or renew. */
export function exceptionFromDeclaration(policy: Policy, detail: string): { reason: string; expiresOn: string; severity: 'High' | 'Medium' } {
  return {
    reason: `Declared unable to comply with ${policy.title} ${policy.version} at attestation — ${detail}`,
    expiresOn: new Date(NOW_MS + 90 * DAY).toISOString(),
    severity: 'Medium',
  }
}
