import { ScrollText, ArrowUpRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getSource } from '@/data'
import { refDisplayTitle } from '@/lib/sources'
import { useApp } from '@/store'

/** Open the read-only source viewer drawer for a SourceReference (provision) id. */
function useOpenSource() {
  const openDrawer = useApp((s) => s.openDrawer)
  return (id: string) => {
    openDrawer({ kind: 'source-viewer', title: refDisplayTitle(id), payload: { sourceId: id } })
  }
}

/**
 * "Source" affordance — lists the instruments a record derives from. Each row
 * opens the source viewer (snippet, citation, link + reverse lookup).
 */
export function SourceList({ ids, className }: { ids: string[]; className?: string }) {
  const open = useOpenSource()
  const sources = ids.map((id) => getSource(id)).filter(Boolean)
  if (sources.length === 0) return null
  return (
    <div className={cn('space-y-1', className)}>
      {sources.map((s) => (
        <button
          key={s!.id}
          onClick={() => open(s!.id)}
          className="group flex w-full items-start gap-2 rounded-md border border-border bg-background px-2 py-1.5 text-left transition-colors hover:border-info/40 hover:bg-info-soft/40"
        >
          <ScrollText className="mt-0.5 size-3.5 shrink-0 text-info" />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-xs font-medium text-foreground">{s!.title}</span>
            <span className="block truncate text-2xs text-muted-foreground">{s!.citation}</span>
          </span>
          <ArrowUpRight className="mt-0.5 size-3 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </button>
      ))}
    </div>
  )
}

/** Compact inline "View source" chip — for dense contexts (e.g. control mappings). */
export function SourceChip({ id }: { id: string }) {
  const open = useOpenSource()
  const s = getSource(id)
  if (!s) return null
  return (
    <button
      onClick={() => open(id)}
      title={s.citation}
      className="inline-flex items-center gap-1 rounded bg-muted px-1.5 py-0.5 text-2xs font-medium text-muted-foreground transition-colors hover:bg-info-soft hover:text-info"
    >
      <ScrollText className="size-3" /> Source
    </button>
  )
}
