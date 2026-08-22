import { useNavigate } from 'react-router-dom'
import { ArrowUpRight, Siren, CalendarX2 } from 'lucide-react'
import { WORLD, MARQUEE } from '@/data'
import { SeverityBadge } from '@/components/SeverityBadge'
import { StatusChip } from '@/components/StatusChip'
import { RegulatorClockInline } from '@/components/RegulatorClock'
import { Avatar } from '@/components/Avatar'
import { fmtIST, fmtDate, fmtRelative } from '@/lib/time'
import { personName } from '@/data/people'

export function NeedsAttention() {
  const navigate = useNavigate()
  const openIncidents = WORLD.incidents.filter((i) => i.status !== 'Closed')
  const overdue = WORLD.obligations
    .filter((o) => o.status === 'Overdue')
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())

  return (
    <div className="grid grid-cols-2 gap-3">
      {/* Live incidents */}
      <div className="card-surface flex flex-col">
        <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
          <div className="flex items-center gap-1.5">
            <Siren className="size-4 text-critical" />
            <h2 className="text-sm font-semibold text-foreground">Live incident track</h2>
          </div>
          <button onClick={() => navigate('/incidents')} className="text-2xs font-medium text-info hover:underline">
            All incidents
          </button>
        </div>
        <div className="divide-y divide-border/70">
          {/* Marquee */}
          <button
            onClick={() => navigate(`/incidents/${MARQUEE.id}`)}
            className="block w-full px-4 py-3 text-left transition-colors hover:bg-critical-soft/30"
          >
            <div className="flex items-center gap-2">
              <SeverityBadge severity={MARQUEE.classification} dense />
              <span className="font-mono text-2xs font-semibold text-foreground">{MARQUEE.id}</span>
              <ArrowUpRight className="ml-auto size-3.5 text-muted-foreground" />
            </div>
            <div className="mt-1 text-sm font-medium text-foreground">{MARQUEE.title}</div>
            <div className="mt-0.5 text-2xs text-muted-foreground" title={fmtIST(MARQUEE.detectedAt)}>
              Detected {fmtIST(MARQUEE.detectedAt)} · {MARQUEE.source}
            </div>
            <div className="mt-2 grid grid-cols-3 gap-1.5">
              {MARQUEE.regulatorTracks.map((t) => (
                <div key={t.regulator} className="rounded-md border border-border bg-background px-2 py-1">
                  <div className="text-2xs font-medium text-muted-foreground">{t.regulator}</div>
                  <RegulatorClockInline track={t} className="text-xs" />
                </div>
              ))}
            </div>
          </button>
          {/* Open High incidents */}
          {openIncidents
            .filter((i) => i.id !== MARQUEE.id)
            .map((i) => (
              <button
                key={i.id}
                onClick={() => navigate(`/incidents/${i.id}`)}
                className="flex w-full items-center gap-2 px-4 py-2 text-left transition-colors hover:bg-muted/50"
              >
                <SeverityBadge severity={i.classification} dense />
                <span className="font-mono text-2xs font-semibold text-foreground">{i.id}</span>
                <span className="min-w-0 flex-1 truncate text-xs text-foreground">{i.title}</span>
                <StatusChip status={i.status} className="shrink-0" />
              </button>
            ))}
        </div>
      </div>

      {/* Overdue obligations */}
      <div className="card-surface flex flex-col">
        <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
          <div className="flex items-center gap-1.5">
            <CalendarX2 className="size-4 text-medium" />
            <h2 className="text-sm font-semibold text-foreground">Overdue obligations</h2>
            <span className="rounded-full bg-critical-soft px-1.5 py-0 text-2xs font-semibold text-critical">
              {overdue.length}
            </span>
          </div>
          <button onClick={() => navigate('/obligations')} className="text-2xs font-medium text-info hover:underline">
            Calendar
          </button>
        </div>
        <div className="scrollbar-thin max-h-[330px] divide-y divide-border/70 overflow-y-auto">
          {overdue.map((o) => (
            <button
              key={o.id}
              onClick={() => navigate(`/obligations/${o.id}`)}
              className="flex w-full items-center gap-2.5 px-4 py-2 text-left transition-colors hover:bg-muted/50"
            >
              <div className="flex w-16 shrink-0 flex-col">
                <span className="rounded bg-muted px-1.5 py-0 text-center text-2xs font-semibold text-muted-foreground">
                  {o.regulator}
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-xs font-medium text-foreground">{o.title}</div>
                <div className="text-2xs text-critical">
                  Due {fmtDate(o.dueDate)} · {fmtRelative(o.dueDate)}
                </div>
              </div>
              <span title={personName(o.owner)}>
                <Avatar id={o.owner} size={22} />
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
