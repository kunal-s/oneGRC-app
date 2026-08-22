import * as React from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronRight, ScrollText, BookText, ShieldCheck, FileText, ClipboardCheck, Paperclip, AlertTriangle, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ChainKind, ProofNode } from '@/lib/proofChain'

const ICON: Record<ChainKind, LucideIcon> = {
  SRC: ScrollText,
  POL: BookText,
  RISK: AlertTriangle,
  CTRL: ShieldCheck,
  OBL: FileText,
  TSK: ClipboardCheck,
  EVD: Paperclip,
}

/**
 * The canonical proof-chain strip — source/policy -> control -> obligation ->
 * task -> evidence — rendered identically on every record screen. Each populated
 * node is an active link; the current screen's own node is highlighted. When a
 * node fans out to several siblings, "+N" opens a popover of jump-links.
 */
export function ProofChain({ nodes, className, dataTour }: { nodes: ProofNode[]; className?: string; dataTour?: string }) {
  return (
    <div data-tour={dataTour} className={cn('card-surface p-3.5', className)}>
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-2xs font-semibold uppercase tracking-wide text-muted-foreground">Proof chain</h3>
      </div>
      <div className="flex flex-wrap items-stretch gap-1.5">
        {nodes.map((n, i) => (
          <React.Fragment key={n.kind}>
            {i > 0 && <Arrow />}
            <ChainNode node={n} />
          </React.Fragment>
        ))}
      </div>
    </div>
  )
}

function Arrow() {
  return (
    <span className="flex items-center text-muted-foreground">
      <ChevronRight className="size-4" />
    </span>
  )
}

function ChainNode({ node }: { node: ProofNode }) {
  const navigate = useNavigate()
  const Icon = ICON[node.kind]
  const [open, setOpen] = React.useState(false)
  const ref = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as globalThis.Node)) setOpen(false)
    }
    window.addEventListener('mousedown', onDown)
    return () => window.removeEventListener('mousedown', onDown)
  }, [open])

  const clickable = !node.current && !!node.route && !!node.id
  const more = node.more ?? []

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => clickable && node.route && navigate(node.route)}
        disabled={!clickable}
        className={cn(
          'flex min-w-[130px] flex-col gap-0.5 rounded-md border px-2.5 py-1.5 text-left transition-colors',
          node.current
            ? 'border-primary bg-primary/10'
            : node.id
              ? cn('border-border bg-background', clickable && 'hover:border-info/40 hover:bg-info-soft/40')
              : 'border-dashed border-border bg-muted/30',
          !clickable && 'cursor-default',
        )}
      >
        <span className="flex items-center gap-1 text-2xs font-medium uppercase tracking-wide text-muted-foreground">
          <Icon className="size-3.5" /> {node.label}
        </span>
        <span className={cn('flex items-center gap-1 font-mono text-2xs font-semibold', node.id ? 'text-info' : 'text-muted-foreground')}>
          <span className="truncate">{node.id ?? node.placeholder ?? '—'}</span>
          {more.length > 0 ? (
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => { e.stopPropagation(); setOpen((v) => !v) }}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); setOpen((v) => !v) } }}
              className="rounded bg-muted px-1 py-0 text-2xs font-semibold text-muted-foreground hover:bg-info-soft hover:text-info"
            >
              +{more.length}
            </span>
          ) : node.extra && node.extra > 0 ? (
            <span className="text-muted-foreground">+{node.extra}</span>
          ) : null}
        </span>
      </button>
      {open && more.length > 0 && (
        <div className="absolute left-0 top-full z-20 mt-1 w-56 rounded-md border border-border bg-background p-1 shadow-md">
          {more.map((m) => (
            <button
              key={m.id}
              onClick={() => { setOpen(false); navigate(m.route) }}
              className="flex w-full items-center gap-1.5 rounded px-2 py-1 text-left text-2xs hover:bg-info-soft/40"
            >
              <span className="font-mono font-semibold text-info">{m.id}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
