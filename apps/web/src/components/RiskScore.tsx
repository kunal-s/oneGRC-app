import { cn } from '@/lib/utils'

export function scoreBand(score: number): 'Low' | 'Medium' | 'High' | 'Critical' {
  if (score >= 15) return 'Critical'
  if (score >= 10) return 'High'
  if (score >= 5) return 'Medium'
  return 'Low'
}

const BAND_CLS: Record<string, string> = {
  Critical: 'bg-critical-soft text-critical border-critical/30',
  High: 'bg-high-soft text-high border-high/30',
  Medium: 'bg-medium-soft text-medium border-medium/40',
  Low: 'bg-ok-soft text-ok border-ok/30',
}

/** Numeric risk score (1-25) rendered as a banded badge. */
export function ScoreBadge({ score, hollow, className }: { score: number; hollow?: boolean; className?: string }) {
  const band = scoreBand(score)
  return (
    <span
      className={cn(
        'inline-flex h-6 min-w-[1.75rem] items-center justify-center rounded border px-1.5 text-xs font-semibold tnum',
        hollow ? 'bg-background text-foreground border-border' : BAND_CLS[band],
        className,
      )}
      title={`${band} · ${score}/25`}
    >
      {score}
    </span>
  )
}
