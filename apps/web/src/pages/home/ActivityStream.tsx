import { useNavigate } from 'react-router-dom'
import {
  AlertOctagon, CheckCircle2, GitPullRequestArrow, FileCheck, DatabaseZap,
  Siren, CalendarClock, BadgeCheck, ClipboardCheck, FileText,
} from 'lucide-react'
import { WORLD } from '@/data'
import { fmtIST, fmtTime, fmtRelative } from '@/lib/time'
import type { ActivityItem } from '@/types'

const ICON: Record<ActivityItem['kind'], { icon: React.ComponentType<{ className?: string }>; cls: string }> = {
  'ccm-fail': { icon: AlertOctagon, cls: 'bg-critical-soft text-critical' },
  'ccm-pass': { icon: CheckCircle2, cls: 'bg-ok-soft text-ok' },
  'reg-change': { icon: GitPullRequestArrow, cls: 'bg-info-soft text-info' },
  evidence: { icon: FileCheck, cls: 'bg-ok-soft text-ok' },
  dsar: { icon: DatabaseZap, cls: 'bg-medium-soft text-medium' },
  incident: { icon: Siren, cls: 'bg-critical-soft text-critical' },
  obligation: { icon: CalendarClock, cls: 'bg-info-soft text-info' },
  approval: { icon: BadgeCheck, cls: 'bg-ok-soft text-ok' },
  audit: { icon: ClipboardCheck, cls: 'bg-medium-soft text-medium' },
  policy: { icon: FileText, cls: 'bg-muted text-muted-foreground' },
}

export function ActivityStream() {
  const navigate = useNavigate()
  return (
    <div className="card-surface flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
        <h2 className="text-sm font-semibold text-foreground">Cross-domain activity</h2>
        <span className="text-2xs tnum text-muted-foreground">{WORLD.activity.length} events</span>
      </div>
      <div className="scrollbar-thin max-h-[420px] divide-y divide-border/70 overflow-y-auto">
        {WORLD.activity.map((a) => {
          const k = ICON[a.kind]
          const Icon = k.icon
          return (
            <button
              key={a.id}
              onClick={() => navigate(a.route)}
              className="flex w-full items-start gap-3 px-4 py-2.5 text-left transition-colors hover:bg-info-soft/30"
            >
              <div className={`mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-md ${k.cls}`}>
                <Icon className="size-3.5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs leading-snug text-foreground">{a.text}</p>
                <div className="mt-0.5 flex items-center gap-2 text-2xs text-muted-foreground">
                  <span className="font-mono font-semibold text-info">{a.ref}</span>
                  <span>·</span>
                  <span>{a.actor}</span>
                  <span>·</span>
                  <span title={fmtIST(a.at)}>
                    {fmtTime(a.at)} IST · {fmtRelative(a.at)}
                  </span>
                </div>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
