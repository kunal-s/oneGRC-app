// Board & committee reporting packs.
//
// A pack is a COMPOSITION, not a document: each section is a live query over the
// register, so the artefact a committee receives is the platform's current state
// rather than a spreadsheet someone assembled a fortnight earlier.
//
// Three things make a pack governance-grade rather than a print-out:
//   1. It names the basis it is produced under (Companies Act s.177 / s.134,
//      the PFRDA ICS guidelines, the committee's own charter).
//   2. Its narrative is maker-checked before issue — drafted by one person,
//      approved by another, exactly like a filing.
//   3. Issuing it files an Evidence item against the committee-meeting
//      obligation's TASK, so producing the pack discharges the duty to hold and
//      minute the meeting instead of being a side artefact.
//
// Sections whose module is not built yet are simply absent from the catalogue —
// a pack that prints an empty heading is worse than one that prints less.
import type { Audit, Control, Incident, Issue, Obligation, Risk } from '@/types'
import { NOW_MS } from '@/lib/time'
import { pct } from '@/lib/format'
import { appetiteRows, byExposure, DOMAIN_LABEL } from '@/lib/appetite'
import { exceptionState, exceptionSummary, exceptionsFrom } from '@/lib/exceptions'
import { inr, lossTotals, netLossTrend } from '@/lib/lossEvents'
import { actionProgress, deriveRiskStage } from '@/lib/riskWorkflow'
import { byBreachSeverity, currentBand, formatKriValue, kriSummary } from '@/lib/kri'
import { planProgress, quarterCoverage, unescalatedFailures } from '@/lib/auditPlan'
import { WORLD } from '@/data'
import { personName } from '@/data/people'

export type PackAudience = 'Board' | 'Risk Management Committee' | 'Audit Committee' | 'Management'
export type PackFormat = 'PDF' | 'Excel'
export type PackPeriod = 'Quarter' | 'Half-year' | 'Custom'

export interface PackContext {
  risks: Risk[]
  issues: Issue[]
  incidents: Incident[]
  obligations: Obligation[]
  controls: Control[]
  audits: Audit[]
}

export interface PackRow {
  label: string
  value: string
  detail?: string
  tone?: 'ok' | 'warn' | 'danger' | 'neutral'
  /** Record this row summarises, so a reader can walk from the pack to the source. */
  ref?: string
  route?: string
}

export interface PackSectionSpec {
  id: string
  heading: string
  /** Audiences that get this section ticked by default. */
  audiences: PackAudience[]
  /** Why the section is in the pack — the governing basis, where one exists. */
  basis?: string
  /** Controls this section provides evidence of operating. */
  evidences?: string[]
  build: (ctx: PackContext) => PackRow[]
}

// ── audience templates ───────────────────────────────────────────────────────
// Each audience names the committee it serves, the obligation the issued pack
// discharges, and the authority the meeting is held under. The Companies Act
// references are the operative ones for an unlisted public company of SPF's
// size; the SEBI LODR cadence is carried as best practice, not as a duty.

export interface PackTemplate {
  audience: PackAudience
  committeeShort?: string
  /** The recurring obligation the issued pack is filed against. */
  obligationTitle: string
  basis: string
  /** Short note on why the basis applies (or does not bind) — kept accurate. */
  basisNote: string
  filenameStem: string
}

