import { useQuery } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import { api } from '@/api/client'
import { ErrorNote } from './SourceLibrary'
import { ProofChain } from './ProofChain'

interface Obligation {
  id: string; title: string; shortTitle: string; regulator: string; frequency: string
  evidenceRequirement: string | null
  owner: { fullName: string; department: string }
  checker: { fullName: string } | null
  provenance: { clauseId: string; clauseRef: string; instrument: string } | null
  controls: Array<{ id: string; shortTitle: string }>
  cycles: Array<{
    id: string; period: string; dueDate: string; state: string; overdue: boolean
    tasks: Array<{
      id: string; shortTitle: string; state: string; completionPolicy: string
      assignee: string; checker: string | null
      evidence: Array<{ id: string; shortTitle: string; state: string }>
    }>
  }>
}

export function ObligationDetail() {
  const { id = '' } = useParams()
  const { data, isLoading, error } = useQuery({
    queryKey: ['obligation', id],
    queryFn: () => api.get<Obligation>(`/obligations/${id}`),
  })

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading…</p>
  if (error) return <ErrorNote error={error} />
  if (!data) return null

  return (
    <div className="max-w-4xl space-y-5">
      <div>
        <h1 className="text-lg font-semibold text-foreground">{data.title}</h1>
        <p className="text-2xs text-muted-foreground">
          <span className="font-mono text-info">{data.id}</span> · {data.regulator} · {data.frequency}
          {' · owner '}{data.owner.fullName}
          {data.checker && <> · checker {data.checker.fullName}</>}
        </p>
      </div>

      <ProofChain anchor={data.id} />

      {data.provenance && (
        <p className="text-xs text-muted-foreground">
          Why this duty exists:{' '}
          <Link to={`/sources/clause/${data.provenance.clauseId}`} className="text-info hover:underline">
            {data.provenance.instrument} {data.provenance.clauseRef}
          </Link>
        </p>
      )}

      {data.evidenceRequirement && (
        <section className="rounded-lg border border-border p-3">
          <h2 className="mb-1 text-2xs font-semibold uppercase tracking-wide text-muted-foreground">
            Evidence required
          </h2>
          <p className="text-xs text-foreground">{data.evidenceRequirement}</p>
        </section>
      )}

      <section>
        <h2 className="mb-2 text-sm font-semibold text-foreground">Cycles</h2>
        <div className="space-y-2">
          {data.cycles.map((c) => (
            <div key={c.id} className="rounded-lg border border-border p-3">
              <div className="flex items-baseline justify-between">
                <span className="text-sm font-medium text-foreground">{c.period}</span>
                <span className="text-2xs text-muted-foreground">
                  due {new Date(c.dueDate).toLocaleDateString()} ·{' '}
                  <b className={c.overdue ? 'text-critical' : 'text-foreground'}>
                    {c.overdue ? `${c.state} — overdue` : c.state}
                  </b>
                </span>
              </div>
              {c.tasks.map((t) => (
                <div key={t.id} className="mt-2 border-t border-border pt-2 text-xs">
                  <div className="flex items-baseline justify-between">
                    <span>
                      <span className="font-mono text-2xs text-info">{t.id}</span> {t.shortTitle}
                    </span>
                    <span className="text-muted-foreground">
                      {t.state} · {t.assignee}
                      {t.checker && <> → {t.checker}</>}
                    </span>
                  </div>
                  {t.evidence.length > 0 && (
                    <ul className="mt-1 space-y-0.5 pl-3">
                      {t.evidence.map((e) => (
                        <li key={e.id} className="text-2xs text-muted-foreground">
                          <span className="font-mono text-info">{e.id}</span> {e.shortTitle} ·{' '}
                          <b className={e.state === 'Verified' ? 'text-ok' : 'text-foreground'}>{e.state}</b>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
