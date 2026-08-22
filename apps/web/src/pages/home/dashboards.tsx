import * as React from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ShieldAlert, Gauge, Layers, CalendarX2, CalendarClock, Scale, BadgeCheck, Library,
  Activity, ClipboardCheck, Wrench, Users, Plug, ShieldCheck, ArrowUpRight, Inbox, FileSearch,
  FileWarning, IndianRupee, FileText, Megaphone, Building2,
} from 'lucide-react'
import { RoleDashboard, DashboardCard, StatGroup, ReportMenu, reportsForPersona, type Stat } from '@/components/kit'
import { MyComplianceCalendarCard } from '@/components/MyComplianceCalendar'
import { SeverityBadge } from '@/components/SeverityBadge'
import { StatusChip } from '@/components/StatusChip'
import { Avatar } from '@/components/Avatar'
import { RegulatorChip } from '@/lib/regulators'
import { HeatMap } from './HeatMap'
import { AppetitePanel } from './AppetitePanel'
import { PackGenerator } from '@/components/packs/PackGenerator'
import { Button } from '@/components/ui/Button'
import { ScoreBadge } from '@/components/RiskScore'
import { cn } from '@/lib/utils'
import { COMMITTEES, committeeDates } from '@/data/committees'
import { appetiteRows, appetiteSummary, byExposure } from '@/lib/appetite'
import { exceptionState, exceptionSummary, exceptionsFrom } from '@/lib/exceptions'
import { inr, lossTotals, netLossTrend } from '@/lib/lossEvents'
import { acceptanceState, actionProgress, deriveRiskStage, isAboveTarget, stageTone } from '@/lib/riskWorkflow'
import { byBreachSeverity, currentBand, formatKriValue, kriSummary } from '@/lib/kri'
import { planProgress, quarterCoverage, unescalatedFailures } from '@/lib/auditPlan'
import { Sparkline } from '@/components/Sparkline'
import { useApp } from '@/store'
import { WORLD, SOURCES, getInstrument, getRisk } from '@/data'
import { PEOPLE_BY_ID, ROLES } from '@/data/people'
import { useEffectiveObligations, useEffectiveControls, useEffectiveIssues, useEffectiveAudits, useEffectiveRisks, useEffectiveIncidents, useEffectiveCampaigns, useEffectiveVendors, useEffectiveReports, useEffectiveFraudCases } from '@/lib/effective'
import { riskQueueItems } from '@/lib/riskWorkflow'
import { kriQueueItems } from '@/lib/kri'
import { vendorQueueItems } from '@/lib/vendors'
import { wbQueueItems } from '@/lib/whistleblower'
import { fraudQueueItems } from '@/lib/fraud'
import { campaignQueueItems, campaignProgress } from '@/lib/campaigns'
import { rcsaCoverage } from '@/lib/rcsa'
import { tprmSummary } from '@/lib/vendors'
import { attestationEstate } from '@/lib/attestation'
import { useEffectiveMetrics } from '@/lib/metrics'
import { effectiveClause, awaitingDecision } from '@/lib/sources'
import { pct } from '@/lib/format'
import { fmtRelative, fmtDate, NOW_MS } from '@/lib/time'
import type { KRI, QueueTask, RoleKey } from '@/types'

// ── shared bits ───────────────────────────────────────────────────────────────

function usePersona() {
  const role = useApp((s) => s.role)
  const selfId = useApp((s) => s.personId)
  const label = ROLES.find((r) => r.key === role)?.label ?? 'OneGRC'
  const person = PEOPLE_BY_ID[selfId]
  const first = person?.name.split(' ')[0] ?? ''
  return { role, selfId, label, person, first }
}

function useMyTasks(role: RoleKey): QueueTask[] {
  const risks = useEffectiveRisks()
  const campaigns = useEffectiveCampaigns()
  const selfId = useApp((s) => s.personId)
  const vendors = useEffectiveVendors()
  const reports = useEffectiveReports()
  const fraudCases = useEffectiveFraudCases()
  return React.useMemo(
    () =>
      [...WORLD.queue.filter((q) => q.role === role), ...riskQueueItems(role, risks), ...kriQueueItems(role), ...campaignQueueItems(role, campaigns), ...vendorQueueItems(role, vendors), ...wbQueueItems(role, selfId, reports), ...fraudQueueItems(role, selfId, fraudCases)].sort(
        (a, b) => new Date(a.due).getTime() - new Date(b.due).getTime(),
      ),
    [role, selfId, risks, campaigns, vendors, reports, fraudCases],
  )
}

function Row({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="group flex w-full items-center gap-2.5 px-3.5 py-2 text-left transition-colors hover:bg-info-soft/30"
    >
      {children}
      <ArrowUpRight className="ml-auto size-3.5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
    </button>
  )
}

function TaskList({ tasks, limit = 6 }: { tasks: QueueTask[]; limit?: number }) {
  const navigate = useNavigate()
  const rows = tasks.slice(0, limit)
  if (rows.length === 0) {
    return (
      <div className="flex items-center gap-2 px-3.5 py-6 text-sm text-muted-foreground">
        <Inbox className="size-4" /> Nothing in your queue right now.
      </div>
    )
  }
  return (
    <div className="-mx-3.5 -mb-3.5 divide-y divide-border/70">
      {rows.map((t) => {
        const overdue = new Date(t.due).getTime() < NOW_MS
        return (
          <Row key={t.id} onClick={() => navigate(t.route)}>
            <div className="min-w-0 flex-1">
              <div className="truncate text-xs font-medium text-foreground">{t.title}</div>
              <div className="mt-0.5 flex items-center gap-1.5 text-2xs text-muted-foreground">
                <span className="font-mono font-semibold text-info">{t.ref}</span>
                <span>·</span>
                <span className={overdue ? 'font-medium text-critical' : ''}>{overdue ? 'Overdue' : 'Due'} {fmtRelative(t.due)}</span>
              </div>
            </div>
            <SeverityBadge severity={t.priority} dense />
          </Row>
        )
      })}
    </div>
  )
}

