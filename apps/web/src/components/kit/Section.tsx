import * as React from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * A collapsible, titled content block - the progressive-disclosure primitive for
 * detail pages and grouped lists. Defaults to open; collapses to reduce density.
 */
export function Section({
  title,
  subtitle,
  icon,
  right,
  count,
  defaultOpen = true,
  collapsible = true,
  children,
  className,
}: {
  title: React.ReactNode
  subtitle?: React.ReactNode
  icon?: React.ReactNode
  right?: React.ReactNode
  count?: number
  defaultOpen?: boolean
  collapsible?: boolean
  children: React.ReactNode
  className?: string
}) {
  const [open, setOpen] = React.useState(defaultOpen)
  const isOpen = collapsible ? open : true
  return (
    <section className={cn('card-surface overflow-hidden', className)}>
      <div className="flex items-center gap-2 px-3.5 py-2.5">
        <button
          type="button"
          disabled={!collapsible}
          onClick={() => collapsible && setOpen((o) => !o)}
          className={cn('flex min-w-0 flex-1 items-center gap-2 text-left', collapsible && 'cursor-pointer')}
        >
          {collapsible && (
            <ChevronDown className={cn('size-4 shrink-0 text-muted-foreground transition-transform', !isOpen && '-rotate-90')} />
          )}
          {icon}
          <span className="truncate text-sm font-semibold text-foreground">{title}</span>
          {typeof count === 'number' && (
            <span className="shrink-0 rounded-full bg-muted px-1.5 py-0 text-2xs font-semibold tnum text-muted-foreground">{count}</span>
          )}
          {subtitle && <span className="truncate text-2xs text-muted-foreground">{subtitle}</span>}
        </button>
        {right && <div className="shrink-0">{right}</div>}
      </div>
      {isOpen && <div className="border-t border-border/70">{children}</div>}
    </section>
  )
}
