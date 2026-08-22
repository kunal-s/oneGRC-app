import * as React from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft, ArrowUpRight, ScrollText, ExternalLink, Sparkles, CheckCircle2, UserSearch,
  ShieldCheck, Gavel, CalendarClock, Link2, ListChecks, Building2, ClipboardCheck, CircleSlash,
} from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import { StatusChip } from '@/components/StatusChip'
import { SeverityBadge } from '@/components/SeverityBadge'
import { Button } from '@/components/ui/Button'
import { Avatar } from '@/components/Avatar'
import { SaveClauseChooser } from '@/components/SaveClauseChooser'
import { CopilotInline } from '@/components/copilot/CopilotInline'
import { ProofChain } from '@/components/ProofChain'
import { resolveProofChain } from '@/lib/proofChain'
import { getInstrument, getControl, getSource } from '@/data'
import {
  effectiveClause, statusTone,
  obligationsForClause, evidenceForClause, tasksForClause,
} from '@/lib/sources'
import { controlIdsForClause } from '@/lib/tasks'
import { personName } from '@/data/people'
import { fmtDate } from '@/lib/time'
import { useApp } from '@/store'
import { useCanAct } from '@/lib/gating'
import { ComingSoon } from './ComingSoon'

const fmtPct = (n: number) => `${n.toFixed(1)}%`

