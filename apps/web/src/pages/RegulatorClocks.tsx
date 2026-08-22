import { useNavigate } from 'react-router-dom'
import { Timer, ShieldCheck, Server, ArrowUpRight, CalendarClock } from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import { RegulatorClock } from '@/components/RegulatorClock'
import { StatusChip } from '@/components/StatusChip'
import { cn } from '@/lib/utils'
import { activeTracks } from '@/lib/clocks'
import { countdownTo, fmtIST, fmtRelative } from '@/lib/time'
import { useLiveNow } from '@/lib/useInterval'
import { useEffectiveObligations } from '@/lib/effective'
import { personName } from '@/data/people'
import type { Obligation } from '@/types'

function ObligationClock({ o }: { o: Obligation }) {
  const navigate = useNavigate()
  const now = useLiveNow()
  const cd = countdownTo(o.dueDate, now)
  const tone = cd.breached ? 'critical' : cd.ms < 5 * 86400000 ? 'warn' : 'ok'
  const toneCls =
    tone === 'critical' ? 'text-critical' : tone === 'warn' ? 'text-medium' : 'text-ok'
  const ringCls =
    tone === 'critical' ? 'border-critical/30 bg-critical-soft/40' : tone === 'warn' ? 'border-medium/40 bg-medium-soft/40' : 'border-border'
  return (
    <button
      onClick={() => navigate(`/obligations/${o.id}`)}
      className={cn('group rounded-lg border p-3 text-left transition-colors hover:shadow-sm', ringCls)}
    >
      <div className="flex items-center justify-between">
        <span className="rounded bg-muted px-1.5 py-0 text-2xs font-semibold text-muted-foreground">{o.regulator}</span>
        <StatusChip status={o.status} />
      </div>
      <div className="mt-1.5 truncate text-xs font-medium text-foreground" title={o.title}>
        {o.title}
      </div>
      <div className={cn('mt-1 font-mono text-lg font-semibold tnum', toneCls)}>{cd.label}</div>
      <div className="mt-0.5 flex items-center justify-between text-2xs text-muted-foreground">
        <span>{cd.breached ? 'overdue' : 'to deadline'}</span>
        <span className="inline-flex items-center gap-1">
          {personName(o.owner)}
          <ArrowUpRight className="size-3 opacity-0 transition-opacity group-hover:opacity-100" />
        </span>
      </div>
      <div className="mt-0.5 text-2xs text-muted-foreground">Due {fmtIST(o.dueDate)}</div>
    </button>
  )
}

export function RegulatorClocks() {
  const navigate = useNavigate()
  const tracks = activeTracks()
  const obligations = useEffectiveObligations()

  const obligationClocks = obligations
    .filter((o) => o.status === 'Overdue' || o.status === 'Due' || o.status === 'In review')
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
    .slice(0, 12)

  return (
    <div>
      <PageHeader
        eyebrow="Incidents & Clocks"
        title="Regulator Clocks"
        description="Live incident-reporting tracks and upcoming compliance deadlines across CERT-In, PFRDA, DPDP, GST, Labour and the Companies Act."
      />

      {/* Standing CERT-In requirements */}
      <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-3">
        <StandingCard
          icon={<Server className="size-4 text-info" />}
          title="180-day in-India log retention"
          body="CERT-In Direction 20(3)/2022 — security logs retained for 180 days within India. Splunk SIEM and EDR feeds compliant."
          status="Compliant"
        />
        <StandingCard
          icon={<ShieldCheck className="size-4 text-ok" />}
          title="NTP clock synchronization"
          body="All systems synced to NPL / NIC NTP servers so incident timestamps are accurate and defensible across regulator filings."
          status="Synced"
        />
        <StandingCard
          icon={<Timer className="size-4 text-critical" />}
          title="6-hour incident reporting"
          body="Material cyber incidents reported to CERT-In within 6 hours of detection — pre-populated from the incident record."
          status="Armed"
        />
      </div>

      {/* Live incident clocks */}
      <div className="mb-2 flex items-center gap-2">
        <h2 className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
          <Timer className="size-4 text-critical" /> Live incident clocks
        </h2>
        <span className="rounded-full bg-critical-soft px-1.5 py-0 text-2xs font-semibold text-critical">{tracks.length}</span>
        <span className="text-2xs text-muted-foreground">running now · nearest first</span>
      </div>
      <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {tracks.map((t) => (
          <div key={`${t.incidentId}-${t.track.regulator}`} className="space-y-1.5">
            <RegulatorClock track={t.track} />
            <button
              onClick={() => navigate(`/incidents/${t.incidentId}`)}
              className="flex w-full items-center gap-1.5 px-1 text-2xs text-muted-foreground hover:text-foreground"
            >
              <span className="font-mono font-semibold text-info">{t.incidentId}</span>
              <span className="truncate">{t.incidentTitle}</span>
              <ArrowUpRight className="ml-auto size-3" />
            </button>
          </div>
        ))}
      </div>

      {/* Obligation deadlines */}
      <div className="mb-2 flex items-center gap-2">
        <h2 className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
          <CalendarClock className="size-4 text-info" /> Upcoming regulatory deadlines
        </h2>
        <span className="text-2xs text-muted-foreground">obligations across every regulator · soonest 12</span>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {obligationClocks.map((o) => (
          <ObligationClock key={o.id} o={o} />
        ))}
      </div>

      <div className="mt-4 text-center text-2xs text-muted-foreground">
        Live countdowns · {tracks.length} incident clocks ·{' '}
        {obligations.filter((o) => o.status === 'Overdue').length} overdue obligations ·{' '}
        {fmtRelative(tracks[0]?.track.deadline ?? new Date().toISOString())} to the nearest deadline
      </div>
    </div>
  )
}

function StandingCard({
  icon,
  title,
  body,
  status,
}: {
  icon: React.ReactNode
  title: string
  body: string
  status: string
}) {
  return (
    <div className="card-surface p-3.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          {icon}
          <h3 className="text-xs font-semibold text-foreground">{title}</h3>
        </div>
        <StatusChip status={status} tone="ok" />
      </div>
      <p className="mt-1.5 text-2xs leading-snug text-muted-foreground">{body}</p>
    </div>
  )
}
