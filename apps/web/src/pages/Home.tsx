import * as React from 'react'
import { useNavigate } from 'react-router-dom'
import { Gauge, ShieldCheck, Siren, Timer, CalendarX2, FileSearch, Download, ShieldX, Wrench, Hourglass, Users, ArrowUpRight, TrendingUp } from 'lucide-react'
import { cn } from '@/lib/utils'
import { KpiTile } from '@/components/KpiTile'
import { RegulatorClockInline } from '@/components/RegulatorClock'
import { Avatar } from '@/components/Avatar'
import { Button } from '@/components/ui/Button'
import { HeatMap } from './home/HeatMap'
import { AppetitePanel } from './home/AppetitePanel'
import { PackGenerator } from '@/components/packs/PackGenerator'
import { kriSummary } from '@/lib/kri'
import { NeedsAttention } from './home/NeedsAttention'
import { ActivityStream } from './home/ActivityStream'
import { TrendCharts } from './home/TrendCharts'
import { MyComplianceCalendarCard } from '@/components/MyComplianceCalendar'
import { StartTourButton } from '@/components/tour/StartTourButton'
import { nearestTrack } from '@/lib/clocks'
import { pct } from '@/lib/format'
import { fmtIST, fmtDate, fmtRelative, NOW } from '@/lib/time'
import { controlPassRateTrend, openIncidentsTrend } from '@/lib/trends'
import { useApp } from '@/store'
import { useEffectiveMetrics } from '@/lib/metrics'
import { PEOPLE_BY_ID, personName } from '@/data/people'
import { committeesByNextMeeting, committeeDates } from '@/data/committees'
import {
  RiskManagerDashboard,
  ComplianceManagerDashboard,
  ComplianceAnalystDashboard,
  ControlOwnerDashboard,
  AuditorDashboard,
  AdministratorDashboard,
  AuditCommitteeDashboard,
  RiskCommitteeDashboard,
} from './home/dashboards'

/** Home is persona-routed: each persona lands on its own dashboard. */
export function Home() {
  const role = useApp((s) => s.role)
  switch (role) {
    case 'RISK':
      return <RiskManagerDashboard />
    case 'CCO':
      return <ComplianceManagerDashboard />
    case 'ANALYST':
      return <ComplianceAnalystDashboard />
    case 'CTRLOWNER':
      return <ControlOwnerDashboard />
    case 'AUDITOR':
      return <AuditorDashboard />
    case 'ADMIN':
      return <AdministratorDashboard />
    case 'ARC':
      return <AuditCommitteeDashboard />
    case 'RMC':
      return <RiskCommitteeDashboard />
    default:
      return <ExecutiveDashboard />
  }
}

