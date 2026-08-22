import { useApp } from '@/store'
import { WORLD, getObligation, getControl, getIssue, getIncident, getRegChange, getDsar, getAudit, getRisk } from '@/data'
import type { Obligation, Control, Issue, Incident, RegulatoryChange, Dsar, Audit, AuditFinding, Risk, WorkingPaper, Campaign, Vendor, WhistleblowerReport, FraudCase } from '@/types'

/**
 * The generalised merge-on-read layer (Epic 1.1), mirroring effectiveClause for
 * the Sources pipeline. A record's effective state is its seed merged with any
 * session override (overrides win). The seed is never mutated; reload resets all
 * overrides. Every mutable page reads through these so the cockpit and the detail
 * can never disagree. Rule: overrides change fields, never remove or re-key.
 */
export const effectiveObligation = (o: Obligation, ov?: Partial<Obligation>): Obligation => (ov ? { ...o, ...ov } : o)
export const effectiveControl = (c: Control, ov?: Partial<Control>): Control => (ov ? { ...c, ...ov } : c)
export const effectiveIssue = (i: Issue, ov?: Partial<Issue>): Issue => (ov ? { ...i, ...ov } : i)
export const effectiveIncident = (i: Incident, ov?: Partial<Incident>): Incident => (ov ? { ...i, ...ov } : i)
export const effectiveRegChange = (r: RegulatoryChange, ov?: Partial<RegulatoryChange>): RegulatoryChange => (ov ? { ...r, ...ov } : r)
export const effectiveDsar = (d: Dsar, ov?: Partial<Dsar>): Dsar => (ov ? { ...d, ...ov } : d)
export const effectiveRisk = (r: Risk, ov?: Partial<Risk>): Risk => (ov ? { ...r, ...ov } : r)

// ── Single-record hooks (replace getX(id) reads on mutable pages) ─────────────

export function useEffectiveObligation(id: string): Obligation | undefined {
  const ov = useApp((s) => s.obligationOverrides[id])
  const session = useApp((s) => s.sessionObligations.find((x) => x.id === id))
  const base = getObligation(id)
  return base ? effectiveObligation(base, ov) : session
}

export function useEffectiveControl(id: string): Control | undefined {
  const ov = useApp((s) => s.controlOverrides[id])
  const session = useApp((s) => s.getSessionControl(id))
  const base = getControl(id)
  return base ? effectiveControl(base, ov) : session
}

export function useEffectiveIssue(id: string): Issue | undefined {
  const ov = useApp((s) => s.issueOverrides[id])
  const session = useApp((s) => s.sessionIssues.find((i) => i.id === id))
  const base = getIssue(id)
  return base ? effectiveIssue(base, ov) : session ? effectiveIssue(session, ov) : undefined
}

export function useEffectiveIncident(id: string): Incident | undefined {
  const ov = useApp((s) => s.incidentOverrides[id])
  const base = getIncident(id)
  return base ? effectiveIncident(base, ov) : undefined
}

export function useEffectiveRegChange(id: string): RegulatoryChange | undefined {
  const ov = useApp((s) => s.regChangeOverrides[id])
  const session = useApp((s) => s.sessionRegChanges.find((r) => r.id === id))
  const base = getRegChange(id)
  return base ? effectiveRegChange(base, ov) : session ? effectiveRegChange(session, ov) : undefined
}

export function useEffectiveDsar(id: string): Dsar | undefined {
  const ov = useApp((s) => s.dsarOverrides[id])
  const base = getDsar(id)
  return base ? effectiveDsar(base, ov) : undefined
}

export function useEffectiveRisk(id: string): Risk | undefined {
  const ov = useApp((s) => s.riskOverrides[id])
  const base = getRisk(id)
  return base ? effectiveRisk(base, ov) : undefined
}

// ── List hooks (replace WORLD.x reads on mutable list pages) ──────────────────

