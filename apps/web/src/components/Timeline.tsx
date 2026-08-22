import { cn } from '@/lib/utils'
import type { TimelineEvent } from '@/types'
import { fmtIST, fmtTime, fmtDate } from '@/lib/time'
import { personName, PEOPLE_BY_ID } from '@/data/people'
import { Activity, ShieldAlert, Lock, Bell, FileCheck, StickyNote } from 'lucide-react'

const KIND: Record<TimelineEvent['kind'], { icon: React.ComponentType<{ className?: string }>; cls: string }> = {
  detect: { icon: ShieldAlert, cls: 'bg-critical-soft text-critical' },
  triage: { icon: Activity, cls: 'bg-info-soft text-info' },
  contain: { icon: Lock, cls: 'bg-high-soft text-high' },
  notify: { icon: Bell, cls: 'bg-medium-soft text-medium' },
  evidence: { icon: FileCheck, cls: 'bg-ok-soft text-ok' },
  note: { icon: StickyNote, cls: 'bg-muted text-muted-foreground' },
}

function actorLabel(actor: string) {
  return PEOPLE_BY_ID[actor] ? personName(actor) : actor
}

/** `showDate` adds the calendar date beside the time — an incident timeline runs
 *  within a day, but a risk lifecycle spans months and reads wrong without it. */
export function Timeline({ events, className, showDate = false }: { events: TimelineEvent[]; className?: string; showDate?: boolean }) {
  return (
    <ol className={cn('relative space-y-0', className)}>
      {events.map((e, i) => {
        const k = KIND[e.kind]
        const Icon = k.icon
        const last = i === events.length - 1
        return (
          <li key={i} className="relative flex gap-3 pb-4 last:pb-0">
            {!last && <span className="absolute left-[13px] top-7 h-full w-px bg-border" />}
            <div className={cn('z-10 flex size-7 shrink-0 items-center justify-center rounded-full ring-4 ring-background', k.cls)}>
              <Icon className="size-3.5" />
            </div>
            <div className="min-w-0 flex-1 pt-0.5">
              <div className="flex items-center gap-2">
                {showDate && <span className="font-mono text-2xs font-semibold tabular-nums text-foreground">{fmtDate(e.at)}</span>}
                <span className="font-mono text-2xs font-semibold tabular-nums text-foreground">{fmtTime(e.at)}</span>
                <span className="text-2xs text-muted-foreground">IST</span>
                <span className="rounded bg-muted px-1.5 py-0 text-2xs font-medium text-muted-foreground">{e.channel}</span>
              </div>
              <p className="mt-0.5 text-sm leading-snug text-foreground">{e.text}</p>
              <div className="mt-0.5 text-2xs text-muted-foreground" title={fmtIST(e.at)}>
                {actorLabel(e.actor)}
              </div>
            </div>
          </li>
        )
      })}
    </ol>
  )
}
