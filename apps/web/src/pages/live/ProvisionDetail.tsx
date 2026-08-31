import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  CheckCircle2, CircleSlash, ExternalLink, Gavel, ListChecks,
  Lock, ScrollText, ShieldAlert, UserSearch,
} from 'lucide-react'
import {
  createControlFromClause,
  engageSpecialist,
  getProvision,
  instrumentDocumentUrl,
  listControls,
  markProvisionNotApplicable,
  promoteProvision,
  resolveProvisionFlag,
} from '@/api/functions'
import type { ControlOption } from '@/api/functions'
import { PageHeader } from '@/components/PageHeader'
import { StatusChip } from '@/components/StatusChip'
import { Button } from '@/components/ui/Button'
import { ErrorNote } from './SourceLibrary'

/**
 * A provision, read the way the prototype's source page reads.
 *
 * The layout is deliberately borrowed: what it requires first, the clause
 * extract tucked behind a disclosure, what it costs to miss, then the
 * decision. An officer should be able to decide without reading the statute,
 * and still be one click from the exact words.
 *
 * Where our data does not exist yet, the section says so plainly rather than
 * rendering an empty shell. The plain-language summary, the key parts and the
 * penalty tiers all arrive with the model tier (P0-17 seam).
 */
export function ProvisionDetail() {
  const { id = '' } = useParams()
  const qc = useQueryClient()
  const navigate = useNavigate()
  const [extractOpen, setExtractOpen] = useState(false)
  const [naOpen, setNaOpen] = useState(false)
  const [naReason, setNaReason] = useState('')
  const [basis, setBasis] = useState('')
  const [note, setNote] = useState('')
  const [saveOpen, setSaveOpen] = useState(false)
  const [controlChoice, setControlChoice] = useState('')
  const [newControlTitle, setNewControlTitle] = useState('')

  const { data, isLoading, error } = useQuery({
    queryKey: ['provision', id],
    queryFn: () => getProvision(id),
  })

  const promote = useMutation({
    mutationFn: async ({ controlId, controlTitle }: { controlId?: string; controlTitle?: string }) => {
      const r = await promoteProvision(id, basis)
      const control = await createControlFromClause(r.clauseId, {
        controlId,
        newControlTitle: controlId ? undefined : controlTitle || data?.heading,
        basis,
      })
      return { ...r, controlId: control.controlId }
    },
    onSuccess: (r) => {
      setSaveOpen(false)
      void qc.invalidateQueries()
      navigate(`/controls/${r.controlId}`)
    },
  })
  const controls = useQuery<ControlOption[]>({
    queryKey: ['controls-for-save'],
    queryFn: listControls,
    enabled: saveOpen,
  })
  const markNa = useMutation({
    mutationFn: () => markProvisionNotApplicable(id, naReason),
    onSuccess: () => { setNaOpen(false); setNaReason(''); void qc.invalidateQueries({ queryKey: ['provision', id] }) },
  })
  const specialist = useMutation({
    mutationFn: () => engageSpecialist(id),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['provision', id] }),
  })
  const resolve = useMutation({
    mutationFn: (flagId: string) => resolveProvisionFlag(flagId, note),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['provision', id] }),
  })

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading…</p>
  if (error) return <ErrorNote error={error} />
  if (!data) return null

  const pdf = instrumentDocumentUrl(data.instrument.id) +
    (data.pageNumber ? `#page=${data.pageNumber}` : '')
  const openFlags = data.flags.filter((f) => !f.resolvedAt)
  const blocked = data.promotionBlockedBy.length > 0

  return (
    <div className="max-w-4xl">
      <div className="mb-2 text-2xs text-muted-foreground">
        <Link to="/sources" className="hover:underline">Source Library</Link>
        {' · '}
        <Link to={`/sources/${data.instrument.id}`} className="hover:underline">
          {data.instrument.shortTitle}
        </Link>
        <span className="ml-1 inline-flex items-center gap-1.5">
          <span className="rounded-full border border-border bg-muted px-1.5 py-0.5 text-2xs font-medium text-foreground">
            {data.instrument.authority}
          </span>
        </span>
      </div>

      <PageHeader
        eyebrow={
          <span className="inline-flex items-center gap-1.5">
            <span className="font-mono text-info">{data.clauseRef}</span>
            <span className="text-muted-foreground">· {data.instrument.citation ?? data.instrument.shortTitle}</span>
          </span>
        }
        title={data.heading}
        description={
          data.notApplicable
            ? `Recorded as not applicable: ${data.notApplicable.reason}`
            : `Reads as ${spaced(data.classification).toLowerCase()}${
                data.dutyBearer ? `, binding ${data.dutyBearer}` : ''
              }. A one-line plain-language summary arrives with the model tier.`
        }
        actions={
          <div className="flex items-center gap-2">
            <StatusChip status={spaced(data.classification)} tone={classTone(data.classification)} />
            {data.promotedAs
              ? <StatusChip status="Tracked" tone="ok" />
              : data.notApplicable
                ? <StatusChip status="Not applicable" tone="neutral" />
                : <StatusChip status="Not yet tracked" tone="warn" />}
          </div>
        }
      />

      <div className="space-y-4">
        {/* What the clause asks for, with the exact words one click away. */}
        <div className="card-surface p-4">
          <div className="mb-3">
            <div className="text-2xs font-semibold uppercase tracking-wide text-muted-foreground">
              What this requires
            </div>
            <div className="mt-0.5 text-sm font-medium text-foreground">
              {data.dutyBearer
                ? `${cap(data.dutyBearer)}: ${data.heading.toLowerCase()}`
                : data.heading}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              The plain-language statement of this duty is generated by the model tier, which is not
              yet enabled. The rules tier will not invent one: a wrong summary of a legal obligation
              is worse than none.
            </p>
          </div>

          <ul className="mb-3 space-y-1">
            <li className="flex items-start gap-2 text-xs text-muted-foreground">
              <ListChecks className="mt-0.5 size-3.5 shrink-0 text-info" />
              Key parts are extracted with the model tier. Read the clause extract below meanwhile.
            </li>
          </ul>

          <button
            type="button"
            onClick={() => setExtractOpen((v) => !v)}
            className="flex w-full items-center gap-1.5 text-2xs font-semibold uppercase tracking-wide text-muted-foreground hover:text-foreground"
            aria-expanded={extractOpen}
          >
            <ScrollText className="size-3.5" />
            <span>{extractOpen ? '▾' : '▸'} Clause extract</span>
            <span className="ml-auto font-normal normal-case tracking-normal text-muted-foreground">
              {data.instrument.citation ?? ''} {data.clauseRef}
            </span>
          </button>
          {extractOpen && (
            <>
              <blockquote className="mt-2 max-h-72 overflow-y-auto whitespace-pre-wrap border-l-2 border-info/40 bg-muted/40 px-3 py-2 text-xs italic leading-relaxed text-foreground">
                {data.verbatimText.trim()}
              </blockquote>
              <a href={pdf} target="_blank" rel="noreferrer"
                 className="mt-1.5 inline-flex items-center gap-1 text-2xs text-info hover:underline">
                open the source at page {data.pageNumber ?? '?'} <ExternalLink className="size-3" />
              </a>
            </>
          )}
        </div>

        {/* What it costs to miss. Severity is derived from these tiers, never typed. */}
        <div className="card-surface p-4">
          <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-foreground">
            <Gavel className="size-4 text-medium" /> What happens if missed
          </h3>
          <div className="overflow-hidden rounded-md border border-border">
            <table className="w-full text-xs">
              <thead className="bg-muted/40 text-2xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-2.5 py-1.5 text-left font-medium">Sev</th>
                  <th className="px-2.5 py-1.5 text-left font-medium">Trigger</th>
                  <th className="px-2.5 py-1.5 text-left font-medium">Consequence</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-t border-border align-top">
                  <td className="px-2.5 py-2 text-muted-foreground" colSpan={3}>
                    No penalty tiers extracted for this provision yet. Tiers are read from the
                    consequence clauses of the same instrument and attached here, which is what
                    lets severity be derived from the sourced penalty rather than typed by hand.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-2xs text-muted-foreground">
            Severity is derived from the gravity of these penalty tiers.
          </p>
        </div>

        {/* Ours, not the prototype's: review items gate whether this can be tracked. */}
        {openFlags.length > 0 && (
          <div className="card-surface border-medium/40 bg-medium-soft/25 p-4">
            <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-foreground">
              <ShieldAlert className="size-4 text-medium" /> Needs review ({openFlags.length})
            </h3>
            {data.capabilities.resolveFlag && (
              <input value={note} onChange={(e) => setNote(e.target.value)}
                     placeholder="How was it resolved? (required)"
                     className="mb-2 w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-xs outline-none focus:border-info/50" />
            )}
            <ul className="space-y-1.5 text-xs">
              {openFlags.map((f) => (
                <li key={f.id} className="flex items-start justify-between gap-3">
                  <span>
                    <b className="text-foreground">{spaced(f.kind)}</b>
                    {f.blocking && <span className="ml-1 text-2xs font-semibold text-critical">BLOCKING</span>}
                    {f.detail && <span className="text-muted-foreground">, {f.detail}</span>}
                  </span>
                  {data.capabilities.resolveFlag && (
                    <button onClick={() => resolve.mutate(f.id)} disabled={!note.trim() || resolve.isPending}
                            className="shrink-0 rounded-md border border-border bg-background px-2 py-0.5 text-2xs font-medium disabled:opacity-40">
                      resolve
                    </button>
                  )}
                </li>
              ))}
            </ul>
            {resolve.error && <div className="mt-2"><ErrorNote error={resolve.error} /></div>}
          </div>
        )}

        {/* Decision. Save maps this to a control and tracks it. */}
        <div className="card-surface p-4">
          {data.promotedAs ? (
            <div className="flex items-center gap-2 rounded-md border border-ok/30 bg-ok-soft/40 px-3 py-2 text-xs text-foreground">
              <CheckCircle2 className="size-4 text-ok" /> Saved and tracked as{' '}
              <Link to={`/sources/clause/${data.promotedAs}`} className="font-mono font-medium text-info hover:underline">
                {data.promotedAs}
              </Link>
            </div>
          ) : data.notApplicable ? (
            <div className="flex items-start gap-2 rounded-md border border-border bg-muted/40 px-3 py-2 text-xs text-foreground">
              <CircleSlash className="mt-0.5 size-4 text-muted-foreground" />
              <span>
                Marked not applicable. <span className="text-muted-foreground">{data.notApplicable.reason}</span>
                <span className="ml-1 text-2xs text-muted-foreground">Reversible; the trail keeps both decisions.</span>
              </span>
            </div>
          ) : (
            <>
              <div className="mb-1.5 text-2xs font-semibold uppercase tracking-wide text-muted-foreground">
                Decision
              </div>
              <div className="flex flex-wrap gap-2">
                {data.capabilities.promote && (
                  <Button size="sm" onClick={() => setSaveOpen(true)} disabled={promote.isPending}>
                    <CheckCircle2 className="size-4" /> Save to a control
                  </Button>
                )}
                {data.capabilities.notApplicable && (
                  <button onClick={() => setNaOpen((v) => !v)} aria-expanded={naOpen}
                          className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-2.5 py-1.5 text-xs font-medium text-foreground transition-colors hover:border-medium/50 hover:bg-medium-soft/40">
                    <CircleSlash className="size-3.5" /> Mark not applicable
                  </button>
                )}
                {data.capabilities.engageSpecialist && (
                  <button onClick={() => specialist.mutate()} disabled={specialist.isPending}
                          className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-2.5 py-1.5 text-xs font-medium text-foreground transition-colors hover:border-info/40 hover:bg-info-soft/40">
                    <UserSearch className="size-3.5" /> Engage specialist
                  </button>
                )}
              </div>

              {data.specialistEngagedAt && (
                <p className="mt-2 text-2xs text-info">
                  Routed to outside counsel. Awaiting an opinion.
                </p>
              )}

              {naOpen && (
                <div className="mt-2.5 rounded-md border border-medium/40 bg-medium-soft/25 p-2.5">
                  <label htmlFor="na-reason" className="text-2xs font-semibold uppercase tracking-wide text-medium">
                    Why does this provision not apply to this organisation?
                  </label>
                  <textarea id="na-reason" rows={2} value={naReason} onChange={(e) => setNaReason(e.target.value)}
                            placeholder="e.g. the trigger condition is not met; the duty falls on the Authority, not on us"
                            className="mt-1.5 w-full resize-none rounded-md border border-border bg-background px-2.5 py-1.5 text-xs outline-none placeholder:text-muted-foreground focus:border-info/50" />
                  <div className="mt-2 flex items-center gap-2">
                    <Button size="sm" disabled={naReason.trim().length < 8 || markNa.isPending}
                            title={naReason.trim().length < 8 ? 'Record the reason before marking this not applicable.' : undefined}
                            onClick={() => markNa.mutate()}>
                      <CircleSlash className="size-4" /> Record decision
                    </Button>
                    <button onClick={() => { setNaOpen(false); setNaReason('') }}
                            className="text-2xs font-medium text-muted-foreground hover:text-foreground">Cancel</button>
                    <span className="ml-auto text-2xs text-muted-foreground">Reversible; the trail keeps both decisions.</span>
                  </div>
                  {markNa.error && <div className="mt-2"><ErrorNote error={markNa.error} /></div>}
                </div>
              )}

              {data.capabilities.promote && (
                <div className="mt-2.5">
                  <input value={basis} onChange={(e) => setBasis(e.target.value)}
                         placeholder="Basis for tracking this (recorded on the audit trail)"
                         className="w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-xs outline-none focus:border-info/50" />
                </div>
              )}

              {saveOpen && data.capabilities.promote && (
                <div className="fixed inset-0 z-40 flex items-center justify-center bg-foreground/20 p-4" role="dialog" aria-modal="true" aria-labelledby="save-control-title">
                  <div className="flex max-h-[85vh] w-full max-w-xl flex-col rounded-lg border border-border bg-background p-4 shadow-xl">
                    <div className="flex items-start justify-between gap-3 border-b border-border pb-3">
                      <div>
                        <h2 id="save-control-title" className="text-base font-semibold text-foreground">Save clause to a control</h2>
                        <p className="mt-0.5 text-xs text-muted-foreground"><span className="font-mono text-info">{data.clauseRef}</span> · {data.heading}</p>
                      </div>
                      <button type="button" onClick={() => setSaveOpen(false)} aria-label="Close" className="text-xl leading-none text-muted-foreground hover:text-foreground">×</button>
                    </div>
                    <div className="min-h-0 overflow-y-auto py-3">
                      <div className="mb-2 text-2xs font-semibold uppercase tracking-wide text-muted-foreground">Attach to an existing control</div>
                      {controls.isLoading ? <p className="text-xs text-muted-foreground">Loading controls…</p> : (controls.data ?? []).length === 0 ? (
                        <p className="text-xs text-muted-foreground">No existing controls yet. Create one below.</p>
                      ) : (
                        <div className="space-y-1.5">
                          {controls.data?.map((control) => (
                            <button key={control.id} type="button" onClick={() => { setControlChoice(control.id); promote.mutate({ controlId: control.id }) }} disabled={promote.isPending}
                                    className="flex w-full items-center justify-between rounded-md border border-border bg-background px-3 py-2 text-left hover:border-info/50 hover:bg-info-soft/30 disabled:opacity-50">
                              <span><span className="block text-sm font-medium text-foreground">{control.shortTitle}</span><span className="text-2xs text-muted-foreground">{control.id} · {control.title}</span></span>
                              <span className="text-lg text-muted-foreground">↗</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="border-t border-border pt-3">
                      {controlChoice === '' ? (
                        <button type="button" onClick={() => setNewControlTitle(data.heading)} className="flex w-full items-center justify-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
                          <span className="text-lg leading-none">+</span> Create a new control from this clause
                        </button>
                      ) : null}
                      {controlChoice === '' && newControlTitle && (
                        <div className="mt-2 flex gap-2">
                          <input autoFocus value={newControlTitle} onChange={(e) => setNewControlTitle(e.target.value)} aria-label="New control title" className="min-w-0 flex-1 rounded-md border border-border bg-background px-2.5 py-1.5 text-xs outline-none focus:border-info/50" />
                          <Button size="sm" onClick={() => promote.mutate({ controlTitle: newControlTitle.trim() })} disabled={promote.isPending || !newControlTitle.trim()}><CheckCircle2 className="size-4" /> Create</Button>
                        </div>
                      )}
                      <p className="mt-2 text-2xs text-muted-foreground">One control can satisfy several clauses across acts. Attaching adds this clause to the control’s Satisfies list.</p>
                      {promote.error && <div className="mt-2"><ErrorNote error={promote.error} /></div>}
                    </div>
                  </div>
                </div>
              )}

              {blocked && (
                <p className="mt-2 flex items-start gap-1.5 text-2xs text-muted-foreground">
                  <Lock className="mt-0.5 size-3 shrink-0" />
                  Saving is blocked until resolved:{' '}
                  <b className="text-foreground">{data.promotionBlockedBy.map(spaced).join(', ')}</b>.
                  A duty you cannot date or place cannot be tracked.
                </p>
              )}
              {!blocked && !data.capabilities.promote && (
                <p className="mt-2 flex items-start gap-1.5 text-2xs text-muted-foreground">
                  <Lock className="mt-0.5 size-3 shrink-0" />
                  Deciding that a provision binds the firm is reserved to the Compliance and Company
                  Secretarial department, at Compliance Manager level.
                </p>
              )}
              {promote.error && <div className="mt-2"><ErrorNote error={promote.error} /></div>}

              <p className="mt-1.5 text-2xs text-muted-foreground">
                Save maps this provision to a control and tracks it in the Control Library.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

const spaced = (s: string) => s.replace(/([a-z])([A-Z])/g, '$1 $2')
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

function classTone(c: string): 'ok' | 'warn' | 'info' | 'neutral' {
  if (c === 'Duty') return 'info'
  if (c === 'Applicability') return 'warn'
  if (c === 'Unclassified') return 'warn'
  return 'neutral'
}
