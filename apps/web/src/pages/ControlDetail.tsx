import * as React from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Bot, Hand, Download, ShieldCheck, Layers, Activity, ArrowUpRight, CheckCircle2, XCircle, MinusCircle, ScrollText, Scale, CalendarClock, Paperclip } from 'lucide-react'
import { cn } from '@/lib/utils'
import { PageHeader } from '@/components/PageHeader'
import { StatusChip } from '@/components/StatusChip'
import { FrameworkPill } from '@/components/FrameworkPill'
import { EvidenceList } from '@/components/EvidenceList'
import { Avatar } from '@/components/Avatar'
import { Button } from '@/components/ui/Button'
import { Tabs } from '@/components/ui/Tabs'
import { SeverityBadge } from '@/components/SeverityBadge'
import { SourceList, SourceChip } from '@/components/SourceRef'
import { ProofChain } from '@/components/ProofChain'
import { resolveProofChain } from '@/lib/proofChain'
import { CopilotInline } from '@/components/copilot/CopilotInline'
import { getIssue, getInstrument, WORLD } from '@/data'
import { clausesForControl } from '@/lib/sources'
import { controlLedger, filingTiming } from '@/lib/cycles'
import { personName, PEOPLE_BY_ID } from '@/data/people'
import { fmtDate } from '@/lib/time'
import { useApp } from '@/store'
import { useEffectiveControl } from '@/lib/effective'
import { useCanAct } from '@/lib/gating'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/api/client'
import { RaiseExceptionButton } from './issues/RaiseExceptionButton'
import { ComingSoon } from './ComingSoon'
import type { SourceProvision } from '@/types'

const RESULT_ICON = {
  Pass: <CheckCircle2 className="size-4 text-ok" />,
  Fail: <XCircle className="size-4 text-critical" />,
  Partial: <MinusCircle className="size-4 text-medium" />,
}

/** Group satisfied clauses by their act, preserving first-seen order. */
function groupByAct(clauses: SourceProvision[]): { instrumentId: string; clauses: SourceProvision[] }[] {
  const order: string[] = []
  const map = new Map<string, SourceProvision[]>()
  for (const c of clauses) {
    if (!map.has(c.instrumentId)) {
      map.set(c.instrumentId, [])
      order.push(c.instrumentId)
    }
    map.get(c.instrumentId)!.push(c)
  }
  return order.map((instrumentId) => ({ instrumentId, clauses: map.get(instrumentId)! }))
}