export function useEffectiveObligations(): Obligation[] {
  const ov = useApp((s) => s.obligationOverrides)
  const session = useApp((s) => s.sessionObligations)
  return [...WORLD.obligations.map((o) => effectiveObligation(o, ov[o.id])), ...session]
}

export function useEffectiveControls(): Control[] {
  const ov = useApp((s) => s.controlOverrides)
  const session = useApp((s) => s.sessionControls)
  return [...WORLD.controls.map((c) => effectiveControl(c, ov[c.id])), ...session]
}

export function useEffectiveIssues(): Issue[] {
  const ov = useApp((s) => s.issueOverrides)
  const session = useApp((s) => s.sessionIssues)
  return [...session.map((i) => effectiveIssue(i, ov[i.id])), ...WORLD.issues.map((i) => effectiveIssue(i, ov[i.id]))]
}

export function useEffectiveIncidents(): Incident[] {
  const ov = useApp((s) => s.incidentOverrides)
  return WORLD.incidents.map((i) => effectiveIncident(i, ov[i.id]))
}

export function useEffectiveRegChanges(): RegulatoryChange[] {
  const ov = useApp((s) => s.regChangeOverrides)
  const session = useApp((s) => s.sessionRegChanges)
  return [...session.map((r) => effectiveRegChange(r, ov[r.id])), ...WORLD.regChanges.map((r) => effectiveRegChange(r, ov[r.id]))]
}

export function useEffectiveDsars(): Dsar[] {
  const ov = useApp((s) => s.dsarOverrides)
  return WORLD.dsars.map((d) => effectiveDsar(d, ov[d.id]))
}

export function useEffectiveRisks(): Risk[] {
  const ov = useApp((s) => s.riskOverrides)
  return WORLD.risks.map((r) => effectiveRisk(r, ov[r.id]))
}

// ── Audits: findings have no override map of their own — a finding's effective
// status is derived from its 1:1 remediation issue (Epic 3.3). Closing a finding
// resolves that issue, and the finding then reads Closed everywhere. This makes
// "the duty was done but never documented" structurally impossible (Req 12): the
// remediation record IS the documentation.

export function effectiveFinding(
  f: AuditFinding,
  issueOverrides: Record<string, Partial<Issue>>,
  sessionIssues: Issue[] = [],
): AuditFinding {
  if (f.status === 'Closed' || !f.linkedIssue) return f
  // A finding raised from a working paper this session points at a session
  // issue, which getIssue cannot see — so resolving it must still close the
  // finding, exactly as it does for a seeded one.
  const iss = getIssue(f.linkedIssue) ?? sessionIssues.find((i) => i.id === f.linkedIssue)
  const eff = iss ? effectiveIssue(iss, issueOverrides[iss.id]) : undefined
  return eff?.status === 'Resolved' ? { ...f, status: 'Closed' } : f
}

const withEffectiveFindings = (
  a: Audit,
  issueOverrides: Record<string, Partial<Issue>>,
  sessionFindings: Record<string, AuditFinding[]> = {},
  sessionIssues: Issue[] = [],
): Audit => ({
  ...a,
  // Findings raised this session from a failed working paper append to the
  // audit's own list, so the escalation shows on the record it belongs to.
  findings: [...a.findings, ...(sessionFindings[a.id] ?? [])].map((f) => effectiveFinding(f, issueOverrides, sessionIssues)),
})

export function useEffectiveAudit(id: string): Audit | undefined {
  const issueOverrides = useApp((s) => s.issueOverrides)
  const sessionFindings = useApp((s) => s.sessionFindings)
  const sessionIssues = useApp((s) => s.sessionIssues)
  const base = getAudit(id)
  return base ? withEffectiveFindings(base, issueOverrides, sessionFindings, sessionIssues) : undefined
}

export function useEffectiveAudits(): Audit[] {
  const issueOverrides = useApp((s) => s.issueOverrides)
  const sessionFindings = useApp((s) => s.sessionFindings)
  const sessionIssues = useApp((s) => s.sessionIssues)
  return WORLD.audits.map((a) => withEffectiveFindings(a, issueOverrides, sessionFindings, sessionIssues))
}