export const PACK_TEMPLATES: PackTemplate[] = [
  {
    audience: 'Board',
    obligationTitle: 'Board meeting & minutes',
    basis: 'Companies Act 2013, s.134(3) — Board’s report',
    basisNote:
      'The Board’s report must disclose the Audit Committee’s composition and any recommendation of the committee the Board did not accept, with reasons. This pack is the board-meeting input behind that disclosure.',
    filenameStem: 'board-pack',
  },
  {
    audience: 'Audit Committee',
    committeeShort: 'Audit',
    obligationTitle: 'Audit committee meeting',
    basis: 'Companies Act 2013, s.177 — Audit Committee',
    basisNote:
      'SPF meets the s.177 thresholds (public company, borrowings and deposits above the prescribed limits), so an Audit Committee is constituted and reviews the financial reporting process and internal control systems. A quarterly cadence follows SEBI LODR Reg. 18(2)(a) as best practice; SPF is unlisted and is not bound by LODR.',
    filenameStem: 'audit-committee-pack',
  },
  {
    audience: 'Risk Management Committee',
    committeeShort: 'Risk',
    obligationTitle: 'Risk management committee meeting',
    basis: 'PFRDA Information & Cybersecurity Policy Guidelines 2024 · COSO ERM board reporting',
    basisNote:
      'PFRDA requires board-level oversight of the internal control and information-security posture for regulated entities. Composition follows the COSO ERM board-reporting pattern: exposure against appetite, the top residual risks with owners and mitigation progress, and losses actually incurred.',
    filenameStem: 'risk-committee-pack',
  },
  {
    audience: 'Management',
    obligationTitle: 'Board meeting & minutes',
    basis: 'Internal — management review',
    basisNote:
      'An internal operating review, not a statutory return. Produced on the same live data as the committee packs so management and the board are never reading different numbers.',
    filenameStem: 'management-pack',
  },
]

export const packTemplate = (a: PackAudience): PackTemplate => PACK_TEMPLATES.find((t) => t.audience === a) ?? PACK_TEMPLATES[0]

// ── section catalogue ────────────────────────────────────────────────────────

const band = (n: number, warn: number, danger: number): PackRow['tone'] => (n >= danger ? 'danger' : n >= warn ? 'warn' : 'ok')

