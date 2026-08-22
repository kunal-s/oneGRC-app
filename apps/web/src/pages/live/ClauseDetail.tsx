import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import { ExternalLink, Flag, Lock } from 'lucide-react'
import { api } from '@/api/client'
import type { ClauseDetail as Detail } from '@/api/types'
import { ErrorNote } from './SourceLibrary'
import { ProofChain } from './ProofChain'

export function ClauseDetail() {
  const { id = '' } = useParams()
  const qc = useQueryClient()
  const [title, setTitle] = useState('')
  const [basis, setBasis] = useState('')

  const { data, isLoading, error } = useQuery({
    queryKey: ['clause', id],
    queryFn: () => api.get<Detail>(`/clauses/${id}`),
  })

  const save = useMutation({
    mutationFn: () =>
      api.post(`/clauses/${id}/save-to-control`, { newControlTitle: title || undefined, basis: basis || undefined }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['clause', id] })
      void qc.invalidateQueries({ queryKey: ['instrument'] })
    },
  })

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading…</p>
  if (error) return <ErrorNote error={error} />
  if (!data) return null

  const pdf = api.url(`/instruments/${data.instrument.id}/document`) +
    (data.pageNumber ? `#page=${data.pageNumber}` : '')

  return (
    <div className="max-w-4xl space-y-5">
      <div>
        <Link to={`/sources/${data.instrument.id}`} className="text-2xs text-muted-foreground hover:underline">
          ← {data.instrument.shortTitle}
        </Link>
        <h1 className="mt-1 text-lg font-semibold text-foreground">
          <span className="font-mono text-sm text-info">{data.clauseRef}</span> — {data.title}
        </h1>
        <p className="text-2xs text-muted-foreground">
          <span className="font-mono">{data.id}</span> · {data.instrument.authority}
          {data.instrument.citation && <> · {data.instrument.citation}</>} · state <b>{data.state}</b>
        </p>
      </div>

      <ProofChain anchor={data.id} />

      {/* The exact extract. Never paraphrased - an auditor tests the artifact. */}
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
        <blockquote className="whitespace-pre-wrap rounded-lg border border-border bg-muted/20 p-3 font-serif text-sm leading-relaxed text-foreground">
          {data.verbatimText.trim()}
        </blockquote>
        <p className="mt-1 text-2xs text-muted-foreground">
          Extracted by {data.extractionMethod}
          {data.extractionConfidence !== null && <> · confidence {data.extractionConfidence.toFixed(2)}</>}
        </p>
      </section>

      {data.flags.length > 0 && (
        <section className="rounded-lg border border-medium/40 bg-medium-soft p-3">
          <h2 className="mb-2 flex items-center gap-1.5 text-2xs font-semibold uppercase tracking-wide text-medium">
            <Flag className="size-3" /> Needs review ({data.flags.length})
          </h2>
          <ul className="space-y-1.5 text-xs">
            {data.flags.map((f) => (
              <li key={f.id}>
                <span className="font-medium text-foreground">{spaced(f.kind)}</span>
                {f.detail && <span className="text-muted-foreground"> — {f.detail}</span>}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="rounded-lg border border-border p-3">
        <h2 className="mb-1 text-2xs font-semibold uppercase tracking-wide text-muted-foreground">
          Assessment — proposal only
        </h2>
        <p className="text-xs text-muted-foreground">
          Reads as a <b className="text-foreground">{data.proposal.disposition}</b>, clarity{' '}
          <b className="text-foreground">{data.proposal.clarity.toFixed(2)}</b>.{' '}
          {data.proposal.summary || 'No plain-language summary: this provider does not generate one, because a wrong summary of a legal duty is worse than none.'}
        </p>
        <p className="mt-1 text-2xs text-muted-foreground">
          {data.proposal.provider} v{data.proposal.providerVersion} · a proposal, not a finding. Nothing
          is tracked until a person accepts it.
        </p>
      </section>

      {data.controls.length > 0 && (
        <section className="rounded-lg border border-ok/40 bg-ok-soft p-3">
          <h2 className="mb-1 text-2xs font-semibold uppercase tracking-wide text-ok">Satisfied by</h2>
          <ul className="text-xs">
            {data.controls.map((c) => (
              <li key={c.id}>
                <span className="font-mono text-2xs text-info">{c.id}</span> {c.shortTitle}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="rounded-lg border border-border p-3">
        <h2 className="mb-2 text-2xs font-semibold uppercase tracking-wide text-muted-foreground">Decision</h2>
        {!data.capabilities.save ? (
          <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
            <Lock className="mt-0.5 size-3 shrink-0" />
            Deciding that a provision binds the firm is reserved to the Compliance and Company
            Secretarial department. You are signed in without that authority.
          </p>
        ) : data.state === 'Saved' ? (
          <p className="text-xs text-muted-foreground">This clause is already tracked.</p>
        ) : (
          <div className="space-y-2">
            <input value={title} onChange={(e) => setTitle(e.target.value)}
                   placeholder="New control title (or leave blank to auto-name)"
                   className="w-full rounded border border-input bg-background px-2 py-1.5 text-sm" />
            <input value={basis} onChange={(e) => setBasis(e.target.value)}
                   placeholder="Basis for the decision"
                   className="w-full rounded border border-input bg-background px-2 py-1.5 text-sm" />
            <button onClick={() => save.mutate()} disabled={save.isPending}
                    className="rounded bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground disabled:opacity-50">
              {save.isPending ? 'Saving…' : 'Save to a control'}
            </button>
            {save.error && <ErrorNote error={save.error} />}
          </div>
        )}
      </section>
    </div>
  )
}

const spaced = (s: string) => s.replace(/([a-z])([A-Z])/g, '$1 $2')
