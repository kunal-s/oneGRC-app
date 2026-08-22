import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface SavedView {
  id: string
  label: string
  count?: number
}

/**
 * Named filter presets shown as a segmented pill row above a list. Lets a persona
 * jump to "Failing", "Mine", "Overdue" etc. without rebuilding filters each time.
 */
export function SavedViews({
  views,
  active,
  onSelect,
  className,
}: {
  views: SavedView[]
  active: string
  onSelect: (id: string) => void
  className?: string
}) {
  return (
    <div className={cn('flex flex-wrap items-center gap-1.5', className)}>
      {views.map((v) => {
        const on = v.id === active
        return (
          <button
            key={v.id}
            onClick={() => onSelect(v.id)}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors',
              on
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground',
            )}
          >
            {v.label}
            {typeof v.count === 'number' && (
              <span className={cn('tnum', on ? 'text-primary-foreground/80' : 'text-muted-foreground')}>{v.count}</span>
            )}
          </button>
        )
      })}
    </div>
  )
}

export interface ActiveChip {
  id: string
  label: string
}

/** Visible chips for the currently applied filters, each removable. */
export function FilterChips({
  chips,
  onClear,
  onClearAll,
  className,
}: {
  chips: ActiveChip[]
  onClear: (id: string) => void
  onClearAll?: () => void
  className?: string
}) {
  if (chips.length === 0) return null
  return (
    <div className={cn('flex flex-wrap items-center gap-1.5', className)}>
      {chips.map((c) => (
        <span key={c.id} className="inline-flex items-center gap-1 rounded-md border border-border bg-muted px-2 py-0.5 text-2xs font-medium text-foreground">
          {c.label}
          <button onClick={() => onClear(c.id)} className="text-muted-foreground hover:text-foreground">
            <X className="size-3" />
          </button>
        </span>
      ))}
      {onClearAll && chips.length > 1 && (
        <button onClick={onClearAll} className="text-2xs font-medium text-info hover:underline">
          Clear all
        </button>
      )}
    </div>
  )
}