export const PACK_SECTIONS: PackSectionSpec[] = [
  {
    id: 'appetite',
    heading: 'Risk appetite by domain',
    audiences: ['Board', 'Risk Management Committee'],
    basis: 'Board-approved appetite statements and tolerance bands',
    evidences: ['CTRL-PFRDA-ICS-ICS-64'],
    build: (ctx) =>
      byExposure(appetiteRows(ctx.risks)).map((r) => ({
        label: DOMAIN_LABEL(r.domain),
        value: `${r.currentAggregate} / ${r.toleranceBand.green} tolerated`,
        detail: `${r.status} · ${r.riskCount} risks · QoQ ${r.qoqDelta > 0 ? `+${r.qoqDelta}` : r.qoqDelta}`,
        tone: r.status === 'Outside appetite' ? 'danger' : r.status === 'At tolerance' ? 'warn' : 'ok',
        route: `/risks?domain=${r.domain}`,
      })),
  },
  {
    id: 'top-risks',
    heading: 'Top residual risks with owner and mitigation progress',
    audiences: ['Board', 'Risk Management Committee'],
    basis: 'COSO ERM — portfolio view of risk',
    evidences: ['CTRL-PFRDA-ICS-ICS-58'],
    build: (ctx) =>
      [...ctx.risks]
        .sort((a, b) => b.residual - a.residual)
        .slice(0, 10)
        .map((r) => {
          const p = actionProgress(r)
          return {
            label: r.title,
            value: `Residual ${r.residual}/25`,
            detail: `${personName(r.owner)} · ${deriveRiskStage(r)} · ${p.total ? `${p.done}/${p.total} actions closed` : 'no remediation plan'}`,
            tone: r.residual >= 15 ? 'danger' : r.residual >= 10 ? 'warn' : 'neutral',
            ref: r.id,
            route: `/risks/${r.id}`,
          }
        }),
  },
  {
    id: 'kri-breaches',
    heading: 'Key risk indicators in breach',
    audiences: ['Board', 'Risk Management Committee', 'Management'],
    basis: 'Leading indicators against board-set thresholds',
    evidences: ['CTRL-PFRDA-ICS-ICS-58'],
    build: () => {
      const s = kriSummary()
      const rows: PackRow[] = [
        { label: 'Indicators in breach', value: `${s.breached} of ${s.total}`, detail: `${s.red} red · ${s.amber} amber`, tone: s.red ? 'danger' : s.breached ? 'warn' : 'ok' },
        { label: 'Moving the wrong way', value: String(s.worsening), detail: 'worsening against the previous reading', tone: s.worsening ? 'warn' : 'ok' },
      ]
      for (const k of byBreachSeverity(WORLD.kris).filter((x) => currentBand(x) !== 'Green').slice(0, 8)) {
        rows.push({
          label: k.name,
          value: formatKriValue(k),
          detail: `${currentBand(k)} · ${personName(k.owner)} · ${k.metricSource} · ${k.frequency}`,
          tone: currentBand(k) === 'Red' ? 'danger' : 'warn',
          ref: k.id,
          route: `/risks/${k.riskId}?tab=kris`,
        })
      }
      return rows
    },
  },
  {
    id: 'net-loss',
    heading: 'Operational-risk loss events',
    audiences: ['Board', 'Risk Management Committee'],
    basis: 'Operational-risk event taxonomy — gross, recovery and net',
    build: (ctx) => {
      const t = lossTotals(ctx.incidents, 365)
      const trend = netLossTrend(ctx.incidents)
      return [
        { label: 'Net loss, trailing 12 months', value: inr(t.net), detail: `${t.count} recognised loss events`, tone: 'danger' },
        { label: 'Gross loss', value: inr(t.gross), detail: `less ${inr(t.recovery)} recovered`, tone: 'neutral' },
        ...trend.map((p) => ({ label: p.period, value: inr(p.net), tone: 'neutral' as const })),
      ]
    },
  },
  {
    id: 'incidents',
    heading: 'Open incidents and regulator-clock status',
    audiences: ['Board', 'Risk Management Committee', 'Management'],
    basis: 'PFRDA ICS incident taxonomy · CERT-In Direction 20(3)/2022',
    evidences: ['CTRL-PFRDA-ICS-ICS-01'],
    build: (ctx) => {
      const open = ctx.incidents.filter((i) => i.status !== 'Closed')
      const rows: PackRow[] = [
        { label: 'Open incidents', value: String(open.length), detail: `${open.filter((i) => i.classification === 'Critical').length} Critical`, tone: band(open.filter((i) => i.classification === 'Critical').length, 1, 1) },
      ]
      for (const i of open.slice(0, 6)) {
        const atRisk = i.regulatorTracks.filter((t) => t.status === 'At risk' || t.status === 'Breached')
        rows.push({
          label: i.title,
          value: i.classification,
          detail: i.regulatorTracks.length
            ? `${i.regulatorTracks.length} regulator tracks${atRisk.length ? ` · ${atRisk.length} at risk` : ' · all on track'}`
            : 'below reporting thresholds',
          tone: atRisk.length ? 'danger' : i.classification === 'Critical' ? 'warn' : 'neutral',
          ref: i.id,
          route: `/incidents/${i.id}`,
        })
      }
      return rows
    },
  },
  {
    id: 'audit-plan',
    heading: 'Audit plan versus actual',
    audiences: ['Audit Committee'],
    basis: 'Annual risk-based plan · PFRDA and CERT-In audit cadence',
    evidences: ['CTRL-COMP-CA-01'],
    build: () => {
      const p = planProgress()
      const rows: PackRow[] = [
        { label: 'Plan delivered', value: `${p.deliveredPct}%`, detail: `${p.complete} complete of ${p.complete + p.inProgress + p.deferred} started`, tone: p.deliveredPct >= 75 ? 'ok' : 'warn' },
        { label: 'Deferred from plan', value: String(p.deferred), tone: p.deferred ? 'danger' : 'ok' },
        { label: 'High-priority entities outstanding', value: String(p.highPriorityOpen), tone: p.highPriorityOpen ? 'warn' : 'ok' },
        { label: 'Never audited', value: String(p.neverAudited), detail: 'auditable entities with no prior coverage', tone: p.neverAudited ? 'warn' : 'ok' },
      ]
      for (const q of quarterCoverage()) {
        rows.push({ label: `${q.quarter} coverage`, value: `${q.complete}/${q.total}`, detail: `${q.inProgress} in progress · ${q.deferred} deferred`, tone: q.deferred ? 'warn' : 'neutral' })
      }
      const open = unescalatedFailures()
      if (open.length) {
        rows.push({ label: 'Failed test steps with no finding raised', value: String(open.length), detail: 'escalation gap in the working papers', tone: 'danger' })
      }
      return rows
    },
  },
  {
    id: 'findings-ageing',
    heading: 'Open audit findings by ageing band',
    audiences: ['Audit Committee', 'Board'],
    basis: 'Companies Act 2013, s.177(4) — review of internal control systems',
    evidences: ['CTRL-COMP-CA-01'],
    build: (ctx) => {
      const open = ctx.issues.filter((i) => i.source === 'Audit finding' && i.status !== 'Resolved')
      const inBand = (lo: number, hi?: number) => open.filter((i) => i.ageDays >= lo && (hi === undefined || i.ageDays < hi)).length
      return [
        { label: '0–30 days', value: String(inBand(0, 31)), tone: 'ok' },
        { label: '31–60 days', value: String(inBand(31, 61)), tone: 'neutral' },
        { label: '61–90 days', value: String(inBand(61, 91)), tone: 'warn' },
        { label: '90+ days', value: String(inBand(91)), tone: 'danger', detail: 'beyond the committee’s tolerance for open findings' },
      ]
    },
  },
  {
    id: 'issue-closure',
    heading: 'Issue closure rate and overdue remediation',
    audiences: ['Audit Committee', 'Management'],
    basis: 'Companies Act 2013, s.177(4) — review of internal control systems',
    build: (ctx) => {
      const all = ctx.issues.filter((i) => i.source !== 'Exception')
      const resolved = all.filter((i) => i.status === 'Resolved').length
      const overdue = all.filter((i) => i.status === 'Overdue').sort((a, b) => b.ageDays - a.ageDays)
      const rate = all.length ? Math.round((resolved / all.length) * 1000) / 10 : 0
      return [
        { label: 'Closure rate', value: `${rate}%`, detail: `${resolved} of ${all.length} remediation issues closed`, tone: rate >= 60 ? 'ok' : 'warn' },
        { label: 'Overdue remediation', value: String(overdue.length), detail: 'past the agreed due date', tone: overdue.length ? 'danger' : 'ok' },
        ...overdue.slice(0, 5).map((i) => ({
          label: i.title,
          value: `${i.ageDays}d old`,
          detail: personName(i.owner),
          tone: 'danger' as const,
          ref: i.id,
          route: `/issues/${i.id}`,
        })),
      ]
    },
  },
  {
    id: 'exceptions',
    heading: 'Exception register',
    audiences: ['Audit Committee', 'Board'],
    basis: 'Approved deviations with a compensating control and a bounded expiry',
    build: (ctx) => {
      const s = exceptionSummary(ctx.issues)
      const list = exceptionsFrom(ctx.issues)
        .filter((i) => exceptionState(i) === 'Expired' || exceptionState(i) === 'Expiring soon')
        .sort((a, b) => new Date(a.exception!.expiresOn).getTime() - new Date(b.exception!.expiresOn).getTime())
      return [
        { label: 'Live exceptions', value: String(s.active + s.expiringSoon), detail: `${s.awaitingApproval} awaiting approval`, tone: 'neutral' },
        { label: 'Expiring within 7 days', value: String(s.expiringSoon), tone: s.expiringSoon ? 'warn' : 'ok' },
        { label: 'Lapsed without renewal', value: String(s.expired), tone: s.expired ? 'danger' : 'ok' },
        { label: 'Total renewals granted', value: String(s.renewals), detail: 'repeat renewal is the pattern to challenge', tone: s.renewals > 4 ? 'warn' : 'neutral' },
        ...list.slice(0, 5).map((i) => ({
          label: `${i.sourceRef} — ${i.exception!.reason.slice(0, 70)}…`,
          value: exceptionState(i) ?? '',
          detail: `expires ${i.exception!.expiresOn.slice(0, 10)} · approved by ${personName(i.exception!.approvedBy)}`,
          tone: (exceptionState(i) === 'Expired' ? 'danger' : 'warn') as PackRow['tone'],
          ref: i.id,
          route: `/issues/${i.id}`,
        })),
      ]
    },
  },
  {
    id: 'external-auditor',
    heading: 'External auditor status',
    audiences: ['Audit Committee'],
    basis: 'Companies Act 2013, s.177(4) — auditor independence and audit effectiveness',
    build: (ctx) =>
      ctx.audits
        .filter((a) => a.type !== 'Internal')
        .slice(0, 6)
        .map((a) => ({
          label: a.title,
          value: a.status,
          detail: `${a.auditor} · ${a.findings.filter((f) => f.status !== 'Closed').length} findings open · ${a.period}`,
          tone: a.findings.some((f) => f.status !== 'Closed' && f.severity === 'Critical') ? 'danger' : 'neutral',
          ref: a.id,
          route: `/audits/${a.id}`,
        })),
  },
  {
    id: 'obligations',
    heading: 'Statutory obligations — on-time performance',
    audiences: ['Management', 'Board'],
    basis: 'PFRDA, CERT-In, DPDP, GST, Labour and Companies Act filing calendar',
    evidences: ['CTRL-COMP-CA-01'],
    build: (ctx) => {
      const total = ctx.obligations.length
      const overdue = ctx.obligations.filter((o) => o.status === 'Overdue')
      const filed = ctx.obligations.filter((o) => o.status === 'Filed').length
      const dueSoon = ctx.obligations.filter((o) => o.status === 'Due' && new Date(o.dueDate).getTime() - NOW_MS < 30 * 86400000).length
      return [
        { label: 'Obligations tracked', value: String(total), tone: 'neutral' },
        { label: 'Filed', value: `${filed} (${pct((filed / Math.max(1, total)) * 100)})`, tone: 'ok' },
        { label: 'Overdue', value: String(overdue.length), tone: overdue.length ? 'danger' : 'ok' },
        { label: 'Due within 30 days', value: String(dueSoon), tone: dueSoon ? 'warn' : 'ok' },
        ...overdue.slice(0, 5).map((o) => ({
          label: o.title,
          value: o.regulator,
          detail: `due ${o.dueDate.slice(0, 10)} · ${personName(o.owner)}`,
          tone: 'danger' as const,
          ref: o.id,
          route: `/obligations/${o.id}`,
        })),
      ]
    },
  },
  {
    id: 'control-coverage',
    heading: 'Control coverage and testing',
    audiences: ['Management', 'Board', 'Audit Committee'],
    basis: 'ISO/IEC 27001:2022 · NIST CSF 2.0 · PCI DSS 4.0 · PFRDA ICS 2024',
    evidences: ['CTRL-PFRDA-ICS-ICS-58'],
    build: (ctx) => {
      const total = ctx.controls.length
      const failing = ctx.controls.filter((c) => c.result === 'Fail')
      const partial = ctx.controls.filter((c) => c.result === 'Partial').length
      const ccm = ctx.controls.filter((c) => c.automation === 'CCM').length
      const covered = total - failing.length
      return [
        { label: 'Controls in the library', value: String(total), detail: `${ccm} continuously monitored`, tone: 'neutral' },
        { label: 'Coverage (pass or partial)', value: pct((covered / Math.max(1, total)) * 100), tone: 'ok' },
        { label: 'Failing controls', value: String(failing.length), detail: `${partial} partially effective`, tone: failing.length ? 'danger' : 'ok' },
        ...failing.slice(0, 5).map((c) => ({
          label: c.title,
          value: 'Fail',
          detail: `${personName(c.owner)} · last tested ${c.lastTested.slice(0, 10)}`,
          tone: 'danger' as const,
          ref: c.id,
          route: `/controls/${c.id}`,
        })),
      ]
    },
  },
  {
    id: 'dpdp',
    heading: 'DPDP posture',
    audiences: ['Management'],
    basis: 'DPDP Act 2023 / DPDP Rules 2025',
    build: (ctx) => {
      const dpdpObl = ctx.obligations.filter((o) => o.regulator === 'DPDP')
      return [
        { label: 'DPDP obligations tracked', value: String(dpdpObl.length), tone: 'neutral' },
        { label: 'Overdue', value: String(dpdpObl.filter((o) => o.status === 'Overdue').length), tone: dpdpObl.some((o) => o.status === 'Overdue') ? 'danger' : 'ok' },
        {
          label: 'Incidents involving personal data',
          value: String(ctx.incidents.filter((i) => i.personalDataInvolved && i.status !== 'Closed').length),
          detail: 'open, with a DPDP Board intimation track',
          tone: 'warn',
        },
      ]
    },
  },
]