function MyWorkCard({ role }: { role: RoleKey }) {
  const tasks = useMyTasks(role)
  return (
    <DashboardCard title="My work" icon={<Inbox className="size-4 text-info" />} to="/queue" action={<span className="text-2xs text-muted-foreground tnum">{tasks.length} open</span>}>
      <TaskList tasks={tasks} />
    </DashboardCard>
  )
}

// ── Risk Manager ──────────────────────────────────────────────────────────────

export function RiskManagerDashboard() {
  const navigate = useNavigate()
  const { label, first } = usePersona()
  const M = useEffectiveMetrics()
  const risks = WORLD.risks
  const topResidual = [...risks].sort((a, b) => b.residual - a.residual).slice(0, 6)
  const highCount = risks.filter((r) => r.residual >= 15).length
  const noControl = risks.filter((r) => !r.linkedControls?.length).length
  const tprm = tprmSummary(useEffectiveVendors())

  const stats: Stat[] = [
    { label: 'Enterprise risk', value: M.enterpriseRisk.toFixed(1), sub: '/10 board-weighted', tone: 'warn', icon: <Gauge className="size-3.5" />, onClick: () => navigate('/risks') },
    { label: 'High residual', value: highCount, sub: 'residual 15+', tone: 'danger', icon: <ShieldAlert className="size-3.5" />, onClick: () => navigate('/risks') },
    { label: 'Without a control', value: noControl, sub: 'coverage gap', tone: noControl ? 'warn' : 'ok', icon: <Layers className="size-3.5" />, onClick: () => navigate('/risks') },
    { label: 'Open incidents', value: M.openIncidents, sub: `${M.criticalOpen} critical`, tone: 'danger', icon: <ShieldAlert className="size-3.5" />, onClick: () => navigate('/incidents') },
    { label: 'Material outsourcing', value: `${tprm.materialCoveragePct}%`, sub: `${tprm.materialInGoodOrder} of ${tprm.material} in good order`, tone: tprm.materialCoveragePct === 100 ? 'ok' : 'warn', icon: <Building2 className="size-3.5" />, onClick: () => navigate('/vendors') },
    { label: 'Third-party gaps', value: tprm.assuranceLapsed + tprm.diligenceOverdue, sub: `${tprm.assuranceLapsed} assurance · ${tprm.diligenceOverdue} diligence`, tone: tprm.assuranceLapsed + tprm.diligenceOverdue ? 'danger' : 'ok', icon: <Building2 className="size-3.5" />, onClick: () => navigate('/vendors?attention=Assurance+lapsed') },
  ]

  return (
    <RoleDashboard
      eyebrow={`Risk Manager · ${label}`}
      title={`Risk posture, ${first}`}
      description="The enterprise risk register, heat map and treatment plans."
      actions={<ReportMenu templates={reportsForPersona('RISK')} />}
      summary={<StatGroup stats={stats} />}
    >
      <MyComplianceCalendarCard className="lg:col-span-2" />
      <div className="lg:col-span-2"><HeatMap /></div>
      <DashboardCard title="Top residual risks" icon={<ShieldAlert className="size-4 text-critical" />} to="/risks">
        <div className="-mx-3.5 -mb-3.5 divide-y divide-border/70">
          {topResidual.map((r) => (
            <Row key={r.id} onClick={() => navigate(`/risks/${r.id}`)}>
              <span className="font-mono text-2xs font-semibold text-info">{r.id}</span>
              <span className="min-w-0 flex-1 truncate text-xs text-foreground">{r.title}</span>
              <span className="rounded bg-muted px-1.5 py-0 text-2xs text-muted-foreground">{r.domain}</span>
              <span className="tnum text-2xs font-semibold text-critical">{r.residual}</span>
            </Row>
          ))}
        </div>
      </DashboardCard>
      <KriBreachCard />
      <MyWorkCard role="RISK" />
    </RoleDashboard>
  )
}

// ── Compliance Manager ────────────────────────────────────────────────────────

function pendingClauseDecisions(overrides: ReturnType<typeof useApp.getState>['clauseOverrides']) {
  return SOURCES.filter((p) => p.status && p.applicable !== false && awaitingDecision(effectiveClause(p, overrides).status)).slice(0, 30)
}

