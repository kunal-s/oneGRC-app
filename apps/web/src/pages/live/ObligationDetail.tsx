import { useQuery } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import { getObligation, type LadderRungResponse } from '@/api/functions'
import { StatusChip } from '@/components/StatusChip'
import { fmtRelative } from '@/lib/time'
import { departmentLabel } from '@/lib/views'
import { ErrorNote } from './SourceLibrary'
import { ProofChain } from './ProofChain'

const DELIVERY_LABEL: Record<string, string> = { delivered: 'Delivered', retrying: 'Retrying', failed: 'Failed', pending: 'Pending' }
const DELIVERY_TONE: Record<string, 'ok' | 'warn' | 'danger' | 'neutral'> = {
  delivered: 'ok', retrying: 'warn', failed: 'danger', pending: 'neutral',
}

export function ObligationDetail() {
  const { id = '' } = useParams()
  const { data, isLoading, error } = useQuery({
    queryKey: ['obligation', id],
    queryFn: () => getObligation(id),
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
                    {c.overdue ? `${c.state}, overdue` : c.state}
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

      {/* SCR-049: the fired ladder rungs and the ones still scheduled, per cycle. BR-ESC-03, FRD 20.2 requirement 16. */}
      <section>
        <h2 className="mb-2 text-sm font-semibold text-foreground">Reminders and escalations</h2>
        <div className="space-y-3">
          {data.cycles.map((c) => (
            <div key={c.id}>
              {data.cycles.length > 1 && (
                <div className="mb-1 text-2xs font-semibold uppercase tracking-wide text-muted-foreground">{c.period}</div>
              )}
              <LadderList rungs={c.ladder} />
              {c.tasks.map((t) => t.ladder && (
                <div key={t.id} className="mt-2 pl-3">
                  <div className="mb-1 text-2xs text-muted-foreground">{t.shortTitle}'s own ladder</div>
                  <LadderList rungs={t.ladder} />
                </div>
              ))}
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

function LadderList({ rungs }: { rungs: LadderRungResponse[] }) {
  return (
    <div className="space-y-1.5 rounded-lg border border-border p-3">
      {rungs.map((r) => (
        <div key={r.offsetDays} className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5">
          <span className={r.state === 'scheduled' ? 'text-2xs text-muted-foreground' : 'text-2xs text-foreground'}>
            {r.intervalLabel} · {r.targetRoleLabel}
            {r.recipients.length > 0 && <> to {r.recipients.join(', ')}</>}
            {r.unresolvedDepartment && (
              <> ({departmentLabel(r.unresolvedDepartment)} has no department head on record)</>
            )}
          </span>
          <span className="flex shrink-0 items-center gap-1.5 text-2xs text-muted-foreground">
            {r.state === 'fired' && `fired ${fmtRelative(r.moment)}`}
            {r.state === 'scheduled' && `due ${fmtRelative(r.moment)}`}
            {r.state === 'ended' && 'ended'}
            {r.delivery && <StatusChip status={DELIVERY_LABEL[r.delivery] ?? r.delivery} tone={DELIVERY_TONE[r.delivery]} />}
          </span>
        </div>
      ))}
    </div>
  )
}
