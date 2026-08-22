import * as React from 'react'
import { cn } from '@/lib/utils'
import { Section } from './Section'
import type { StatTone } from './StatGroup'

const DOT: Record<StatTone, string> = {
  neutral: 'bg-muted-foreground/50',
  ok: 'bg-ok',
  warn: 'bg-medium',
  danger: 'bg-critical',
  info: 'bg-info',
}

export interface ListGroup<T> {
  key: string
  label: string
  tone?: StatTone
  items: T[]
  hint?: React.ReactNode
  defaultOpen?: boolean
}

/**
 * Segments a flat list into collapsible groups with per-group counts - the
 * antidote to wide flat tables (docs/onegrc-ux-audit.md). Each group renders via
 * Section so it can be opened/closed; empty groups are dropped.
 */
export function GroupedList<T>({
  groups,
  renderItem,
  className,
}: {
  groups: ListGroup<T>[]
  renderItem: (item: T, index: number) => React.ReactNode
  className?: string
}) {
  const live = groups.filter((g) => g.items.length > 0)
  return (
    <div className={cn('space-y-2', className)}>
      {live.map((g) => (
        <Section
          key={g.key}
          defaultOpen={g.defaultOpen ?? true}
          count={g.items.length}
          icon={<span className={cn('size-2 rounded-full', DOT[g.tone ?? 'neutral'])} />}
          title={g.label}
          right={g.hint}
        >
          <div className="divide-y divide-border/70">
            {g.items.map((item, i) => renderItem(item, i))}
          </div>
        </Section>
      ))}
    </div>
  )
}