export function ComplianceManagerDashboard() {
  const navigate = useNavigate()
  const { label, first } = usePersona()
  const M = useEffectiveMetrics()
  const overrides = useApp((s) => s.clauseOverrides)
  const obligations = useEffectiveObligations()
  const tasks = useMyTasks('CCO')
  const approvals = tasks.filter((t) => t.kind === 'Approval')
  const pending = pendingClauseDecisions(overrides)
  const estate = attestationEstate(WORLD.policies, useEffectiveCampaigns())
  const dueSoon = [...obligations]
    .filter((o) => o.status === 'Due' || o.status === 'Overdue')
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
    .slice(0, 6)

  const stats: Stat[] = [
    { label: 'Overdue', value: M.overdueObligations, sub: 'obligations', tone: 'danger', icon: <CalendarX2 className="size-3.5" />, onClick: () => navigate('/obligations') },
    { label: 'Due soon', value: M.dueSoonObligations, sub: 'this cycle', tone: 'warn', icon: <CalendarClock className="size-3.5" />, onClick: () => navigate('/obligations') },
    { label: 'Clause decisions', value: pending.length, sub: 'awaiting you', tone: 'info', icon: <Scale className="size-3.5" />, onClick: () => navigate('/sources') },
    { label: 'Approvals', value: approvals.length, sub: 'in your queue', tone: 'warn', icon: <BadgeCheck className="size-3.5" />, onClick: () => navigate('/queue') },
    { label: 'Policies attested', value: `${estate.coveragePct}%`, sub: estate.superseded ? `${estate.superseded} superseded by a new version` : `${estate.outstanding} acknowledgements outstanding`, tone: estate.superseded || estate.outstanding ? 'warn' : 'ok', icon: <BadgeCheck className="size-3.5" />, onClick: () => navigate('/policies') },
  ]

  return (
    <RoleDashboard
      eyebrow={`Compliance Manager · ${label}`}
      title={`Compliance coverage, ${first}`}
      description="The obligation register, the source-to-action pipeline and the approvals routed to you."
      actions={<ReportMenu templates={reportsForPersona('CCO')} />}
      summary={<StatGroup stats={stats} />}
    >
      <MyComplianceCalendarCard className="lg:col-span-2" />
      <DashboardCard title="Clause decisions pending" icon={<Scale className="size-4 text-info" />} to="/sources" action={<span className="text-2xs text-muted-foreground tnum">{pending.length}</span>}>
        <div className="-mx-3.5 -mb-3.5 divide-y divide-border/70">
          {pending.slice(0, 6).map((p) => {
            const inst = getInstrument(p.instrumentId)
            return (
              <Row key={p.id} onClick={() => navigate(`/sources/section/${p.id}`)}>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-xs font-medium text-foreground">{p.nameOfCompliance ?? p.title}</span>
                  <span className="block truncate text-2xs text-muted-foreground">{inst?.authority} · {p.provision}</span>
                </span>
                {p.severity && <SeverityBadge severity={p.severity} dense />}
              </Row>
            )
          })}
        </div>
      </DashboardCard>
      <DashboardCard title="Filing calendar" icon={<CalendarClock className="size-4 text-medium" />} to="/obligations">
        <div className="-mx-3.5 -mb-3.5 divide-y divide-border/70">
          {dueSoon.map((o) => {
            const overdue = o.status === 'Overdue'
            return (
              <Row key={o.id} onClick={() => navigate(`/obligations/${o.id}`)}>
                <RegulatorChip regulator={o.regulator} />
                <span className="min-w-0 flex-1 truncate text-xs text-foreground">{o.title}</span>
                <span className={`tnum text-2xs ${overdue ? 'font-medium text-critical' : 'text-muted-foreground'}`}>{fmtDate(o.dueDate)}</span>
              </Row>
            )
          })}
        </div>
      </DashboardCard>
      <MyWorkCard role="CCO" />
      <DashboardCard title="Approvals waiting" icon={<BadgeCheck className="size-4 text-ok" />} to="/queue" action={<span className="text-2xs text-muted-foreground tnum">{approvals.length}</span>}>
        <TaskList tasks={approvals} />
      </DashboardCard>
    </RoleDashboard>
  )
}

// ── Compliance Analyst ────────────────────────────────────────────────────────

export function ComplianceAnalystDashboard() {
  const navigate = useNavigate()
  const { label, first } = usePersona()
  const overrides = useApp((s) => s.clauseOverrides)
  const tasks = useMyTasks('ANALYST')
  const overdue = tasks.filter((t) => new Date(t.due).getTime() < NOW_MS)
  const evidence = tasks.filter((t) => t.kind === 'Evidence request')
  const pending = pendingClauseDecisions(overrides)

  const stats: Stat[] = [
    { label: 'My tasks', value: tasks.length, sub: 'assigned to me', tone: 'neutral', icon: <Inbox className="size-3.5" />, onClick: () => navigate('/queue') },
    { label: 'Overdue', value: overdue.length, sub: 'past due', tone: overdue.length ? 'danger' : 'ok', icon: <CalendarX2 className="size-3.5" />, onClick: () => navigate('/queue') },
    { label: 'Evidence to attach', value: evidence.length, sub: 'requests', tone: 'warn', icon: <FileSearch className="size-3.5" />, onClick: () => navigate('/evidence') },
    { label: 'Clauses to work', value: pending.length, sub: 'in the pipeline', tone: 'info', icon: <Scale className="size-3.5" />, onClick: () => navigate('/sources') },
  ]

  return (
    <RoleDashboard
      eyebrow={`Compliance Analyst · ${label}`}
      title={`Your filings, ${first}`}
      description="The filings and evidence that are yours to complete this cycle, and the clause-pipeline work waiting on you."
      actions={<ReportMenu templates={reportsForPersona('ANALYST')} />}
      summary={<StatGroup stats={stats} />}
    >
      <MyComplianceCalendarCard className="lg:col-span-2" />
      <DashboardCard title="My filings & tasks" icon={<Inbox className="size-4 text-info" />} to="/queue" action={<span className="text-2xs text-muted-foreground tnum">{tasks.length}</span>}>
        <TaskList tasks={tasks} limit={8} />
      </DashboardCard>
      <DashboardCard title="Clause-pipeline work" icon={<Scale className="size-4 text-info" />} to="/sources">
        <div className="-mx-3.5 -mb-3.5 divide-y divide-border/70">
          {pending.slice(0, 6).map((p) => {
            const inst = getInstrument(p.instrumentId)
            return (
              <Row key={p.id} onClick={() => navigate(`/sources/section/${p.id}`)}>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-xs font-medium text-foreground">{p.nameOfCompliance ?? p.title}</span>
                  <span className="block truncate text-2xs text-muted-foreground">{inst?.authority} · {p.provision}</span>
                </span>
                <StatusChip status={effectiveClause(p, overrides).status ?? 'Processing'} />
              </Row>
            )
          })}
        </div>
      </DashboardCard>
    </RoleDashboard>
  )
}

// ── Control Owner ─────────────────────────────────────────────────────────────