export function SourceSectionDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const base = id ? getSource(id) : undefined
  const overrides = useApp((s) => s.clauseOverrides)
  const getSessionControl = useApp((s) => s.getSessionControl)
  const engageSpecialist = useApp((s) => s.engageSpecialist)
  const completeSpecialist = useApp((s) => s.completeSpecialist)
  const setClauseApplicability = useApp((s) => s.setClauseApplicability)
  const selfId = useApp((s) => s.personId)
  const pushToast = useApp((s) => s.pushToast)
  const [saving, setSaving] = React.useState(false)
  const [extractOpen, setExtractOpen] = React.useState(false)
  // "Not applicable" is a recorded decision, so it collects its reason before it commits.
  const [naOpen, setNaOpen] = React.useState(false)
  const [naReason, setNaReason] = React.useState('')

  if (!base) return <ComingSoon title="Clause not found" />

  const p = effectiveClause(base, overrides)
  const inst = getInstrument(p.instrumentId)
  const canAct = useCanAct({ kind: 'clause.save' })
  const canSetApplicability = useCanAct({ kind: 'clause.applicability' })
  const reviewable = Boolean(p.status)
  const saved = p.status === 'Saved'
  const inSpecialist = p.status === 'Specialist review'
  const linkedControl = p.linkedControlId ? getControl(p.linkedControlId) ?? getSessionControl(p.linkedControlId) : undefined

  // Spine: every clause carries its full chain — controls satisfy it,
  // obligations derive from it, evidence proves them, tasks perform them.
  const controlIds = React.useMemo(() => {
    const ids = new Set<string>(controlIdsForClause(p.id))
    if (p.linkedControlId) ids.add(p.linkedControlId)
    return Array.from(ids)
  }, [p.id, p.linkedControlId])
  const obligationIds = React.useMemo(() => obligationsForClause(p.id).map((o) => o.id), [p.id])
  const evidenceIds = React.useMemo(() => evidenceForClause(p.id).map((e) => e.id), [p.id])
  const taskIds = React.useMemo(() => tasksForClause(p.id).map((t) => t.id), [p.id])
  const chain = React.useMemo(() => resolveProofChain({ kind: 'source', clauseId: p.id, linkedControlId: p.linkedControlId }), [p.id, p.linkedControlId])

  return (
    <div>
      <div className="mb-3 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <button onClick={() => navigate('/sources')} className="hover:text-foreground">Source Library</button>
        <span>/</span>
        {inst && (
          <>
            <button onClick={() => navigate(`/sources/${inst.id}`)} className="inline-flex items-center gap-1 hover:text-foreground">
              <ArrowLeft className="size-3" /> {inst.title}
            </button>
            <span className="ml-1 inline-flex items-center gap-1.5">
              <span className="rounded-full border border-border bg-muted px-1.5 py-0.5 text-2xs font-medium text-foreground">{inst.authority}</span>
              <span className="rounded-full border border-border bg-muted px-1.5 py-0.5 text-2xs font-medium text-foreground">{inst.version ?? fmtDate(inst.dateOfIssue)}</span>
            </span>
          </>
        )}
      </div>

      <PageHeader
        eyebrow={<span className="inline-flex items-center gap-1.5"><span className="font-mono text-info">{p.id}</span><span className="text-muted-foreground">· {p.provision}</span></span>}
        title={p.title}
        description={p.briefDescription ?? p.citation}
        actions={
          <div className="flex items-center gap-2">
            {p.severity && <SeverityBadge severity={p.severity} />}
            {p.status && <StatusChip status={p.status} tone={statusTone(p.status)} />}
          </div>
        }
      />

      {/* Proof chain — Source highlighted as the entry node. */}
      <ProofChain nodes={chain} className="mb-4" dataTour="proof-chain" />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
        {/* Core */}
        <div className="space-y-4">
          {/* What the clause asks for, and what it costs to miss — read together. */}
          <div data-tour="clause-requires-and-penalty" className="space-y-4">
          <div className="card-surface p-4">
            {p.nameOfCompliance && (
              <div className="mb-3">
                <div className="text-2xs font-semibold uppercase tracking-wide text-muted-foreground">What this requires</div>
                <div className="mt-0.5 text-sm font-medium text-foreground">{p.nameOfCompliance}</div>
                {p.whatItMeans && <p className="mt-1 text-xs text-muted-foreground">{p.whatItMeans}</p>}
              </div>
            )}
            {p.keyParts && p.keyParts.length > 0 && (
              <ul className="mb-3 space-y-1">
                {p.keyParts.map((k, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-foreground"><ListChecks className="mt-0.5 size-3.5 shrink-0 text-info" /> {k}</li>
                ))}
              </ul>
            )}
            <button
              type="button"
              onClick={() => setExtractOpen((v) => !v)}
              className="flex w-full items-center gap-1.5 text-2xs font-semibold uppercase tracking-wide text-muted-foreground hover:text-foreground"
              aria-expanded={extractOpen}
            >
              <ScrollText className="size-3.5" />
              <span>{extractOpen ? '▾' : '▸'} Clause extract</span>
              <span className="ml-auto font-normal normal-case tracking-normal text-muted-foreground">{p.citation}</span>
            </button>
            {extractOpen && (
              <blockquote className="mt-2 border-l-2 border-info/40 bg-muted/40 px-3 py-2 text-xs italic leading-relaxed text-foreground">“{p.sourceExtract}”</blockquote>
            )}
          </div>

          {p.penaltyTiers && p.penaltyTiers.length > 0 && (
            <div className="card-surface p-4">
              <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-foreground">
                <Gavel className="size-4 text-medium" /> What happens if missed
                {p.severity && <span className="ml-auto inline-flex items-center gap-1.5 text-2xs text-muted-foreground">severity <SeverityBadge severity={p.severity} dense /></span>}
              </h3>
              <div className="overflow-hidden rounded-md border border-border">
                <table className="w-full text-xs">
                  <thead className="bg-muted/40 text-2xs uppercase tracking-wide text-muted-foreground">
                    <tr>
                      <th className="px-2.5 py-1.5 text-left font-medium">Sev</th>
                      <th className="px-2.5 py-1.5 text-left font-medium">Trigger</th>
                      <th className="px-2.5 py-1.5 text-left font-medium">Consequence</th>
                      <th className="px-2.5 py-1.5 text-left font-medium">Source</th>
                    </tr>
                  </thead>
                  <tbody>
                    {p.penaltyTiers.map((tier, i) => {
                      const src = getSource(tier.sourceRef)
                      return (
                        <tr key={i} className="border-t border-border align-top">
                          <td className="px-2.5 py-1.5"><SeverityBadge severity={tier.severity} dense /></td>
                          <td className="px-2.5 py-1.5 font-medium text-foreground">{tier.trigger}</td>
                          <td className="px-2.5 py-1.5 text-muted-foreground">{tier.consequence}</td>
                          <td className="px-2.5 py-1.5">
                            {src ? (
                              <button onClick={() => navigate(`/sources/section/${tier.sourceRef}`)} className="inline-flex items-center gap-1 text-2xs font-medium text-info hover:underline">
                                <ScrollText className="size-3" /> {src.id}
                              </button>
                            ) : <span className="text-2xs text-muted-foreground">—</span>}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              <p className="mt-2 text-2xs text-muted-foreground">Severity is derived from the gravity of these penalty tiers.</p>
            </div>
          )}
          </div>

          {/* Recommendation + decision */}
          {reviewable && (
            <div data-tour="clause-decision" className="card-surface p-4">
              {p.aiRecommendation && (
                <div className="rounded-md border border-info/20 bg-info-soft/30 p-2.5">
                  <div className="flex items-center gap-1.5">
                    <Sparkles className="size-3.5 text-info" />
                    <span className="text-2xs font-semibold uppercase tracking-wide text-info">{p.aiRecommendation.agent} · recommends</span>
                    <span className="ml-auto inline-flex items-center gap-1.5">
                      <span className="h-1.5 w-16 overflow-hidden rounded-full bg-muted"><span className="block h-full rounded-full bg-info" style={{ width: `${p.aiRecommendation.confidence}%` }} /></span>
                      <span className="text-2xs font-semibold tnum text-info">{fmtPct(p.aiRecommendation.confidence)}</span>
                    </span>
                  </div>
                  <p className="mt-1.5 text-xs text-foreground">{p.aiRecommendation.recommendation}</p>
                  <p className="mt-1 text-2xs text-muted-foreground">Basis: {p.aiRecommendation.basis} · {fmtDate(p.aiRecommendation.at)}</p>
                </div>
              )}

              {p.reviewer && (
                <div className="mt-3 flex flex-wrap items-center gap-2 rounded-md bg-muted/40 px-2.5 py-2 text-2xs text-muted-foreground">
                  <ShieldCheck className="size-3.5 text-ok" />
                  <span className="inline-flex items-center gap-1"><Avatar id={p.reviewer} size={16} /> <span className="font-medium text-foreground">{personName(p.reviewer)}</span></span>
                  <span>· {p.status?.toLowerCase()}</span>
                  {p.reviewedAt && <span>· {fmtDate(p.reviewedAt)}</span>}
                  {p.rationale && <span className="w-full text-foreground">“{p.rationale}”</span>}
                </div>
              )}

              {/* Specialist workflow */}
              {inSpecialist && (
                <div className="mt-3 rounded-md border border-medium/40 bg-medium-soft/30 p-2.5">
                  <div className="flex items-center gap-1.5 text-2xs font-semibold uppercase tracking-wide text-medium"><UserSearch className="size-3.5" /> Specialist review</div>
                  {p.specialistNote ? (
                    <p className="mt-1 text-xs text-foreground">Outcome: {p.specialistNote}</p>
                  ) : (
                    <p className="mt-1 text-2xs text-muted-foreground">Engaged with outside counsel for an interpretation. Record the outcome to enable Save.</p>
                  )}
                  {canAct && !p.specialistNote && (
                    <Button variant="outline" size="sm" className="mt-2" onClick={() => { completeSpecialist(p.id, 'Specialist confirmed applicability and the controls to implement; documented and ready to save.'); pushToast({ title: 'Specialist review complete', description: `${p.id} outcome documented — ready to save.`, variant: 'success' }) }}>
                      <ClipboardCheck className="size-3.5" /> Mark review complete
                    </Button>
                  )}
                </div>
              )}

              {saved ? (
                <div className="mt-3 flex items-center gap-2 rounded-md border border-ok/30 bg-ok-soft/40 px-3 py-2 text-xs text-foreground">
                  <CheckCircle2 className="size-4 text-ok" /> Saved to a control and tracked.
                </div>
              ) : canAct ? (
                <div className="mt-3">
                  <div className="mb-1.5 text-2xs font-semibold uppercase tracking-wide text-muted-foreground">Decision</div>
                  <div className="flex flex-wrap gap-2">
                    {p.applicable !== false && (
                      <Button size="sm" onClick={() => setSaving(true)}><CheckCircle2 className="size-4" /> Save to a control</Button>
                    )}
                    {p.applicable !== false && canSetApplicability && (
                      <button onClick={() => setNaOpen((v) => !v)} aria-expanded={naOpen} className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-2.5 py-1.5 text-xs font-medium text-foreground transition-colors hover:border-medium/50 hover:bg-medium-soft/40">
                        <CircleSlash className="size-3.5" /> Mark not applicable
                      </button>
                    )}
                    {!inSpecialist && (
                      <button onClick={() => { engageSpecialist(p.id); pushToast({ title: 'Specialist engaged', description: `${p.id} routed to outside counsel for review.`, variant: 'info' }) }} className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-2.5 py-1.5 text-xs font-medium text-foreground transition-colors hover:border-info/40 hover:bg-info-soft/40">
                        <UserSearch className="size-3.5" /> Engage specialist
                      </button>
                    )}
                  </div>

                  {/* Not applicable is a decision on the record: it does not commit
                      without a reason, and it is written to the audit log. */}
                  {naOpen && (
                    <div className="mt-2.5 rounded-md border border-medium/40 bg-medium-soft/25 p-2.5">
                      <label htmlFor="na-reason" className="text-2xs font-semibold uppercase tracking-wide text-medium">
                        Why does this clause not apply to SPF?
                      </label>
                      <textarea
                        id="na-reason"
                        value={naReason}
                        onChange={(e) => setNaReason(e.target.value)}
                        rows={2}
                        placeholder="e.g. the trigger condition is not met; SPF consumes rather than provides the regulated service"
                        className="mt-1.5 w-full resize-none rounded-md border border-border bg-background px-2.5 py-1.5 text-xs text-foreground outline-none placeholder:text-muted-foreground focus:border-info/50"
                      />
                      <div className="mt-2 flex items-center gap-2">
                        <Button
                          size="sm"
                          disabled={naReason.trim().length < 8}
                          title={naReason.trim().length < 8 ? 'Record the reason before marking this clause not applicable.' : undefined}
                          onClick={() => {
                            const reason = naReason.trim()
                            setClauseApplicability(p.id, false, reason)
                            setNaOpen(false)
                            setNaReason('')
                            pushToast({ title: 'Marked not applicable', description: `${p.id} recorded against ${personName(selfId)} with a reason.`, variant: 'info' })
                          }}
                        >
                          <CircleSlash className="size-4" /> Record decision
                        </Button>
                        <button onClick={() => { setNaOpen(false); setNaReason('') }} className="text-2xs font-medium text-muted-foreground hover:text-foreground">
                          Cancel
                        </button>
                        <span className="ml-auto text-2xs text-muted-foreground">Reversible; the trail keeps both decisions.</span>
                      </div>
                    </div>
                  )}

                  <p className="mt-1.5 text-2xs text-muted-foreground">Save maps this clause to a control (existing or new) and tracks it in the Control Library.</p>
                </div>
              ) : (
                <p className="mt-3 text-2xs text-muted-foreground">Save and specialist actions are available to the Compliance Officer or Company Secretary.</p>
              )}
            </div>
          )}

          <CopilotInline
            entityId={p.id}
            tabs={['ask', 'agents']}
            agentRun="mapping"
            suggestedQuestions={[
              `Which controls satisfy ${p.id}?`,
              `What evidence have we captured for ${p.id}?`,
              `What is the next task and who owns it?`,
              `What's the penalty if this clause is missed?`,
            ]}
          />
        </div>

        {/* Supporting */}
        <div className="space-y-4">
          {/* Applicability */}
          {p.applicable !== undefined && (
            <div className="card-surface p-3.5">
              <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-foreground"><Building2 className="size-4 text-info" /> Applies to SPF</h3>
              {p.applicable ? <StatusChip status="Applicable" tone="ok" /> : <StatusChip status="Not applicable" tone="neutral" />}
              {p.applicabilityBasis && <p className="mt-1.5 text-2xs text-muted-foreground">{p.applicabilityBasis}</p>}
            </div>
          )}

          {(p.frequency || p.nextDue) && (
            <div className="card-surface p-3.5">
              <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-foreground"><CalendarClock className="size-4 text-info" /> How often / by when</h3>
              <div className="grid grid-cols-2 gap-3">
                <Meta label="Frequency">{p.frequency ?? '—'}</Meta>
                <Meta label="Next due">{p.nextDue ? fmtDate(p.nextDue) : '—'}</Meta>
              </div>
            </div>
          )}

          {/* Linked records — counts with jump links into the spine. */}
          <div className="card-surface p-3.5">
            <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-foreground"><Link2 className="size-4 text-info" /> Linked records</h3>
            <div className="space-y-1">
              <LinkRow label="Controls" count={controlIds.length} onClick={controlIds[0] ? () => navigate(`/controls/${controlIds[0]}`) : undefined} />
              <LinkRow label="Obligations" count={obligationIds.length} onClick={obligationIds[0] ? () => navigate(`/obligations/${obligationIds[0]}`) : undefined} />
              <LinkRow label="Evidence" count={evidenceIds.length} onClick={evidenceIds[0] ? () => navigate(`/evidence/${evidenceIds[0]}`) : undefined} />
              <LinkRow label="Tasks" count={taskIds.length} onClick={taskIds[0] ? () => navigate(`/tasks/${taskIds[0]}`) : undefined} />
            </div>
            {linkedControl && (
              <button onClick={() => navigate(`/controls/${linkedControl.id}`)} className="mt-2 group flex w-full items-center gap-2 rounded-md border border-ok/30 bg-ok-soft/30 px-2 py-1.5 text-left hover:bg-ok-soft/60">
                <ShieldCheck className="size-3.5 shrink-0 text-ok" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-xs font-medium text-foreground">Saved to {linkedControl.title}</span>
                  <span className="block text-2xs text-muted-foreground">{linkedControl.id} · {personName(linkedControl.owner)} · {linkedControl.frequency}{linkedControl.nextDue ? ` · due ${fmtDate(linkedControl.nextDue)}` : ''}</span>
                </span>
                <ArrowUpRight className="size-3 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </button>
            )}
          </div>

          {/* Source instrument */}
          <div className="card-surface p-3.5">
            <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-foreground"><ScrollText className="size-4 text-info" /> Source</h3>
            {inst && (
              <button onClick={() => navigate(`/sources/${inst.id}`)} className="group flex w-full items-start gap-2 rounded-md border border-border bg-background p-2 text-left hover:border-info/40 hover:bg-info-soft/40">
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-xs font-medium text-foreground">{inst.title}</span>
                  <span className="block text-2xs text-muted-foreground">{inst.instrumentType} · {inst.version ?? fmtDate(inst.dateOfIssue)} · {inst.status}</span>
                </span>
                <ArrowUpRight className="mt-0.5 size-3 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </button>
            )}
            <a href={p.sourceLink ?? inst?.sourceLink} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1.5 text-2xs font-medium text-info hover:underline"><ExternalLink className="size-3.5" /> Open full source</a>
          </div>
        </div>
      </div>

      {saving && <SaveClauseChooser clause={p} onClose={() => setSaving(false)} />}
    </div>
  )
}

function Meta({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-2xs font-medium uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-0.5 text-sm text-foreground">{children}</div>
    </div>
  )
}

function LinkRow({ label, count, onClick }: { label: string; count: number; onClick?: () => void }) {
  const clickable = !!onClick && count > 0
  return (
    <button
      onClick={onClick}
      disabled={!clickable}
      className={cnLinkRow(clickable)}
    >
      <span className="text-xs text-foreground">{label}</span>
      <span className="tnum text-2xs font-semibold text-muted-foreground">{count}</span>
      <ArrowUpRight className={`size-3 ${clickable ? 'text-info' : 'text-muted-foreground/40'}`} />
    </button>
  )
}

function cnLinkRow(clickable: boolean) {
  return [
    'flex w-full items-center justify-between gap-2 rounded-md border px-2 py-1.5',
    clickable
      ? 'border-border bg-background hover:border-info/40 hover:bg-info-soft/40'
      : 'cursor-default border-dashed border-border bg-muted/20',
  ].join(' ')
}