// ── Campaigns: seed + session-launched, both under the override layer ────────

export const effectiveCampaign = (c: Campaign, ov?: Partial<Campaign>): Campaign => (ov ? { ...c, ...ov } : c)

export function useEffectiveCampaigns(): Campaign[] {
  const ov = useApp((s) => s.campaignOverrides)
  const session = useApp((s) => s.sessionCampaigns)
  return [...session.map((c) => effectiveCampaign(c, ov[c.id])), ...WORLD.campaigns.map((c) => effectiveCampaign(c, ov[c.id]))]
}

export function useEffectiveCampaign(id: string): Campaign | undefined {
  const ov = useApp((s) => s.campaignOverrides[id])
  const session = useApp((s) => s.sessionCampaigns.find((c) => c.id === id))
  const base = WORLD.campaigns.find((c) => c.id === id) ?? session
  return base ? effectiveCampaign(base, ov) : undefined
}

// ── Vendors: seed merged with session re-ratings and exit decisions ──────────

export const effectiveVendor = (v: Vendor, ov?: Partial<Vendor>): Vendor => (ov ? { ...v, ...ov } : v)

export function useEffectiveVendors(): Vendor[] {
  const ov = useApp((s) => s.vendorOverrides)
  return WORLD.vendors.map((v) => effectiveVendor(v, ov[v.id]))
}

export function useEffectiveVendor(id: string): Vendor | undefined {
  const ov = useApp((s) => s.vendorOverrides[id])
  const base = WORLD.vendors.find((v) => v.id === id)
  return base ? effectiveVendor(base, ov) : undefined
}

// ── Speak-up and fraud: seed + session, both under the override layer ────────

export function useEffectiveReports(): WhistleblowerReport[] {
  const ov = useApp((s) => s.reportOverrides)
  const session = useApp((s) => s.sessionReports)
  const merge = (r: WhistleblowerReport) => (ov[r.id] ? { ...r, ...ov[r.id] } : r)
  return [...session.map(merge), ...WORLD.whistleblower.map(merge)]
}

export function useEffectiveReport(id: string): WhistleblowerReport | undefined {
  const ov = useApp((s) => s.reportOverrides[id])
  const session = useApp((s) => s.sessionReports.find((r) => r.id === id))
  const base = WORLD.whistleblower.find((r) => r.id === id) ?? session
  return base ? (ov ? { ...base, ...ov } : base) : undefined
}

export function useEffectiveFraudCases(): FraudCase[] {
  const ov = useApp((s) => s.fraudOverrides)
  const session = useApp((s) => s.sessionFraudCases)
  const merge = (c: FraudCase) => (ov[c.id] ? { ...c, ...ov[c.id] } : c)
  return [...session.map(merge), ...WORLD.fraudCases.map(merge)]
}

export function useEffectiveFraudCase(id: string): FraudCase | undefined {
  const ov = useApp((s) => s.fraudOverrides[id])
  const session = useApp((s) => s.sessionFraudCases.find((c) => c.id === id))
  const base = WORLD.fraudCases.find((c) => c.id === id) ?? session
  return base ? (ov ? { ...base, ...ov } : base) : undefined
}

// ── Working papers: seed merged with session amendments ──────────────────────

export const effectiveWorkingPaper = (p: WorkingPaper, ov?: Partial<WorkingPaper>): WorkingPaper => (ov ? { ...p, ...ov } : p)

export function useEffectiveWorkingPapers(auditId?: string): WorkingPaper[] {
  const ov = useApp((s) => s.paperOverrides)
  const rows = auditId ? WORLD.workingPapers.filter((p) => p.auditId === auditId) : WORLD.workingPapers
  return rows.map((p) => effectiveWorkingPaper(p, ov[p.id]))
}