export function ControlOwnerDashboard() {
  const navigate = useNavigate()
  const { label, first } = usePersona()
  const M = useEffectiveMetrics()
  const controls = useEffectiveControls()
  const failing = controls.filter((c) => c.result === 'Fail')
  const partial = controls.filter((c) => c.result === 'Partial')
  const attention = [...failing, ...partial].slice(0, 6)

  const stats: Stat[] = [
    { label: 'Control coverage', value: pct(M.controlCoverage), sub: 'pass or partial', tone: 'ok', icon: <ShieldCheck className="size-3.5" />, onClick: () => navigate('/controls') },
    { label: 'Failing', value: failing.length, sub: 'need remediation', tone: 'danger', icon: <ShieldAlert className="size-3.5" />, onClick: () => navigate('/controls') },
    { label: 'Partial', value: partial.length, sub: 'degraded', tone: 'warn', icon: <Layers className="size-3.5" />, onClick: () => navigate('/controls') },
    { label: 'CCM-automated', value: M.ccmAutomated, sub: 'self-testing', tone: 'info', icon: <Activity className="size-3.5" />, onClick: () => navigate('/ccm') },
  ]

  return (
    <RoleDashboard
      eyebrow={`Control Owner · ${label}`}
      title={`Your controls, ${first}`}
      description="The controls you operate, their test status and their continuous-monitoring rules."
      actions={<ReportMenu templates={reportsForPersona('CTRLOWNER')} />}
      summary={<StatGroup stats={stats} />}
    >
      <MyComplianceCalendarCard className="lg:col-span-2" />
      <DashboardCard title="Controls needing attention" icon={<Library className="size-4 text-critical" />} to="/controls" action={<span className="text-2xs text-muted-foreground tnum">{failing.length + partial.length}</span>}>
        <div className="-mx-3.5 -mb-3.5 divide-y divide-border/70">
          {attention.map((c) => (
            <Row key={c.id} onClick={() => navigate(`/controls/${c.id}`)}>
              <span className="font-mono text-2xs font-semibold text-info">{c.id}</span>
              <span className="min-w-0 flex-1 truncate text-xs text-foreground">{c.title}</span>
              {c.automation === 'CCM' && <span className="rounded bg-info-soft px-1.5 py-0 text-2xs font-medium text-info">CCM</span>}
              <StatusChip status={c.result} />
            </Row>
          ))}
        </div>
      </DashboardCard>
      <KriBreachCard title="KRIs on your controls" filter={(k) => k.linkedControls.length > 0 && ['Cyber', 'IT'].includes(getRisk(k.riskId)?.domain ?? '')} />
      <MyWorkCard role="CTRLOWNER" />
    </RoleDashboard>
  )
}

// ── Auditor ───────────────────────────────────────────────────────────────────

export function AuditorDashboard() {
  const navigate = useNavigate()
  const { label, first } = usePersona()
  const M = useEffectiveMetrics()
  const issues = useEffectiveIssues()
  const audits = useEffectiveAudits()
  const openAudits = audits.filter((a) => a.status !== 'Closed')
  const findingIssues = issues.filter((i) => i.source === 'Audit finding' && i.status !== 'Resolved')
  const overdueIssues = issues.filter((i) => i.status === 'Overdue')

  const stats: Stat[] = [
    { label: 'Active audits', value: openAudits.length, sub: `of ${audits.length}`, tone: 'info', icon: <ClipboardCheck className="size-3.5" />, onClick: () => navigate('/audits') },
    { label: 'Open findings', value: M.openFindings, sub: 'to remediate', tone: 'warn', icon: <FileSearch className="size-3.5" />, onClick: () => navigate('/audits') },
    { label: 'Overdue issues', value: overdueIssues.length, sub: 'past due', tone: overdueIssues.length ? 'danger' : 'ok', icon: <Wrench className="size-3.5" />, onClick: () => navigate('/issues') },
    { label: 'Finding remediations', value: findingIssues.length, sub: 'in flight', tone: 'neutral', icon: <Wrench className="size-3.5" />, onClick: () => navigate('/issues') },
  ]

  return (
    <RoleDashboard
      eyebrow={`Auditor · ${label}`}
      title={`Assurance, ${first}`}
      description="Risk-based audits, findings and the remediation they spawn."
      actions={<ReportMenu templates={reportsForPersona('AUDITOR')} />}
      summary={<StatGroup stats={stats} />}
    >
      <MyComplianceCalendarCard className="lg:col-span-2" />
      <DashboardCard title="Active audits" icon={<ClipboardCheck className="size-4 text-info" />} to="/audits">
        <div className="-mx-3.5 -mb-3.5 divide-y divide-border/70">
          {openAudits.slice(0, 6).map((a) => {
            const open = a.findings.filter((f) => f.status !== 'Closed').length
            return (
              <Row key={a.id} onClick={() => navigate(`/audits/${a.id}`)}>
                <span className="font-mono text-2xs font-semibold text-info">{a.id}</span>
                <span className="min-w-0 flex-1 truncate text-xs text-foreground">{a.title}</span>
                <StatusChip status={a.status} />
                <span className="tnum text-2xs text-muted-foreground">{open} open</span>
              </Row>
            )
          })}
        </div>
      </DashboardCard>
      <DashboardCard title="Findings to remediation" icon={<Wrench className="size-4 text-medium" />} to="/issues" action={<span className="text-2xs text-muted-foreground tnum">{findingIssues.length}</span>}>
        <div className="-mx-3.5 -mb-3.5 divide-y divide-border/70">
          {findingIssues.slice(0, 6).map((i) => (
            <Row key={i.id} onClick={() => navigate(`/issues/${i.id}`)}>
              <span className="font-mono text-2xs font-semibold text-info">{i.id}</span>
              <span className="min-w-0 flex-1 truncate text-xs text-foreground">{i.title}</span>
              <SeverityBadge severity={i.severity} dense />
            </Row>
          ))}
        </div>
      </DashboardCard>
      <MyWorkCard role="AUDITOR" />
    </RoleDashboard>
  )
}

// ── Administrator ─────────────────────────────────────────────────────────────

