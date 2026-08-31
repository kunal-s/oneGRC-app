import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import { getProofChain } from '@/api/functions'

const KIND_LABEL: Record<string, string> = {
  clause: 'Source clause',
  control: 'Control',
  obligation: 'Obligation',
  cycle: 'Cycle',
  task: 'Task',
  evidence: 'Evidence',
}

/**
 * The spine, from one renderer.
 *
 * Spec 2 makes this a requirement rather than a detail: the chain must look
 * identical on a clause page, a control page and a task page, so no screen can
 * drift into its own slightly different picture of the same record.
 */
export function ProofChain({ anchor }: { anchor: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ['proof-chain', anchor],
    queryFn: () => getProofChain(anchor),
  })

  if (isLoading || !data || data.length === 0) return null

  return (
    <section>
      <h2 className="mb-1.5 text-2xs font-semibold uppercase tracking-wide text-muted-foreground">
        Proof chain
      </h2>
      <ol className="flex flex-wrap items-stretch gap-1">
        {data.map((n, i) => (
          <li key={n.id} className="flex items-stretch gap-1">
            <Link
              to={n.route}
              className={`flex min-w-[9rem] max-w-[13rem] flex-col rounded border px-2 py-1.5 ${
                n.current
                  ? 'border-info bg-info-soft'
                  : 'border-border hover:border-info/50 hover:bg-muted/40'
              }`}
            >
              <span className="text-2xs uppercase tracking-wide text-muted-foreground">
                {KIND_LABEL[n.kind] ?? n.kind}
              </span>
              <span className="truncate font-mono text-2xs font-semibold text-info">{n.id}</span>
              <span className="truncate text-xs text-foreground" title={n.label}>
                {n.label}
              </span>
              {n.sub && <span className="truncate text-2xs text-muted-foreground">{n.sub}</span>}
            </Link>
            {i < data.length - 1 && (
              <ChevronRight className="size-3 shrink-0 self-center text-muted-foreground" />
            )}
          </li>
        ))}
      </ol>
      <p className="mt-1 text-2xs text-muted-foreground">
        Every link is navigable in both directions: why this duty exists, and what this clause
        produced.
      </p>
    </section>
  )
}
