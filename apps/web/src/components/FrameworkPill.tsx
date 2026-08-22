import { cn } from '@/lib/utils'
import type { Framework } from '@/types'

const FW: Record<Framework, { short: string; cls: string }> = {
  'ISO 27001': { short: 'ISO 27001', cls: 'bg-[#eef2ff] text-[#4338ca] border-[#c7d2fe]' },
  'NIST CSF': { short: 'NIST CSF', cls: 'bg-[#ecfeff] text-[#0e7490] border-[#a5f3fc]' },
  'PCI DSS': { short: 'PCI DSS', cls: 'bg-[#f5f3ff] text-[#6d28d9] border-[#ddd6fe]' },
  'PFRDA ICS': { short: 'PFRDA ICS', cls: 'bg-[#f0fdfa] text-[#0f766e] border-[#99f6e4]' },
}

export function FrameworkPill({
  framework,
  refText,
  className,
}: {
  framework: Framework
  refText?: string
  className?: string
}) {
  const f = FW[framework]
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-2xs font-medium tnum',
        f.cls,
        className,
      )}
      title={refText ? `${framework} ${refText}` : framework}
    >
      {f.short}
      {refText && <span className="opacity-70">·{refText}</span>}
    </span>
  )
}

export function FrameworkPills({
  frameworks,
  max,
  className,
}: {
  frameworks: Framework[]
  max?: number
  className?: string
}) {
  const shown = max ? frameworks.slice(0, max) : frameworks
  const rest = max ? frameworks.length - shown.length : 0
  return (
    <div className={cn('flex flex-wrap items-center gap-1', className)}>
      {shown.map((f) => (
        <FrameworkPill key={f} framework={f} />
      ))}
      {rest > 0 && (
        <span className="text-2xs font-medium text-muted-foreground">+{rest}</span>
      )}
    </div>
  )
}