export function AdministratorDashboard() {
  const navigate = useNavigate()
  const { label, first } = usePersona()
  const sessionLog = useApp((s) => s.auditLog)

  const stats: Stat[] = [
    { label: 'Users', value: WORLD.people.length, sub: 'on the roster', tone: 'neutral', icon: <Users className="size-3.5" />, onClick: () => navigate('/settings') },
    { label: 'Personas', value: ROLES.length, sub: 'access roles', tone: 'info', icon: <ShieldCheck className="size-3.5" />, onClick: () => navigate('/settings') },
    { label: 'Integrations', value: 11, sub: 'spokes connected', tone: 'ok', icon: <Plug className="size-3.5" />, onClick: () => navigate('/integrations') },
    { label: 'Session events', value: sessionLog.length, sub: 'in the audit log', tone: 'neutral', icon: <ClipboardCheck className="size-3.5" />, onClick: () => navigate('/settings') },
  ]

  return (
    <RoleDashboard
      eyebrow={`Administrator · ${label}`}
      title={`Platform administration, ${first}`}
      description="Organisation, users and roles, frameworks, integrations and the audit log."
      summary={<StatGroup stats={stats} />}
    >
      <MyComplianceCalendarCard className="lg:col-span-2" />
      <DashboardCard title="Recent system activity" icon={<ClipboardCheck className="size-4 text-info" />} to="/settings">
        {sessionLog.length === 0 ? (
          <div className="flex items-center gap-2 px-0.5 py-4 text-sm text-muted-foreground">
            <ClipboardCheck className="size-4" /> No session events yet. Workflow actions appear here and in the audit log.
          </div>
        ) : (
          <div className="-mx-3.5 -mb-3.5 divide-y divide-border/70">
            {sessionLog.slice(0, 6).map((e) => (
              <Row key={e.id} onClick={() => navigate(e.route ?? '/settings')}>
                <Avatar id={e.actor} size={18} />
                <span className="min-w-0 flex-1 truncate text-xs text-foreground">{e.action}</span>
                <span className="text-2xs text-muted-foreground">{fmtRelative(e.at)}</span>
              </Row>
            ))}
          </div>
        )}
      </DashboardCard>
      <DashboardCard title="Integration health" icon={<Plug className="size-4 text-ok" />} to="/integrations">
        <div className="space-y-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-2"><span className="size-1.5 rounded-full bg-ok" /> 11 spokes connected · last sync within the hour</div>
          <div className="flex items-center gap-2"><span className="size-1.5 rounded-full bg-medium" /> CERT-In feed connector pending confirmation</div>
        </div>
      </DashboardCard>
      <MyWorkCard role="ADMIN" />
    </RoleDashboard>
  )
}

// ── Board committees ──────────────────────────────────────────────────────────
// Both dashboards are compositions of tiles that already exist elsewhere; a
// committee view is a different *audience* for the same records, not a second
// copy of them. Every tile drills through to the live register it summarises.
//
// Tiles the spec assigns to these audiences that depend on modules not yet
// built — audit plan vs actual (WI-08), whistleblower summary (WI-13), KRI
// breaches (WI-07) and vendor concentration (WI-12) — are deliberately absent
// rather than stubbed: a committee screen showing an empty panel is worse than
// one that shows only what the platform can currently evidence.

/** The committee's own constitutional record — chair, quorum, next sitting. */
function CommitteeCard({ short }: { short: string }) {
  const navigate = useNavigate()
  const c = COMMITTEES.find((x) => x.short === short)
  if (!c) return null
  const d = committeeDates(c)
  return (
    <DashboardCard title={c.name} icon={<Users className="size-4 text-info" />} to="/pfrda">
      <div className="grid grid-cols-2 gap-x-6 gap-y-2.5">
        <Attr label="Chair">
          <span className="inline-flex items-center gap-1.5">
            <Avatar id={c.chair} size={20} />
            <span className="truncate text-xs">{PEOPLE_BY_ID[c.chair]?.name}</span>
          </span>
        </Attr>
        <Attr label="Cadence">{c.cadence}</Attr>
        <Attr label="Quorum">{c.quorum ?? '—'}</Attr>
        <Attr label="Last met">{fmtDate(d.last)}</Attr>
        <Attr label="Next sitting">
          <span className="tnum">{fmtDate(d.next)}</span>
          <span className="ml-1.5 text-2xs text-muted-foreground">{fmtRelative(d.next)}</span>
        </Attr>
        <Attr label="Members">{(c.members ?? []).length}</Attr>
      </div>
      <div className="mt-2.5 flex flex-wrap gap-1">
        {(c.members ?? []).map((m) => (
          <button
            key={m}
            onClick={() => navigate('/settings')}
            className="inline-flex items-center gap-1 rounded border border-border bg-background px-1.5 py-0.5 text-2xs hover:border-info/40"
          >
            <Avatar id={m} size={16} />
            <span className="text-foreground">{PEOPLE_BY_ID[m]?.name}</span>
          </button>
        ))}
      </div>
    </DashboardCard>
  )
}

/** Breached indicators, worst first — the leading-signal card. Shared by the
 *  Risk Manager, the Risk Committee and the Control Owner, each filtered to
 *  what that audience owns. */