export function ControlDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const openDrawer = useApp((s) => s.openDrawer)
  const retestControl = useApp((s) => s.retestControl)
  const setEvidenceDraft = useApp((s) => s.setEvidenceDraft)
  const clauseOverrides = useApp((s) => s.clauseOverrides)
  const taskWorkflow = useApp((s) => s.taskWorkflow)
  const canRetest = useCanAct({ kind: 'control.retest' })
  const control = useEffectiveControl(id ?? '')
  const apiControl = useQuery({
    queryKey: ['api-control', id],
    queryFn: () => api.get<ApiControl>(`/controls/${id}`),
    enabled: !control && Boolean(id),
    retry: false,
  })
  const [tab, setTab] = React.useState('overview')
  // `?ask=<n>` fires one suggested Copilot question on arrival (guided tour).
  // Read-only: it selects a question by index and nothing else.
  const [search] = useSearchParams()
  const askParam = Number(search.get('ask'))
  const autoAsk = search.has('ask') && Number.isInteger(askParam) && askParam >= 0 ? askParam : undefined

  if (!control) return apiControl.isLoading ? <p className="text-sm text-muted-foreground">Loading control…</p> : apiControl.data ? <ApiControlDetail control={apiControl.data} /> : <ComingSoon title="Control not found" />

  const evidence = WORLD.evidence.filter((e) => e.linkedControls.includes(control.id))
  const issues = control.linkedIssues.map((i) => getIssue(i)).filter(Boolean)
  const owner = PEOPLE_BY_ID[control.owner]
  // Sources pipeline — the clauses (across acts) this control satisfies.
  const satisfied = clausesForControl(control.id, clauseOverrides)
  const satisfiedByAct = groupByAct(satisfied)
  // The obligations this control satisfies (control -> clause -> obligation), so a
  // user can walk control -> obligation -> evidence (E-E4).
  const satisfiedClauseIds = new Set(satisfied.map((c) => c.id))
  const obligationsSatisfied = WORLD.obligations.filter((o) => o.sourceRefs?.some((r) => satisfiedClauseIds.has(r)))
  // Period-by-period evidence ledger (E3.1).
  const ledger = controlLedger(control, evidence)
  const chain = resolveProofChain({ kind: 'control', control, obligation: obligationsSatisfied[0] }, { taskWorkflow })

  const tabs = [
    { key: 'overview', label: 'Overview' },
    { key: 'mappings', label: 'Mappings', count: control.frameworks.length },
    { key: 'history', label: 'Evidence ledger', count: ledger.length },
    { key: 'evidence', label: 'Evidence', count: evidence.length },
    { key: 'issues', label: 'Issues', count: issues.length },
  ]

  return (
    <div>
      <button
        onClick={() => navigate('/controls')}
        className="mb-3 inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" /> Control Library
      </button>

      <PageHeader
        eyebrow={
          <span className="inline-flex items-center gap-1.5">
            <span className="font-mono text-info">{control.id}</span>
            {control.automation === 'CCM' ? (
              <span className="inline-flex items-center gap-1 rounded bg-ok-soft px-1.5 py-0.5 text-2xs font-medium text-ok">
                <Bot className="size-3" /> CCM-automated
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded bg-muted px-1.5 py-0.5 text-2xs font-medium text-muted-foreground">
                <Hand className="size-3" /> Manual
              </span>
            )}
          </span>
        }
        title={control.title}
        description={control.description}
        actions={
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-md border border-border px-2 py-1.5 text-xs">
              {RESULT_ICON[control.result]}
              <span className="font-medium text-foreground">{control.result}</span>
            </span>
            {control.automation === 'CCM' && control.ccmRuleId && (
              <Button variant="outline" size="sm" onClick={() => navigate(`/ccm/${control.ccmRuleId}`)}>
                <Activity className="size-4" /> View CCM rule
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              disabled={!canRetest}
              title={canRetest ? undefined : 'Recording a test is restricted to the Control Owner, Auditor or Executive.'}
              onClick={() => retestControl(control.id)}
            >
              Re-test
            </Button>
            <RaiseExceptionButton
              refId={control.id}
              refTitle={control.title}
              ownerId={control.owner}
              severity={control.result === 'Fail' ? 'High' : 'Medium'}
            />
          </div>
        }
      />

      <ProofChain nodes={chain} className="mb-4" />

      {/* framework mapping strip */}
      <div className="mb-4 flex flex-wrap items-center gap-2 rounded-lg border border-info/30 bg-info-soft/40 px-3.5 py-2.5">
        <Layers className="size-4 text-info" />
        <span className="text-2xs font-semibold uppercase tracking-wide text-muted-foreground">Framework mappings</span>
        {control.mappedFrameworkRefs.map((m) => (
          <FrameworkPill key={m.framework} framework={m.framework} refText={m.ref} />
        ))}
        <span className="ml-auto text-2xs tnum text-muted-foreground">{control.frameworks.length} frameworks · {evidence.length} evidence items</span>
      </div>

      <Tabs tabs={tabs} active={tab} onChange={setTab} className="mb-4" />

      {tab === 'overview' && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <div className="card-surface p-4">
            <h3 className="mb-3 text-sm font-semibold text-foreground">Control attributes</h3>
            <div className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3">
              <Attr label="Owner">
                <span className="inline-flex items-center gap-1.5">
                  <Avatar id={control.owner} size={20} /> <span className="text-xs">{owner.name}</span>
                </span>
              </Attr>
              <Attr label="Line of defence">{owner.lod}</Attr>
              <Attr label="Type">{control.type}</Attr>
              <Attr label="Automation">{control.automation === 'CCM' ? 'Continuous (CCM)' : 'Manual'}</Attr>
              <Attr label="Cadence">{control.frequency}</Attr>
              <Attr label="Next due">{control.nextDue ? fmtDate(control.nextDue) : '—'}</Attr>
              <Attr label="Last tested">{fmtDate(control.lastTested)}</Attr>
              <Attr label="Result">
                <StatusChip status={control.result} />
              </Attr>
              <Attr label="Evidence items">{evidence.length}</Attr>
            </div>
            <div className="mt-3 border-t border-border pt-3">
              <div className="text-2xs font-medium uppercase tracking-wide text-muted-foreground">Control activity — what must be done</div>
              <p className="mt-1 text-sm text-foreground">{control.description}</p>
            </div>
          </div>
          <div className="card-surface p-4">
            <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-foreground">
              <ShieldCheck className="size-4 text-ok" /> Risks mitigated
            </h3>
            {control.linkedRisks.length > 0 ? (
              <div className="space-y-1">
                {control.linkedRisks.slice(0, 6).map((rid) => (
                  <button
                    key={rid}
                    onClick={() => navigate(`/risks/${rid}`)}
                    className="flex w-full items-center gap-2 rounded-md border border-border bg-background px-2 py-1.5 text-left hover:border-info/40 hover:bg-info-soft/40"
                  >
                    <span className="font-mono text-2xs font-semibold text-info">{rid}</span>
                    <ArrowUpRight className="ml-auto size-3 text-muted-foreground" />
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">No risks currently mapped to this control.</p>
            )}
            {control.sourceRefs && control.sourceRefs.length > 0 && (
              <div className="mt-4 border-t border-border pt-3">
                <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-foreground">
                  <ScrollText className="size-4 text-info" /> Source
                </h3>
                <SourceList ids={control.sourceRefs} />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Implementation & assurance card removed per request */}

      {tab === 'overview' && satisfied.length > 0 && (
        <div className="card-surface mt-4 p-4">
          <h3 className="mb-1 flex items-center gap-1.5 text-sm font-semibold text-foreground">
            <Layers className="size-4 text-info" /> Satisfies — clauses across acts
          </h3>
          <p className="mb-3 text-2xs text-muted-foreground tnum">
            {satisfied.length} clause{satisfied.length === 1 ? '' : 's'} · {satisfiedByAct.length} act{satisfiedByAct.length === 1 ? '' : 's'}
          </p>
          <div className="space-y-3">
            {satisfiedByAct.map(({ instrumentId, clauses }) => {
              const inst = getInstrument(instrumentId)
              return (
                <div key={instrumentId}>
                  <button onClick={() => inst && navigate(`/sources/${inst.id}`)} className="mb-1 inline-flex items-center gap-1.5 text-xs font-semibold text-foreground hover:text-info">
                    <Scale className="size-3.5 text-info" /> {inst?.title ?? instrumentId}
                    <span className="rounded bg-muted px-1 py-0 text-2xs font-medium text-muted-foreground">{inst?.authority}</span>
                  </button>
                  <div className="space-y-1">
                    {clauses.map((c) => (
                      <button key={c.id} onClick={() => navigate(`/sources/section/${c.id}`)} className="group flex w-full items-center gap-2 rounded-md border border-border bg-background px-2 py-1.5 text-left hover:border-info/40 hover:bg-info-soft/40">
                        <span className="font-mono text-2xs font-semibold text-info">{c.id}</span>
                        <span className="min-w-0 flex-1 truncate text-xs text-foreground">{c.nameOfCompliance ?? c.title}</span>
                        {c.severity && <SeverityBadge severity={c.severity} dense />}
                        <ArrowUpRight className="size-3 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                      </button>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {tab === 'overview' && obligationsSatisfied.length > 0 && (
        <div className="card-surface mt-4 p-4">
          <h3 className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-foreground">
            <CalendarClock className="size-4 text-info" /> Obligations this control satisfies
            <span className="rounded-full bg-muted px-1.5 py-0 text-2xs font-semibold tnum text-muted-foreground">{obligationsSatisfied.length}</span>
          </h3>
          <div className="space-y-1">
            {obligationsSatisfied.map((o) => {
              const t = filingTiming(o)
              return (
                <button key={o.id} onClick={() => navigate(`/obligations/${o.id}`)} className="group flex w-full items-center gap-2 rounded-md border border-border bg-background px-2 py-1.5 text-left hover:border-info/40 hover:bg-info-soft/40">
                  <span className="font-mono text-2xs font-semibold text-info">{o.id}</span>
                  <span className="min-w-0 flex-1 truncate text-xs text-foreground">{o.title}</span>
                  <StatusChip status={o.status} />
                  {o.status === 'Filed' && <span className={cn('rounded px-1.5 py-0 text-2xs font-medium', t === 'late' ? 'bg-medium-soft text-medium' : 'bg-ok-soft text-ok')}>{t === 'late' ? 'late' : 'on time'}</span>}
                  <ArrowUpRight className="size-3 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </button>
              )
            })}
          </div>
        </div>
      )}

      {tab === 'overview' && (
        <div data-tour="copilot" className="mt-4">
          <CopilotInline entityId={control.id} tabs={['ask']} autoAskIndex={autoAsk} />
        </div>
      )}

      {tab === 'mappings' && (
        <div className="card-surface p-4">
          <h3 className="mb-3 text-sm font-semibold text-foreground">Cross-framework mapping</h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {control.mappedFrameworkRefs.map((m) => (
              <div key={m.framework} className="flex items-center gap-3 rounded-lg border border-border p-3">
                <FrameworkPill framework={m.framework} />
                <div className="min-w-0">
                  <div className="font-mono text-sm font-semibold text-foreground">{m.ref}</div>
                  <div className="text-2xs text-muted-foreground">{m.framework} clause satisfied by {control.id}</div>
                </div>
                <div className="ml-auto flex items-center gap-2">
                  {m.sourceRef && <SourceChip id={m.sourceRef} />}
                  <CheckCircle2 className="size-4 text-ok" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'history' && (
        <div className="card-surface overflow-hidden">
          <div className="border-b border-border px-4 py-2.5">
            <h3 className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
              <CalendarClock className="size-4 text-info" /> Evidence ledger · period by period
            </h3>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-2xs font-semibold uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-2">Period</th>
                <th className="px-4 py-2">Due</th>
                <th className="px-4 py-2">Evidence filed</th>
                <th className="px-4 py-2">On time</th>
                <th className="px-4 py-2">Result</th>
              </tr>
            </thead>
            <tbody>
              {ledger.map((row, i) => (
                <tr key={i} className="border-b border-border/70 last:border-0">
                  <td className="px-4 py-2 text-xs text-foreground">{row.period}{i === 0 && <span className="ml-1 text-2xs text-muted-foreground">· current</span>}</td>
                  <td className="px-4 py-2 text-xs tnum text-muted-foreground">{fmtDate(row.dueDate)}</td>
                  <td className="px-4 py-2">
                    {row.evidenceId ? (
                      <button onClick={() => navigate(`/evidence/${row.evidenceId}`)} className="inline-flex items-center gap-1 rounded border border-ok/30 bg-ok-soft/50 px-1.5 py-0.5 text-2xs text-ok hover:underline">
                        <Paperclip className="size-3" /> {row.evidenceId} · {row.capturedAt ? fmtDate(row.capturedAt) : ''}
                      </button>
                    ) : (
                      <span className="text-2xs text-muted-foreground">— no evidence</span>
                    )}
                  </td>
                  <td className="px-4 py-2">
                    <span className={cn('rounded px-1.5 py-0.5 text-2xs font-medium', row.timing === 'on-time' ? 'bg-ok-soft text-ok' : row.timing === 'late' ? 'bg-medium-soft text-medium' : 'bg-muted text-muted-foreground')}>
                      {row.timing === 'on-time' ? 'On time' : row.timing === 'late' ? 'Late' : 'Pending'}
                    </span>
                  </td>
                  <td className="px-4 py-2"><StatusChip status={row.result} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'evidence' && (
        <div className="card-surface p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">Evidence ({evidence.length})</h3>
            <div className="flex items-center gap-2">
              <span className="text-2xs text-muted-foreground">
                {evidence.filter((e) => e.auto).length} auto-captured · {evidence.filter((e) => !e.auto).length} manual
              </span>
              <Button variant="outline" size="sm" onClick={() => { setEvidenceDraft({ controlId: control.id }); navigate('/evidence/new') }}>
                Attach evidence
              </Button>
            </div>
          </div>
          <EvidenceList items={evidence} />
        </div>
      )}

      {tab === 'issues' && (
        <div className="card-surface overflow-hidden">
          {issues.length > 0 ? (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-2xs font-semibold uppercase tracking-wide text-muted-foreground">
                  <th className="px-4 py-2">Issue</th>
                  <th className="px-4 py-2">Severity</th>
                  <th className="px-4 py-2">Source</th>
                  <th className="px-4 py-2">Owner</th>
                  <th className="px-4 py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {issues.map((iss) => (
                  <tr
                    key={iss!.id}
                    onClick={() => navigate(`/issues/${iss!.id}`)}
                    className="cursor-pointer border-b border-border/70 last:border-0 hover:bg-info-soft/30"
                  >
                    <td className="px-4 py-2">
                      <span className="font-mono text-2xs font-semibold text-info">{iss!.id}</span>
                      <span className="ml-2 text-xs text-foreground">{iss!.title}</span>
                    </td>
                    <td className="px-4 py-2"><SeverityBadge severity={iss!.severity} dense /></td>
                    <td className="px-4 py-2 text-xs text-muted-foreground">{iss!.source}</td>
                    <td className="px-4 py-2 text-xs text-foreground">{personName(iss!.owner)}</td>
                    <td className="px-4 py-2"><StatusChip status={iss!.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="px-4 py-6 text-center text-xs text-muted-foreground">
              No open issues — control operating effectively.
            </div>
          )}
        </div>
      )}

      <div className="mt-4 flex justify-end">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => openDrawer({ kind: 'export-pdf', title: `Control sheet — ${control.id}`, payload: { filename: `${control.id}-control-sheet.pdf` } })}
        >
          <Download className="size-4" /> Export control sheet
        </Button>
      </div>
    </div>
  )
}

interface ApiControl {
  id: string
  title: string
  shortTitle: string
  description: string | null
  owner: { fullName: string; department: string }
  clausesByAct: Record<string, { instrument: string; citation: string | null; clauses: Array<{ id: string; clauseRef: string; shortTitle: string; pageNumber: number | null; instrumentId: string }> }>
  obligations: Array<{ id: string; shortTitle: string; regulator: string; frequency: string; cycleCount: number }>
}

function ApiControlDetail({ control }: { control: ApiControl }) {
  return (
    <div className="space-y-4">
      <Link to="/controls" className="text-2xs text-muted-foreground hover:underline">← Control Library</Link>
      <PageHeader
        eyebrow={<span className="font-mono text-info">{control.id}</span>}
        title={control.title}
        description={control.description ?? 'Control created from a source clause.'}
      />
      <div className="card-surface p-4">
        <h2 className="text-sm font-semibold text-foreground">Control attributes</h2>
        <div className="mt-3 grid gap-3 text-xs sm:grid-cols-2">
          <div><div className="text-2xs uppercase tracking-wide text-muted-foreground">Owner</div><div className="mt-0.5 text-foreground">{control.owner.fullName}</div></div>
          <div><div className="text-2xs uppercase tracking-wide text-muted-foreground">Department</div><div className="mt-0.5 text-foreground">{control.owner.department}</div></div>
        </div>
      </div>
      <div className="card-surface p-4">
        <h2 className="text-sm font-semibold text-foreground">Satisfies — clauses across acts</h2>
        <div className="mt-3 space-y-2">
          {Object.entries(control.clausesByAct).flatMap(([, group]) => group.clauses.map((clause) => (
            <Link key={clause.id} to={`/sources/clause/${clause.id}`} className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-xs hover:border-info/50 hover:bg-info-soft/30">
              <span><span className="font-medium text-foreground">{clause.shortTitle}</span><span className="ml-2 text-2xs text-muted-foreground">{group.instrument} · {clause.clauseRef}</span></span>
              <span className="font-mono text-2xs text-info">{clause.id}</span>
            </Link>
          ))) }
          {Object.keys(control.clausesByAct).length === 0 && <p className="text-xs text-muted-foreground">No source clauses attached yet.</p>}
        </div>
      </div>
      <div className="card-surface p-4">
        <h2 className="text-sm font-semibold text-foreground">Obligations</h2>
        {control.obligations.length === 0 ? <p className="mt-2 text-xs text-muted-foreground">No obligations created yet.</p> : control.obligations.map((obligation) => <Link key={obligation.id} to={`/obligations/${obligation.id}`} className="mt-2 block text-xs text-info hover:underline">{obligation.shortTitle} · {obligation.frequency}</Link>)}
      </div>
    </div>
  )
}

function Attr({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-2xs font-medium uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-0.5 text-sm text-foreground">{children}</div>
    </div>
  )
}

