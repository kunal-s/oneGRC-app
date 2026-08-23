import { useQuery } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import { ExternalLink, Flag, Lock } from 'lucide-react'
import { api } from '@/api/client'
import type { InstrumentTriage, ProvisionRow } from '@/api/provision-types'
import { ErrorNote } from './SourceLibrary'

/** Order matters: what needs a decision first, machinery last. */
const CLASS_ORDER = [
  'Duty', 'Applicability', 'Unclassified', 'Consequence',
  'PowerProcedure', 'Definition', 'Machinery', 'RateSchedule', 'Housekeeping',
]

export function InstrumentDetail() {
  const { id = '' } = useParams()

  const inst = useQuery({
    queryKey: ['instrument', id],
    queryFn: () => api.get<InstrumentTriage>(`/instruments/${id}`),
  })
  // Default to the only thing that needs a person: duties that bind us.
  const duties = useQuery({
    queryKey: ['provisions', id, 'duties'],
    queryFn: () => api.get<ProvisionRow[]>(`/provisions?instrumentId=${id}&classification=Duty`),
  })

  if (inst.isLoading) return <p className="text-sm text-muted-foreground">Loading…</p>
  if (inst.error) return <ErrorNote error={inst.error} />
  if (!inst.data) return null
  const d = inst.data
  const t = d.triage

  const ours = (duties.data ?? []).filter((p) => p.bindsUs === 'yes')
  const unsure = (duties.data ?? []).filter((p) => p.bindsUs === 'undetermined')

  return (
    <div className="space-y-5">
      <div>
        <Link to="/sources" className="text-2xs text-muted-foreground hover:underline">← Source Library</Link>
        <h1 className="mt-1 text-xl font-semibold text-foreground">{d.title}</h1>
        <p className="text-sm text-muted-foreground">
          <span className="font-mono text-2xs font-semibold text-info">{d.id}</span>
          {d.citation && <> · {d.citation}</>} · {d.authority}
          {' · '}
          <a href={api.url(`/instruments/${d.id}/document`)} target="_blank" rel="noreferrer"
             className="inline-flex items-center gap-1 text-info hover:underline">
            open the PDF <ExternalLink className="size-3" />
          </a>
        </p>
      </div>

      {/* Triage, not a wall of clauses. A 34-page Act is 178 provisions; an
          officer needs the dozen that bind the firm, not the machinery. */}
      <section className="rounded-lg border border-border p-3">
        <h2 className="mb-2 text-2xs font-semibold uppercase tracking-wide text-muted-foreground">
          Triage — {t.total} provisions extracted
        </h2>
        <div className="flex flex-wrap gap-4 text-sm">
          <Stat label="Needs your decision" value={t.needsDecision} tone="attention" />
          <Stat label="Not ours" value={t.notOurs} />
          <Stat label="Already tracked" value={t.promoted} tone="ok" />
          <Stat label="Blocked by review" value={t.blockedByFlags} tone={t.blockedByFlags ? 'attention' : undefined} />
        </div>
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 border-t border-border pt-2 text-2xs text-muted-foreground">
          {CLASS_ORDER.filter((c) => t.byClass[c]).map((c) => (
            <span key={c}>{spaced(c)} <b className="text-foreground">{t.byClass[c]}</b></span>
          ))}
        </div>
        <p className="mt-2 text-2xs text-muted-foreground">
          Only a duty that binds this organisation is ever promoted to a tracked clause. Definitions,
          machinery and appeal procedure are kept and searchable, but never enter a queue.
        </p>
      </section>

      {d.relations.length > 0 && (
        <p className="text-xs text-muted-foreground">
          Related:{' '}
          {d.relations.map((r, n) => (
            <span key={n}>
              {n > 0 && ' · '}
              {r.direction === 'from' ? `this ${r.kind} ` : `${r.kind} this — `}
              <Link to={`/sources/${r.other.id}`} className="text-info hover:underline">{r.other.shortTitle}</Link>
            </span>
          ))}
        </p>
      )}

      <ProvisionTable title="Duties that appear to bind us" rows={ours} />
      {unsure.length > 0 && (
        <ProvisionTable title="Duties where the bearer could not be matched" rows={unsure} muted />
      )}
    </div>
  )
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: 'attention' | 'ok' }) {
  const colour = tone === 'attention' ? 'text-medium' : tone === 'ok' ? 'text-ok' : 'text-foreground'
  return (
    <div>
      <div className={`text-lg font-semibold tabular-nums ${colour}`}>{value}</div>
      <div className="text-2xs uppercase tracking-wide text-muted-foreground">{label}</div>
    </div>
  )
}

function ProvisionTable({ title, rows, muted }: { title: string; rows: ProvisionRow[]; muted?: boolean }) {
  if (rows.length === 0) return null
  return (
    <section>
      <h2 className="mb-2 text-sm font-semibold text-foreground">
        {title} <span className="font-normal text-muted-foreground">({rows.length})</span>
      </h2>
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-left text-2xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="w-20 px-3 py-2 font-medium">Ref</th>
              <th className="px-3 py-2 font-medium">Provision</th>
              <th className="px-3 py-2 font-medium">Bearer</th>
              <th className="w-16 px-3 py-2 text-right font-medium">Page</th>
              <th className="w-24 px-3 py-2 font-medium">Status</th>
            </tr>
          </thead>
          <tbody className={muted ? 'opacity-75' : ''}>
            {rows.map((p) => (
              <tr key={p.id} className="border-t border-border hover:bg-muted/30">
                <td className="px-3 py-1.5 font-mono text-2xs">{p.clauseRef}</td>
                <td className="max-w-0 truncate px-3 py-1.5">
                  <Link to={`/sources/provision/${p.id}`} className="hover:underline" title={p.heading}>
                    {p.heading}
                  </Link>
                </td>
                <td className="max-w-0 truncate px-3 py-1.5 text-2xs text-muted-foreground" title={p.dutyBearer ?? ''}>
                  {p.dutyBearer ?? '—'}
                </td>
                <td className="px-3 py-1.5 text-right tabular-nums text-muted-foreground">{p.pageNumber ?? '—'}</td>
                <td className="px-3 py-1.5 text-2xs">
                  {p.promotedAs ? (
                    <span className="font-mono text-ok">{p.promotedAs}</span>
                  ) : p.blockingFlags > 0 ? (
                    <span className="inline-flex items-center gap-1 text-medium" title={p.flagKinds.join(', ')}>
                      <Lock className="size-3" /> {p.blockingFlags} blocking
                    </span>
                  ) : p.flagKinds.length > 0 ? (
                    <span className="inline-flex items-center gap-1 text-muted-foreground">
                      <Flag className="size-3" /> {p.flagKinds.length}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">ready</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

const spaced = (s: string) => s.replace(/([a-z])([A-Z])/g, '$1 $2')