export const sectionsForAudience = (a: PackAudience) => PACK_SECTIONS.filter((s) => s.audiences.includes(a))

// ── composition ──────────────────────────────────────────────────────────────

export interface ComposedSection {
  id: string
  heading: string
  basis?: string
  rows: PackRow[]
  evidences: string[]
}

export interface ComposedPack {
  audience: PackAudience
  period: string
  template: PackTemplate
  sections: ComposedSection[]
  /** Controls the pack, taken as a whole, evidences the operation of. */
  evidencedControls: string[]
}

export function composePack(audience: PackAudience, period: string, sectionIds: string[], ctx: PackContext): ComposedPack {
  const sections = PACK_SECTIONS.filter((s) => sectionIds.includes(s.id)).map((s) => ({
    id: s.id,
    heading: s.heading,
    basis: s.basis,
    rows: s.build(ctx),
    evidences: s.evidences ?? [],
  }))
  return {
    audience,
    period,
    template: packTemplate(audience),
    sections,
    evidencedControls: Array.from(new Set(sections.flatMap((s) => s.evidences))),
  }
}

/**
 * A deterministic narrative drafted from the composed pack. Scripted, not a
 * model call — and it is a DRAFT: the maker-checker gate below is what allows it
 * to be issued, matching the platform's standing rule that nothing an assistant
 * writes takes effect until a person approves it.
 */
