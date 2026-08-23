import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ExternalLink, Lock, ShieldAlert } from 'lucide-react'
import { api } from '@/api/client'
import type { ProvisionDetail as Detail } from '@/api/provision-types'
import { ErrorNote } from './SourceLibrary'

export function ProvisionDetail() {
  const { id = '' } = useParams()
  const qc = useQueryClient()
  const navigate = useNavigate()
  const [basis, setBasis] = useState('')
  const [note, setNote] = useState('')

  const { data, isLoading, error } = useQuery({
    queryKey: ['provision', id],
    queryFn: () => api.get<Detail>(`/provisions/${id}`),
  })

  const promote = useMutation({
    mutationFn: () => api.post<{ clauseId: string }>(`/provisions/${id}/promote`, { basis: basis || undefined }),
    onSuccess: (r) => {
      void qc.invalidateQueries()
      navigate(`/sources/clause/${r.clauseId}`)
    },
  })

  const resolve = useMutation({
    mutationFn: (flagId: string) =>
      api.post(`/provisions/flags/${flagId}/resolve`, { resolution: 'Resolved', note }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['provision', id] }),
  })

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading…</p>
  if (error) return <ErrorNote error={error} />
  if (!data) return null

  const pdf = api.url(`/instruments/${data.instrument.id}/document`) +
    (data.pageNumber ? `#page=${data.pageNumber}` : '')
  const open = data.flags.filter((f) => !f.resolvedAt)

  return (
    <div className="max-w-4xl space-y-5">
      <div>
        <Link to={`/sources/${data.instrument.id}`} className="text-2xs text-muted-foreground hover:underline">
          ← {data.instrument.shortTitle}
        </Link>
        <h1 className="mt-1 text-lg font-semibold text-foreground">
          <span className="font-mono text-sm text-info">{data.clauseRef}</span> — {data.heading}
        </h1>
        <p className="text-2xs text-muted-foreground">
          Not yet tracked · classified <b className="text-foreground">{spaced(data.classification)}</b>
          {data.confidence !== null && <> at {data.confidence.toFixed(2)}</>}
        </p>
      </div>

      <section>
        <div className="mb-1 flex items-baseline justify-between">
          <h2 className="text-2xs font-semibold uppercase tracking-wide text-muted-foreground">
            Verbatim extract
          </h2>
          <a href={pdf} target="_blank" rel="noreferrer"
             className="inline-flex items-center gap-1 text-2xs text-info hover:underline">
            open the source at page {data.pageNumber ?? '?'} <ExternalLink className="size-3" />
          </a>
        </div>
        <blockquote className="max-h-72 overflow-y-auto whitespace-pre-wrap rounded-lg border border-border bg-muted/20 p-3 font-serif text-sm leading-relaxed">
          {data.verbatimText.trim()}
        </blockquote>
      </section>

      <section className="rounded-lg border border-border p-3">
        <h2 className="mb-1 text-2xs font-semibold uppercase tracking-wide text-muted-foreground">
          Classification — a proposal
        </h2>
        <dl className="grid gap-x-6 gap-y-1 text-xs sm:grid-cols-2">
          <Row label="Class">{spaced(data.classification)}</Row>
          <Row label="Bearer">{data.dutyBearer ?? 'not identified'}</Row>
          <Row label="Binds us">
            <b className={data.bindsUs === 'yes' ? 'text-ok' : data.bindsUs === 'no' ? 'text-critical' : 'text-medium'}>
              {data.bindsUs}
            </b>
          </Row>
          <Row label="By">
            {data.classifier.name} v{data.classifier.version} · {data.classifier.ruleset}
          </Row>
        </dl>
        <p className="mt-1 text-2xs text-muted-foreground">
          A proposal, not a finding. Nothing is tracked until a person promotes it.
        </p>
      </section>

      {open.length > 0 && (
        <section className="rounded-lg border border-medium/40 bg-medium-soft p-3">
          <h2 className="mb-2 flex items-center gap-1.5 text-2xs font-semibold uppercase tracking-wide text-medium">
            <ShieldAlert className="size-3" /> Review items ({open.length})
          </h2>
          <input value={note} onChange={(e) => setNote(e.target.value)}
                 placeholder="How was it resolved? (required)"
                 className="mb-2 w-full rounded border border-input bg-background px-2 py-1 text-xs" />
          <ul className="space-y-1.5 text-xs">
            {open.map((f) => (
              <li key={f.id} className="flex items-start justify-between gap-3">
                <span>
                  <b className="text-foreground">{spaced(f.kind)}</b>
                  {f.blocking && <span className="ml-1 text-2xs font-semibold text-critical">BLOCKING</span>}
                  {f.detail && <span className="text-muted-foreground"> — {f.detail}</span>}
                </span>
                {data.capabilities.resolveFlag && (
                  <button onClick={() => resolve.mutate(f.id)} disabled={!note.trim() || resolve.isPending}
                          className="shrink-0 rounded border border-border px-2 py-0.5 text-2xs disabled:opacity-40">
                    resolve
                  </button>
                )}
              </li>
            ))}
          </ul>
          {resolve.error && <div className="mt-2"><ErrorNote error={resolve.error} /></div>}
        </section>
      )}

      <section className="rounded-lg border border-border p-3">
        <h2 className="mb-2 text-2xs font-semibold uppercase tracking-wide text-muted-foreground">
          Track this provision
        </h2>
        {data.promotedAs ? (
          <p className="text-xs">
            Tracked as{' '}
            <Link to={`/sources/clause/${data.promotedAs}`} className="font-mono text-info hover:underline">
              {data.promotedAs}
            </Link>
          </p>
        ) : data.promotionBlockedBy.length > 0 ? (
          <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
            <Lock className="mt-0.5 size-3 shrink-0" />
            Blocked until resolved: <b className="text-foreground">{data.promotionBlockedBy.map(spaced).join(', ')}</b>.
            A duty you cannot date or place cannot be tracked.
          </p>
        ) : !data.capabilities.promote ? (
          <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
            <Lock className="mt-0.5 size-3 shrink-0" />
            Deciding that a provision binds the firm is reserved to the Compliance and Company
            Secretarial department.
          </p>
        ) : (
          <div className="space-y-2">
            <input value={basis} onChange={(e) => setBasis(e.target.value)}
                   placeholder="Basis for tracking this"
                   className="w-full rounded border border-input bg-background px-2 py-1.5 text-sm" />
            <button onClick={() => promote.mutate()} disabled={promote.isPending}
                    className="rounded bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground disabled:opacity-50">
              {promote.isPending ? 'Promoting…' : 'Promote to a tracked clause'}
            </button>
            {promote.error && <ErrorNote error={promote.error} />}
          </div>
        )}
      </section>
    </div>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-2">
      <dt className="w-20 shrink-0 text-muted-foreground">{label}</dt>
      <dd className="text-foreground">{children}</dd>
    </div>
  )
}

const spaced = (s: string) => s.replace(/([a-z])([A-Z])/g, '$1 $2')