function KriBreachCard({ filter, title = 'KRIs in breach' }: { filter?: (k: KRI) => boolean; title?: string }) {
  const navigate = useNavigate()
  const all = filter ? WORLD.kris.filter(filter) : WORLD.kris
  const breached = byBreachSeverity(all).filter((k) => currentBand(k) !== 'Green')
  const s = kriSummary(all)
  return (
    <DashboardCard
      title={title}
      icon={<Gauge className="size-4 text-critical" />}
      to="/risks?view=kris"
      action={<span className="text-2xs tnum text-muted-foreground">{s.red} red · {s.amber} amber · {s.green} green</span>}
    >
      <div className="-mx-3.5 -mb-3.5 divide-y divide-border/70">
        {breached.slice(0, 6).map((k) => {
          const b = currentBand(k)
          return (
            <Row key={k.id} onClick={() => navigate(`/risks/${k.riskId}?tab=kris`)}>
              <StatusChip status={b} tone={b === 'Red' ? 'danger' : 'warn'} />
              <span className="min-w-0 flex-1 truncate text-xs text-foreground">{k.name}</span>
              <Sparkline data={k.history.map((h) => h.value)} width={44} height={16} color={b === 'Red' ? 'hsl(var(--critical))' : 'hsl(var(--medium))'} />
              <span className={cn('shrink-0 text-xs font-semibold tnum', b === 'Red' ? 'text-critical' : 'text-medium')}>{formatKriValue(k)}</span>
            </Row>
          )
        })}
        {breached.length === 0 && <div className="px-3.5 py-3 text-xs text-muted-foreground">Every indicator in scope is within its threshold.</div>}
      </div>
    </DashboardCard>
  )
}

function Attr({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-2xs font-medium uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-0.5 text-sm text-foreground">{children}</div>
    </div>
  )
}

/** Open findings bucketed by age — the ageing view an audit committee reads. */
function findingAgeBands(issues: ReturnType<typeof useEffectiveIssues>) {
  const open = issues.filter((i) => i.source === 'Audit finding' && i.status !== 'Resolved')
  const band = (lo: number, hi?: number) => open.filter((i) => i.ageDays >= lo && (hi === undefined || i.ageDays < hi))
  return [
    { label: '0–30 days', rows: band(0, 31), tone: 'ok' as const },
    { label: '31–60 days', rows: band(31, 61), tone: 'neutral' as const },
    { label: '61–90 days', rows: band(61, 91), tone: 'warn' as const },
    { label: '90+ days', rows: band(91), tone: 'danger' as const },
  ]
}

