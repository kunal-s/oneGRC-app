import { useNavigate } from 'react-router-dom'
import { ArrowUpRight, Network } from 'lucide-react'
import { cn } from '@/lib/utils'
import { resolveEntity } from '@/lib/entity'

interface RefGroup {
  label: string
  ids: string[]
}

/** "Where this also appears" — a record's cross-references to other modules. */
export function CrossRefPanel({
  groups,
  title = 'Where this also appears',
  className,
}: {
  groups: RefGroup[]
  title?: string
  className?: string
}) {
  const navigate = useNavigate()
  const nonEmpty = groups.filter((g) => g.ids.length > 0)
  return (
    <div className={cn('card-surface p-3.5', className)}>
      <div className="mb-2 flex items-center gap-1.5">
        <Network className="size-4 text-info" />
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      </div>
      <div className="mt-3 space-y-3">
        {nonEmpty.map((g) => (
          <div key={g.label}>
            <div className="mb-1 text-2xs font-semibold uppercase tracking-wide text-muted-foreground">
              {g.label} · {g.ids.length}
            </div>
            <div className="space-y-1">
              {g.ids.slice(0, 6).map((id) => {
                const e = resolveEntity(id)
                return (
                  <button
                    key={id}
                    onClick={() => navigate(e.route)}
                    className="group flex w-full items-center gap-2 rounded-md border border-border bg-background px-2 py-1.5 text-left transition-colors hover:border-info/40 hover:bg-info-soft/40"
                  >
                    <span className="font-mono text-2xs font-semibold text-info">{id}</span>
                    <span className="min-w-0 flex-1 truncate text-xs text-foreground">{e.label}</span>
                    <ArrowUpRight className="size-3 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                  </button>
                )
              })}
              {g.ids.length > 6 && (
                <div className="pl-2 text-2xs text-muted-foreground">+{g.ids.length - 6} more</div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