export function draftNarrative(pack: ComposedPack, ctx: PackContext): string {
  const parts: string[] = []
  const appetite = byExposure(appetiteRows(ctx.risks))
  const outside = appetite.filter((r) => r.status === 'Outside appetite')
  const losses = lossTotals(ctx.incidents, 365)
  const openInc = ctx.incidents.filter((i) => i.status !== 'Closed')
  const overdueObl = ctx.obligations.filter((o) => o.status === 'Overdue').length
  const failing = ctx.controls.filter((c) => c.result === 'Fail').length
  const ex = exceptionSummary(ctx.issues)
  const openFindings = ctx.issues.filter((i) => i.source === 'Audit finding' && i.status !== 'Resolved')

  if (pack.audience === 'Audit Committee') {
    parts.push(
      `${openFindings.length} audit findings remain open, of which ${openFindings.filter((i) => i.ageDays >= 91).length} have been open beyond 90 days.`,
    )
    parts.push(
      `The exception register carries ${ex.active + ex.expiringSoon} live deviations${ex.expired ? `, and ${ex.expired} has lapsed without renewal or closure` : ''}${ex.renewals > 4 ? `; ${ex.renewals} renewals have been granted in total, which the committee may wish to challenge` : ''}.`,
    )
    parts.push(`${failing} controls are currently failing and are tracked to remediation through the issues register.`)
    const plan = planProgress()
    parts.push(
      `${plan.deliveredPct}% of the annual audit plan has been delivered${plan.deferred ? `, with ${plan.deferred} ${plan.deferred === 1 ? 'entity' : 'entities'} deferred` : ''}.`,
    )
  } else if (pack.audience === 'Management') {
    parts.push(`${overdueObl} statutory obligations are overdue and ${failing} controls are failing.`)
    parts.push(`${openInc.length} incidents are open, ${openInc.filter((i) => i.classification === 'Critical').length} of them Critical.`)
  } else {
    parts.push(
      outside.length
        ? `${outside.map((r) => DOMAIN_LABEL(r.domain)).join(' and ')} ${outside.length === 1 ? 'sits' : 'sit'} outside board-approved appetite; every other domain is within tolerance or better.`
        : 'Every risk domain is currently within board-approved appetite.',
    )
    parts.push(
      `Recognised operational-risk losses total ${inr(losses.net)} net over the trailing twelve months across ${losses.count} events.`,
    )
    parts.push(
      `${openInc.length} incidents are open${openInc.some((i) => i.regulatorTracks.some((t) => t.status === 'At risk')) ? ', with at least one regulator clock flagged at risk' : ' and all regulator clocks are on track'}.`,
    )
    const k = kriSummary()
    parts.push(
      `${k.breached} of ${k.total} key risk indicators sit outside their board-set threshold (${k.red} red), and ${k.worsening} are moving the wrong way.`,
    )
  }
  parts.push('Figures are drawn from the live register at the timestamp on the cover page and drill through to the underlying records.')
  return parts.join(' ')
}
