import { cn } from '@/lib/utils'
import type { Severity } from '@/types'

const MAP: Record<Severity, { label: string; cls: string }> = {
  Critical: { label: 'Critical', cls: 'bg-critical-soft text-critical border-critical/30' },
  High: { label: 'High', cls: 'bg-high-soft text-high border-high/30' },
  Medium: { label: 'Medium', cls: 'bg-medium-soft text-medium border-medium/40' },
  Low: { label: 'Low', cls: 'bg-low-soft text-low border-low/30' },
}

export function SeverityBadge({
  severity,
  className,
  dense,
}: {
  severity: Severity
  className?: string
  dense?: boolean
}) {
  const m = MAP[severity]
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded border font-medium',
        dense ? 'px-1.5 py-0 text-2xs' : 'px-2 py-0.5 text-xs',
        m.cls,
        className,
      )}
    >
      <span className="size-1.5 rounded-full bg-current" />
      {m.label}
    </span>
  )
}