function ExecutiveDashboard() {
  const navigate = useNavigate()
  const selfId = useApp((s) => s.personId)
  const M = useEffectiveMetrics()
  const kri = kriSummary()
  const nearest = nearestTrack()
  const first = PEOPLE_BY_ID[selfId]?.name.split(' ')[0] ?? 'Meera'

  // The board pack is composed from live sections and issued under maker-checker
  // (see components/packs/PackGenerator) — not a document assembled offline.
  const [packOpen, setPackOpen] = React.useState(false)

  return (
    <div className="space-y-5">
      {/* Hero strip */}
      <div className="relative overflow-hidden rounded-xl border border-border bg-gradient-to-br from-primary to-[hsl(222_47%_18%)] px-6 py-5 text-primary-foreground">
        <div className="relative z-10 flex items-end justify-between gap-4">
          <div>
            <div className="text-xs font-medium uppercase tracking-wider text-primary-foreground/60">
              Board Cockpit · {fmtIST(NOW)}
            </div>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight">Good morning, {first} - OneGRC</h1>
          </div>
          <div className="hidden shrink-0 items-center gap-2 lg:flex">
            <StartTourButton className="border-white/25 bg-white/10 text-white hover:bg-white/20" />
            <Button
              variant="outline"
              size="sm"
              className="border-white/25 bg-white/10 text-white hover:bg-white/20"
              onClick={() => setPackOpen(true)}
            >
              <Download className="size-4" />
              Export board pack
            </Button>
          </div>
        </div>
        <div className="pointer-events-none absolute -right-10 -top-16 size-64 rounded-full bg-accent/10 blur-2xl" />
      </div>

      {/* Live posture: the six headline tiles and the enterprise heat map read as
          one block — the board's "where do we stand right now" answer — with the
          readiness drill-down and committee prep below it. */}
      <div className="space-y-3">
        {/* 6 KPI tiles - now on effective (seed + override) metrics */}
        <div data-tour="home-posture" className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <KpiTile label="Enterprise risk" value={M.enterpriseRisk.toFixed(1)} unit="/10" icon={<Gauge className="size-3.5" />} tone="warn" trend="up" trendLabel="+0.3 QoQ" sub="Residual, board-weighted" onClick={() => navigate('/risks')} />
        <KpiTile label="Control coverage" value={pct(M.controlCoverage)} icon={<ShieldCheck className="size-3.5" />} tone="ok" spark={controlPassRateTrend.map((p) => p.value)} sparkColor="hsl(var(--ok))" sub={`${M.ccmAutomated} CCM-automated`} onClick={() => navigate('/controls')} />
        <KpiTile label="Open incidents" value={M.openIncidents} icon={<Siren className="size-3.5" />} tone="danger" spark={openIncidentsTrend.map((p) => p.value)} sparkColor="hsl(var(--critical))" sub={`${M.criticalOpen} Critical · 4 High`} onClick={() => navigate('/incidents')} />
        <KpiTile label={`Nearest clock · ${nearest?.track.regulator ?? '-'}`} value={nearest ? <RegulatorClockInline track={nearest.track} /> : '-'} icon={<Timer className="size-3.5" />} tone="danger" live sub="6-hour incident report" onClick={() => nearest && navigate(`/incidents/${nearest.incidentId}`)} />
        <KpiTile label="Overdue obligations" value={M.overdueObligations} icon={<CalendarX2 className="size-3.5" />} tone="warn" sub={`${M.dueSoonObligations} due soon`} onClick={() => navigate('/obligations')} />
        <KpiTile label="Open findings" value={M.openFindings} icon={<FileSearch className="size-3.5" />} tone="warn" sub="Across 18 audits" onClick={() => navigate('/audits')} />
        </div>

        {/* Heat map + needs attention */}
        <div className="grid grid-cols-1 gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
          <HeatMap />
          <NeedsAttention />
        </div>

        {/* Risk appetite — the third board view beside the heat map and the
            top-risk list: how much of each risk type the board agreed to carry,
            against what the register actually holds. */}
        <AppetitePanel />
      </div>

      {/* Inspection readiness — the drillable "are we in control" band (Req 14) */}
      <div className="grid grid-cols-1 gap-3 xl:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
        <div className="card-surface p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground">Inspection readiness</h2>
            <button onClick={() => navigate('/pfrda')} className="inline-flex items-center gap-1 text-2xs font-medium text-info hover:underline">
              Open PFRDA pack <ArrowUpRight className="size-3" />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
            <ReadinessTile icon={<ShieldCheck className="size-3.5 text-ok" />} label="Control coverage" value={pct(M.controlCoverage)} sub="pass or partial" onClick={() => navigate('/controls')} />
            <ReadinessTile icon={<ShieldX className="size-3.5 text-critical" />} label="Failing controls" value={M.failingControls} sub="need re-test" tone={M.failingControls ? 'danger' : 'ok'} onClick={() => navigate('/controls')} />
            <ReadinessTile icon={<CalendarX2 className="size-3.5 text-medium" />} label="Overdue obligations" value={M.overdueObligations} sub={`${M.dueSoonObligations} due soon`} tone={M.overdueObligations ? 'warn' : 'ok'} onClick={() => navigate('/obligations')} />
            <ReadinessTile icon={<FileSearch className="size-3.5 text-medium" />} label="Open findings" value={M.openFindings} sub={`avg ${M.avgFindingAgeDays}d old`} tone="warn" onClick={() => navigate('/audits')} />
            <ReadinessTile icon={<Wrench className="size-3.5 text-info" />} label="Time to remediate" value={`${M.avgRemediationDays}d`} sub="avg age, open issues" onClick={() => navigate('/issues')} />
            <ReadinessTile icon={<Hourglass className="size-3.5 text-info" />} label="Oldest finding age" value={`${M.oldestFindingDays}d`} sub="longest open remediation" tone="warn" onClick={() => navigate('/issues')} />
            {/* The six tiles above are all lagging — they report what already
                happened. These two are the leading half: indicators crossing a
                threshold before the loss, and indicators moving the wrong way. */}
            <ReadinessTile icon={<Gauge className="size-3.5 text-critical" />} label="KRIs in breach" value={kri.breached} sub={`${kri.red} red · of ${kri.total}`} tone={kri.red ? 'danger' : kri.breached ? 'warn' : 'ok'} onClick={() => navigate('/risks?view=kris')} />
            <ReadinessTile icon={<TrendingUp className="size-3.5 text-medium" />} label="Indicators worsening" value={kri.worsening} sub="moving the wrong way" tone={kri.worsening ? 'warn' : 'ok'} onClick={() => navigate('/risks?view=kris')} />
          </div>
        </div>

        {/* Board & committee prep (Req 13) */}
        <div className="card-surface p-4">
          <div className="mb-3 flex items-center gap-1.5">
            <Users className="size-4 text-info" />
            <h2 className="text-sm font-semibold text-foreground">Board &amp; committee prep</h2>
          </div>
          <div className="space-y-1.5">
            {committeesByNextMeeting().map((c) => {
              const d = committeeDates(c)
              return (
                <button
                  key={c.name}
                  onClick={() => navigate('/pfrda')}
                  className="group flex w-full items-center gap-2 rounded-md border border-border bg-background px-2.5 py-1.5 text-left hover:border-info/40 hover:bg-info-soft/40"
                >
                  <Avatar id={c.chair} size={22} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-xs font-medium text-foreground">{c.short} Committee</div>
                    <div className="text-2xs text-muted-foreground">Chair {personName(c.chair)} · last {fmtDate(d.last)}</div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="text-2xs font-medium text-foreground">{fmtRelative(d.next)}</div>
                    <div className="text-2xs text-muted-foreground">{fmtDate(d.next)}</div>
                  </div>
                </button>
              )
            })}
          </div>
          <Button variant="outline" size="sm" className="mt-3 w-full" onClick={() => setPackOpen(true)}>
            <Download className="size-4" /> Export board pack
          </Button>
        </div>
      </div>

      {/* The logged-in user's own compliance calendar — act on what you own */}
      <MyComplianceCalendarCard />

      <TrendCharts />
      <ActivityStream />

      <PackGenerator open={packOpen} onClose={() => setPackOpen(false)} defaultAudience="Board" />

      <div className="pb-2 text-center text-2xs text-muted-foreground">
        <button className="text-info hover:underline" onClick={() => navigate('/integrations')}>
          view integrations
        </button>
      </div>
    </div>
  )
}

function ReadinessTile({
  icon,
  label,
  value,
  sub,
  tone = 'neutral',
  onClick,
}: {
  icon: React.ReactNode
  label: string
  value: React.ReactNode
  sub: string
  tone?: 'neutral' | 'ok' | 'warn' | 'danger'
  onClick?: () => void
}) {
  const valueTone =
    tone === 'danger' ? 'text-critical' : tone === 'warn' ? 'text-medium' : tone === 'ok' ? 'text-ok' : 'text-foreground'
  return (
    <button
      onClick={onClick}
      className="group rounded-lg border border-border bg-background p-2.5 text-left transition-colors hover:border-info/40 hover:bg-info-soft/40"
    >
      <div className="flex items-center gap-1.5 text-2xs font-medium uppercase tracking-wide text-muted-foreground">
        {icon}
        <span className="truncate">{label}</span>
      </div>
      <div className={cn('mt-1 text-xl font-semibold tnum', valueTone)}>{value}</div>
      <div className="text-2xs text-muted-foreground">{sub}</div>
    </button>
  )
}

export { ExecutiveDashboard }