export function AuditCommitteeDashboard() {
  const navigate = useNavigate()
  const { first } = usePersona()
  const [packOpen, setPackOpen] = React.useState(false)
  const M = useEffectiveMetrics()
  const issues = useEffectiveIssues()
  const audits = useEffectiveAudits()

  const bands = findingAgeBands(issues)
  const plan = planProgress()
  const unescalated = unescalatedFailures()
  const ex = exceptionSummary(issues)
  const exceptions = exceptionsFrom(issues)
  const allIssues = issues.filter((i) => i.source !== 'Exception')
  const resolved = allIssues.filter((i) => i.status === 'Resolved').length
  const closureRate = allIssues.length ? Math.round((resolved / allIssues.length) * 1000) / 10 : 0
  const overdue = allIssues
    .filter((i) => i.status === 'Overdue')
    .sort((a, b) => b.ageDays - a.ageDays)
  const externalAudits = audits.filter((a) => a.type !== 'Internal')

  const stats: Stat[] = [
    { label: 'Audit plan delivered', value: `${plan.deliveredPct}%`, sub: `${plan.complete} of ${plan.total} · ${plan.deferred} deferred`, tone: plan.deferred ? 'warn' : 'ok', icon: <CalendarClock className="size-3.5" />, onClick: () => navigate('/audits') },
    { label: 'Open findings', value: M.openFindings, sub: `avg ${M.avgFindingAgeDays}d · oldest ${M.oldestFindingDays}d`, tone: 'warn', icon: <FileSearch className="size-3.5" />, onClick: () => navigate('/audits') },
    { label: 'Issue closure rate', value: `${closureRate}%`, sub: `${resolved} of ${allIssues.length}`, tone: closureRate >= 60 ? 'ok' : 'warn', icon: <Wrench className="size-3.5" />, onClick: () => navigate('/issues') },
    { label: 'Overdue remediations', value: overdue.length, sub: 'past due date', tone: overdue.length ? 'danger' : 'ok', icon: <CalendarX2 className="size-3.5" />, onClick: () => navigate('/issues') },
    { label: 'Live exceptions', value: ex.active + ex.expiringSoon, sub: `${ex.expired} expired · ${ex.renewals} renewals`, tone: ex.expired ? 'danger' : ex.expiringSoon ? 'warn' : 'ok', icon: <FileWarning className="size-3.5" />, onClick: () => navigate('/issues') },
  ]

  return (
    <RoleDashboard
      eyebrow="Board committee · Audit Committee"
      title={`Audit Committee, ${first}`}
      description="Assurance oversight: the audit programme, how quickly findings close, and the deviations management has approved."
      actions={
        <>
          <Button variant="outline" size="sm" onClick={() => setPackOpen(true)}>
            <FileText className="size-4" /> Export ARC pack
          </Button>
          <ReportMenu templates={reportsForPersona('AUDITOR')} />
        </>
      }
      summary={<StatGroup stats={stats} />}
    >
      <PackGenerator open={packOpen} onClose={() => setPackOpen(false)} defaultAudience="Audit Committee" />
      <CommitteeCard short="Audit" />

      <DashboardCard title="Open findings by ageing band" icon={<FileSearch className="size-4 text-medium" />} to="/audits">
        <div className="space-y-1.5">
          {bands.map((b) => {
            const max = Math.max(1, ...bands.map((x) => x.rows.length))
            return (
              <button
                key={b.label}
                onClick={() => navigate('/issues')}
                className="flex w-full items-center gap-2 rounded-md px-1 py-1 text-left hover:bg-muted/60"
              >
                <span className="w-24 shrink-0 text-2xs text-muted-foreground">{b.label}</span>
                <span className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                  <span
                    className={cn(
                      'block h-full rounded-full',
                      b.tone === 'danger' ? 'bg-critical' : b.tone === 'warn' ? 'bg-medium' : b.tone === 'ok' ? 'bg-ok' : 'bg-info',
                    )}
                    style={{ width: `${(b.rows.length / max) * 100}%` }}
                  />
                </span>
                <span className="w-8 shrink-0 text-right text-xs font-semibold tnum text-foreground">{b.rows.length}</span>
              </button>
            )
          })}
        </div>
      </DashboardCard>

      <DashboardCard
        title="Overdue remediations"
        icon={<Wrench className="size-4 text-critical" />}
        to="/issues"
        action={<span className="text-2xs tnum text-muted-foreground">{overdue.length}</span>}
      >
        <div className="-mx-3.5 -mb-3.5 divide-y divide-border/70">
          {overdue.slice(0, 6).map((i) => (
            <Row key={i.id} onClick={() => navigate(`/issues/${i.id}`)}>
              <span className="font-mono text-2xs font-semibold text-info">{i.id}</span>
              <span className="min-w-0 flex-1 truncate text-xs text-foreground">{i.title}</span>
              <Avatar id={i.owner} size={18} />
              <span className="shrink-0 tnum text-2xs text-critical">{i.ageDays}d</span>
            </Row>
          ))}
          {overdue.length === 0 && <div className="px-3.5 py-3 text-xs text-muted-foreground">No remediation is past its due date.</div>}
        </div>
      </DashboardCard>

      <DashboardCard
        title="Exception register"
        icon={<FileWarning className="size-4 text-medium" />}
        to="/issues"
        action={<span className="text-2xs tnum text-muted-foreground">{ex.total}</span>}
      >
        <div className="-mx-3.5 -mb-3.5 divide-y divide-border/70">
          {exceptions
            .slice()
            .sort((a, b) => new Date(a.exception!.expiresOn).getTime() - new Date(b.exception!.expiresOn).getTime())
            .slice(0, 6)
            .map((i) => {
              const st = exceptionState(i)
              return (
                <Row key={i.id} onClick={() => navigate(`/issues/${i.id}`)}>
                  <span className="font-mono text-2xs font-semibold text-info">{i.id}</span>
                  <span className="min-w-0 flex-1 truncate text-xs text-foreground">{i.sourceRef}</span>
                  {i.exception!.renewalCount > 0 && (
                    <span className="shrink-0 rounded bg-muted px-1 py-0 text-2xs tnum text-muted-foreground">×{i.exception!.renewalCount}</span>
                  )}
                  <StatusChip
                    status={st ?? 'Active'}
                    tone={st === 'Expired' ? 'danger' : st === 'Expiring soon' ? 'warn' : st === 'Closed' ? 'neutral' : 'ok'}
                  />
                </Row>
              )
            })}
        </div>
      </DashboardCard>

      <DashboardCard
        title="Audit plan vs actual"
        icon={<CalendarClock className="size-4 text-info" />}
        to="/audits"
        action={<span className="text-2xs tnum text-muted-foreground">{plan.deliveredPct}% delivered</span>}
      >
        <div className="space-y-1.5">
          {quarterCoverage().map((q) => (
            <button
              key={q.quarter}
              onClick={() => navigate('/audits')}
              className="flex w-full items-center gap-2 rounded-md px-1 py-1 text-left hover:bg-muted/60"
            >
              <span className="w-8 shrink-0 text-2xs font-semibold text-foreground">{q.quarter}</span>
              <span className="flex h-2 flex-1 overflow-hidden rounded-full bg-muted">
                <span className="h-full bg-ok" style={{ width: `${(q.complete / Math.max(1, q.total)) * 100}%` }} />
                <span className="h-full bg-info" style={{ width: `${(q.inProgress / Math.max(1, q.total)) * 100}%` }} />
                <span className="h-full bg-critical" style={{ width: `${(q.deferred / Math.max(1, q.total)) * 100}%` }} />
              </span>
              <span className="w-24 shrink-0 text-right text-2xs tnum text-muted-foreground">
                {q.complete}/{q.total} done
              </span>
            </button>
          ))}
        </div>
        {unescalated.length > 0 && (
          <p className="mt-2.5 text-2xs text-critical">
            {unescalated.length} failed test {unescalated.length === 1 ? 'step has' : 'steps have'} no finding raised.
          </p>
        )}
        {plan.highPriorityOpen > 0 && (
          <p className="mt-1 text-2xs text-medium">{plan.highPriorityOpen} high-priority entities still outstanding.</p>
        )}
      </DashboardCard>

      <DashboardCard title="External auditor status" icon={<ClipboardCheck className="size-4 text-info" />} to="/audits" span>
        <div className="-mx-3.5 -mb-3.5 divide-y divide-border/70">
          {externalAudits.slice(0, 6).map((a) => {
            const open = a.findings.filter((f) => f.status !== 'Closed').length
            return (
              <Row key={a.id} onClick={() => navigate(`/audits/${a.id}`)}>
                <span className="font-mono text-2xs font-semibold text-info">{a.id}</span>
                <span className="min-w-0 flex-1 truncate text-xs text-foreground">{a.title}</span>
                <span className="shrink-0 text-2xs text-muted-foreground">{a.auditor}</span>
                <StatusChip status={a.status} />
                <span className="w-14 shrink-0 text-right tnum text-2xs text-muted-foreground">{open} open</span>
              </Row>
            )
          })}
        </div>
      </DashboardCard>
    </RoleDashboard>
  )
}

