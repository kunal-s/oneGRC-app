import * as React from 'react'
import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Sparkline } from './Sparkline'

type Tone = 'neutral' | 'ok' | 'warn' | 'danger' | 'info'

const TONE_ACCENT: Record<Tone, string> = {
  neutral: 'text-foreground',
  ok: 'text-ok',
  warn: 'text-medium',
  danger: 'text-critical',
  info: 'text-info',
}
const TONE_BAR: Record<Tone, string> = {
  neutral: 'bg-primary',
  ok: 'bg-ok',
  warn: 'bg-medium',
  danger: 'bg-critical',
  info: 'bg-info',
}

export function KpiTile({
  label,
  value,
  unit,
  sub,
  icon,
  tone = 'neutral',
  trend,
  trendLabel,
  spark,
  sparkColor,
  onClick,
  live,
  className,
}: {
  label: string
  value: React.ReactNode
  unit?: string
  sub?: React.ReactNode
  icon?: React.ReactNode
  tone?: Tone
  trend?: 'up' | 'down' | 'flat'
  trendLabel?: string
  spark?: number[]
  sparkColor?: string
  onClick?: () => void
  live?: boolean
  className?: string
}) {
  const TrendIcon = trend === 'up' ? ArrowUpRight : trend === 'down' ? ArrowDownRight : Minus
  const interactive = !!onClick
  return (
    <div
      onClick={onClick}
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
      onKeyDown={(e) => {
        if (interactive && (e.key === 'Enter' || e.key === ' ')) onClick?.()
      }}
      className={cn(
        'card-surface group relative overflow-hidden p-3.5 animate-slide-up',
        interactive && 'cursor-pointer transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        className,
      )}
    >
      <span className={cn('absolute inset-y-0 left-0 w-0.5', TONE_BAR[tone])} />
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          {icon}
          <span>{label}</span>
          {live && (
            <span className="ml-0.5 inline-flex items-center gap-1 text-2xs font-semibold text-critical">
              <span className="size-1.5 animate-pulse rounded-full bg-critical" />
              LIVE
            </span>
          )}
        </div>
        {spark && <Sparkline data={spark} color={sparkColor ?? 'hsl(var(--info))'} width={64} height={22} />}
      </div>
      <div className="mt-2 flex items-baseline gap-1">
        <span className={cn('text-2xl font-semibold tracking-tight tnum', TONE_ACCENT[tone])}>{value}</span>
        {unit && <span className="text-sm font-medium text-muted-foreground">{unit}</span>}
        {trend && trendLabel && (
          <span
            className={cn(
              'ml-1 inline-flex items-center gap-0.5 text-xs font-medium',
              trend === 'up' ? 'text-critical' : trend === 'down' ? 'text-ok' : 'text-muted-foreground',
            )}
          >
            <TrendIcon className="size-3.5" />
            {trendLabel}
          </span>
        )}
      </div>
      {sub && <div className="mt-1 text-xs text-muted-foreground">{sub}</div>}
    </div>
  )
}
