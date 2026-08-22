import * as React from 'react'
import { cn } from '@/lib/utils'

export type StatTone = 'neutral' | 'ok' | 'warn' | 'danger' | 'info'

const BAR: Record<StatTone, string> = {
  neutral: 'bg-primary',
  ok: 'bg-ok',
  warn: 'bg-medium',
  danger: 'bg-critical',
  info: 'bg-info',
}
const VALUE: Record<StatTone, string> = {
  neutral: 'text-foreground',
  ok: 'text-ok',
  warn: 'text-medium',
  danger: 'text-critical',
  info: 'text-info',
}

export interface Stat {
  label: string
  value: React.ReactNode
  sub?: React.ReactNode
  tone?: StatTone
  icon?: React.ReactNode
  onClick?: () => void
}

/**
 * Compact summary band for the top of a list/detail screen. Lighter than KpiTile
 * (which is for dashboards); use this to open every list page with altitude
 * before the working surface (docs/onegrc-ux-audit.md, design language).
 */
export function StatGroup({ stats, className }: { stats: Stat[]; className?: string }) {
  return (
    <div className={cn('grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4', className)}>
      {stats.map((s, i) => {
        const interactive = !!s.onClick
        return (
          <div
            key={i}
            onClick={s.onClick}
            role={interactive ? 'button' : undefined}
            tabIndex={interactive ? 0 : undefined}
            onKeyDown={(e) => interactive && (e.key === 'Enter' || e.key === ' ') && s.onClick?.()}
            className={cn(
              'card-surface relative overflow-hidden px-3 py-2.5',
              interactive && 'cursor-pointer transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            )}
          >
            <span className={cn('absolute inset-y-0 left-0 w-0.5', BAR[s.tone ?? 'neutral'])} />
            <div className="flex items-center gap-1.5 text-2xs font-medium uppercase tracking-wide text-muted-foreground">
              {s.icon}
              <span className="truncate">{s.label}</span>
            </div>
            <div className={cn('mt-1 text-xl font-semibold tracking-tight tnum', VALUE[s.tone ?? 'neutral'])}>
              {s.value}
            </div>
            {s.sub && <div className="mt-0.5 truncate text-2xs text-muted-foreground">{s.sub}</div>}
          </div>
        )
      })}
    </div>
  )
}
