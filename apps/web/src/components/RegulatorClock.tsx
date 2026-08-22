import { cn } from '@/lib/utils'
import { countdownTo } from '@/lib/time'
import { useLiveNow } from '@/lib/useInterval'
import type { RegulatorTrack } from '@/types'

function toneForRemaining(windowHours: number, remainingMs: number, status: RegulatorTrack['status']) {
  if (status === 'Filed') return 'filed' as const
  if (remainingMs < 0) return 'breached' as const
  const frac = remainingMs / (windowHours * 3600000)
  if (frac < 0.25) return 'critical' as const
  if (frac < 0.5) return 'warn' as const
  return 'ok' as const
}

const TONE_STYLES = {
  ok: { text: 'text-ok', bar: 'bg-ok', ring: 'border-ok/30 bg-ok-soft' },
  warn: { text: 'text-medium', bar: 'bg-medium', ring: 'border-medium/40 bg-medium-soft' },
  critical: { text: 'text-critical', bar: 'bg-critical', ring: 'border-critical/40 bg-critical-soft' },
  breached: { text: 'text-critical', bar: 'bg-critical', ring: 'border-critical/40 bg-critical-soft' },
  filed: { text: 'text-ok', bar: 'bg-ok', ring: 'border-ok/30 bg-ok-soft' },
}

/** Compact inline countdown (e.g. context strip / KPI). */
export function RegulatorClockInline({ track, className }: { track: RegulatorTrack; className?: string }) {
  const now = useLiveNow()
  const cd = countdownTo(track.deadline, now)
  const tone = toneForRemaining(track.windowHours, cd.ms, track.status)
  const s = TONE_STYLES[tone]
  return (
    <span className={cn('tnum font-semibold', s.text, className)}>{cd.label}</span>
  )
}

/** Full clock card with progress and metadata — used on /clocks and incident detail. */
export function RegulatorClock({ track, className }: { track: RegulatorTrack; className?: string }) {
  const now = useLiveNow()
  const cd = countdownTo(track.deadline, now)
  const tone = toneForRemaining(track.windowHours, cd.ms, track.status)
  const s = TONE_STYLES[tone]
  const elapsed = now - new Date(track.clockStartedAt).getTime()
  const frac = Math.min(1, Math.max(0, elapsed / (track.windowHours * 3600000)))

  return (
    <div className={cn('rounded-lg border p-3.5', s.ring, className)}>
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold text-foreground">{track.regulator}</div>
        <span className={cn('text-2xs font-semibold uppercase tracking-wide', s.text)}>
          {track.status === 'Filed' ? 'Filed' : cd.breached ? 'Breached' : track.status}
        </span>
      </div>
      <div className="mt-0.5 text-xs text-muted-foreground">{track.clockLabel}</div>
      <div className={cn('mt-2.5 font-mono text-2xl font-semibold tnum tabular-nums', s.text)}>
        {track.status === 'Filed' ? '✓ Filed' : cd.label}
      </div>
      <div className="mt-0.5 text-2xs text-muted-foreground">
        {cd.breached ? 'past deadline' : 'remaining'} · {track.windowHours}h window
      </div>
      <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-border/70">
        <div className={cn('h-full rounded-full transition-all', s.bar)} style={{ width: `${frac * 100}%` }} />
      </div>
      <div className="mt-2 text-2xs leading-snug text-muted-foreground">
        <span className="font-medium text-foreground/80">Output:</span> {track.output}
      </div>
    </div>
  )
}