export function RiskCommitteeDashboard() {
  const navigate = useNavigate()
  const { first } = usePersona()
  const [packOpen, setPackOpen] = React.useState(false)
  const risks = useEffectiveRisks()
  const campaigns = useEffectiveCampaigns()
  const incidents = useEffectiveIncidents()

  // The RCSA cycle the committee is currently being reported on.
  const rcsa = React.useMemo(() => {
    const open = campaigns
      .filter((c) => c.type === 'RCSA' && c.status !== 'Closed' && c.status !== 'Draft')
      .sort((a, b) => new Date(a.dueOn).getTime() - new Date(b.dueOn).getTime())[0]
    const p = open ? campaignProgress(open) : undefined
    return { cycle: open, completePct: p?.completePct ?? 0, overdue: p?.overdue ?? 0 }
  }, [campaigns])

  const coverage = rcsaCoverage(risks, campaigns)
  const rows = byExposure(appetiteRows(risks))
  const appetite = appetiteSummary(rows)
  const losses = lossTotals(incidents, 365)
  const trend = netLossTrend(incidents)
  const top = [...risks].sort((a, b) => b.residual - a.residual).slice(0, 10)
  const aboveTarget = risks.filter(isAboveTarget).length
  const kri = kriSummary()

  const stats: Stat[] = [
    { label: 'Outside appetite', value: appetite.outside, sub: `${appetite.atTolerance} at tolerance`, tone: appetite.outside ? 'danger' : 'ok', icon: <Gauge className="size-3.5" />, onClick: () => navigate('/risks') },
    { label: 'Above target residual', value: aboveTarget, sub: `of ${risks.length} risks`, tone: 'warn', icon: <ShieldAlert className="size-3.5" />, onClick: () => navigate('/risks') },
    { label: 'KRIs in breach', value: kri.breached, sub: `${kri.red} red · ${kri.worsening} worsening`, tone: kri.red ? 'danger' : 'warn', icon: <Gauge className="size-3.5" />, onClick: () => navigate('/risks?view=kris') },
    { label: 'Net loss (12 mo)', value: inr(losses.net), sub: `${losses.count} loss events`, tone: 'danger', icon: <IndianRupee className="size-3.5" />, onClick: () => navigate('/incidents') },
    { label: 'Acceptances expiring', value: risks.filter((r) => acceptanceState(r) === 'Expiring soon' || acceptanceState(r) === 'Expired').length, sub: 'need renewal or closure', tone: 'warn', icon: <CalendarClock className="size-3.5" />, onClick: () => navigate('/risks') },
    { label: 'RCSA completion', value: `${rcsa.completePct}%`, sub: rcsa.cycle ? `${rcsa.cycle.period} · ${rcsa.overdue} overdue` : 'no cycle in flight', tone: rcsa.overdue ? 'warn' : 'ok', icon: <Megaphone className="size-3.5" />, onClick: () => navigate(rcsa.cycle ? `/campaigns/${rcsa.cycle.id}` : '/campaigns') },
    { label: 'Register assessed', value: `${coverage.coveragePct}%`, sub: `${coverage.lapsed.length} lapsed or never assessed`, tone: coverage.lapsed.length ? 'warn' : 'ok', icon: <ClipboardCheck className="size-3.5" />, onClick: () => navigate('/risks?workflow=Assessment+lapsed') },
  ]

  return (
    <RoleDashboard
      eyebrow="Board committee · Risk Management Committee"
      title={`Risk Committee, ${first}`}
      description="Enterprise exposure against board-approved appetite, the top residual risks and the losses actually incurred."
      actions={
        <>
          <Button variant="outline" size="sm" onClick={() => setPackOpen(true)}>
            <FileText className="size-4" /> Export RMC pack
          </Button>
          <ReportMenu templates={reportsForPersona('RISK')} />
        </>
      }
      summary={<StatGroup stats={stats} />}
    >
      <PackGenerator open={packOpen} onClose={() => setPackOpen(false)} defaultAudience="Risk Management Committee" />
      <CommitteeCard short="Risk" />

      <DashboardCard title="Net-loss trend" icon={<IndianRupee className="size-4 text-critical" />} to="/incidents">
        <div className="flex items-end gap-1.5">
          {trend.map((p) => {
            const max = Math.max(1, ...trend.map((x) => x.net))
            return (
              <button
                key={p.period}
                onClick={() => navigate('/incidents')}
                className="group flex flex-1 flex-col items-center gap-1"
                title={`${p.period}: ${inr(p.net)}`}
              >
                <span className="text-2xs tnum text-muted-foreground opacity-0 group-hover:opacity-100">{inr(p.net)}</span>
                <span className="flex h-20 w-full items-end">
                  <span className="w-full rounded-t bg-critical/70 transition-colors group-hover:bg-critical" style={{ height: `${Math.max(4, (p.net / max) * 100)}%` }} />
                </span>
                <span className="text-2xs text-muted-foreground">{p.period}</span>
              </button>
            )
          })}
        </div>
        <div className="mt-2 flex items-center justify-between text-2xs tnum text-muted-foreground">
          <span>gross {inr(losses.gross)}</span>
          <span>recovered {inr(losses.recovery)}</span>
          <span className="font-medium text-critical">net {inr(losses.net)}</span>
        </div>
      </DashboardCard>

      <KriBreachCard />

      <div className="lg:col-span-2">
        <AppetitePanel />
      </div>

      <div className="lg:col-span-2">
        <HeatMap />
      </div>

      <DashboardCard
        title="Top 10 residual risks"
        icon={<ShieldAlert className="size-4 text-critical" />}
        to="/risks"
        span
      >
        <div className="-mx-3.5 -mb-3.5 divide-y divide-border/70">
          {top.map((r) => {
            const p = actionProgress(r)
            return (
              <Row key={r.id} onClick={() => navigate(`/risks/${r.id}`)}>
                <span className="font-mono text-2xs font-semibold text-info">{r.id}</span>
                <span className="min-w-0 flex-1 truncate text-xs text-foreground">{r.title}</span>
                <Avatar id={r.owner} size={18} />
                <span className="w-16 shrink-0 text-right text-2xs tnum text-muted-foreground">
                  {p.total ? `${p.done}/${p.total}` : 'no plan'}
                </span>
                <StatusChip status={deriveRiskStage(r)} tone={stageTone(deriveRiskStage(r)) === 'danger' ? 'danger' : stageTone(deriveRiskStage(r)) === 'warn' ? 'warn' : stageTone(deriveRiskStage(r)) === 'ok' ? 'ok' : 'progress'} />
                <ScoreBadge score={r.residual} />
              </Row>
            )
          })}
        </div>
      </DashboardCard>
    </RoleDashboard>
  )
}
