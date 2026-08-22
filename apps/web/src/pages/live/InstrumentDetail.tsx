import { useQuery } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import { ExternalLink, Flag } from 'lucide-react'
import { api } from '@/api/client'
import type { InstrumentDetail as Detail } from '@/api/types'
import { EmptyState, ErrorNote } from './SourceLibrary'

export function InstrumentDetail() {
  const { id = '' } = useParams()
  const { data, isLoading, error } = useQuery({
    queryKey: ['instrument', id],
    queryFn: () => api.get<Detail>(`/instruments/${id}`),
  })

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading…</p>
  if (error) return <ErrorNote error={error} />
  if (!data) return null

  const sections = data.clauses.filter((c) => !c.parentId)

  return (
    <div className="space-y-5">
      <div>
        <Link to="/sources" className="text-2xs text-muted-foreground hover:underline">
          ← Source Library
        </Link>
        <h1 className="mt-1 text-xl font-semibold text-foreground">{data.title}</h1>
        <p className="text-sm text-muted-foreground">
          <span className="font-mono text-2xs font-semibold text-info">{data.id}</span>
          {data.citation && <> · {data.citation}</>} · {data.authority}
        </p>
      </div>

      {/* Provenance: where this came from, and proof it has not changed. */}
      <section className="rounded-lg border border-border p-3">
        <h2 className="mb-2 text-2xs font-semibold uppercase tracking-wide text-muted-foreground">
          Provenance
        </h2>
        <dl className="grid gap-x-6 gap-y-1 text-xs sm:grid-cols-2">
          <Row label="Retrieved">
            {data.provenance.retrievalMethod === 'fetched' ? 'Fetched from source' : 'Manual upload'}
            {data.provenance.retrievedAt && ` · ${new Date(data.provenance.retrievedAt).toLocaleDateString()}`}
          </Row>
          <Row label="Text layer">
            {data.provenance.textLayer === 'ocr' ? 'OCR scan — extraction less reliable' : 'Born digital'}
          </Row>
          <Row label="Pages">{data.provenance.pageCount ?? '—'}</Row>
          <Row label="SHA-256">
            <span className="font-mono text-2xs">{data.provenance.sha256?.slice(0, 24)}…</span>
          </Row>
          {data.provenance.sourceUrl && (
            <Row label="Source">
              <a href={data.provenance.sourceUrl} target="_blank" rel="noreferrer"
                 className="inline-flex items-center gap-1 text-info hover:underline">
                official source <ExternalLink className="size-3" />
              </a>
            </Row>
          )}
          <Row label="Document">
            <a href={api.url(`/instruments/${data.id}/document`)} target="_blank" rel="noreferrer"
               className="inline-flex items-center gap-1 text-info hover:underline">
              open the PDF <ExternalLink className="size-3" />
            </a>
          </Row>
        </dl>
      </section>

      {data.relations.length > 0 && (
        <section className="rounded-lg border border-border p-3">
          <h2 className="mb-2 text-2xs font-semibold uppercase tracking-wide text-muted-foreground">
            Related instruments
          </h2>
          <ul className="space-y-1 text-xs">
            {data.relations.map((r, n) => (
              <li key={n}>
                <span className="text-muted-foreground">
                  {r.direction === 'from' ? `This ${r.kind} ` : `${r.kind} this — `}
                </span>
                <Link to={`/sources/${r.other.id}`} className="text-info hover:underline">
                  {r.other.shortTitle}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <h2 className="mb-2 text-sm font-semibold text-foreground">
          Clauses <span className="font-normal text-muted-foreground">({data.clauses.length})</span>
        </h2>
        {sections.length === 0 ? (
          <EmptyState title="No clauses extracted" body="This instrument has not been through ingestion yet." />
        ) : (
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-left text-2xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="w-24 px-3 py-2 font-medium">ID</th>
                  <th className="w-20 px-3 py-2 font-medium">Ref</th>
                  <th className="px-3 py-2 font-medium">Title</th>
                  <th className="w-16 px-3 py-2 text-right font-medium">Page</th>
                  <th className="w-28 px-3 py-2 font-medium">State</th>
                  <th className="w-24 px-3 py-2 font-medium">Review</th>
                </tr>
              </thead>
              <tbody>
                {data.clauses.map((c) => (
                  <tr key={c.id} className="border-t border-border hover:bg-muted/30">
                    <td className="px-3 py-1.5">
                      <Link to={`/sources/clause/${c.id}`} className="font-mono text-2xs font-semibold text-info">
                        {c.id}
                      </Link>
                    </td>
                    <td className={`px-3 py-1.5 font-mono text-2xs ${c.parentId ? 'pl-6 text-muted-foreground' : ''}`}>
                      {c.clauseRef}
                    </td>
                    <td className="max-w-0 truncate px-3 py-1.5" title={c.shortTitle}>
                      <Link to={`/sources/clause/${c.id}`} className="hover:underline">{c.shortTitle}</Link>
                    </td>
                    <td className="px-3 py-1.5 text-right tabular-nums text-muted-foreground">{c.pageNumber ?? '—'}</td>
                    <td className="px-3 py-1.5 text-xs">{c.state}</td>
                    <td className="px-3 py-1.5">
                      {c.flagCount > 0 && (
                        <span className="inline-flex items-center gap-1 text-2xs text-medium"
                              title={c.flagKinds.join(', ')}>
                          <Flag className="size-3" /> {c.flagCount}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-2">
      <dt className="w-24 shrink-0 text-muted-foreground">{label}</dt>
      <dd className="text-foreground">{children}</dd>
    </div>
  )
}
