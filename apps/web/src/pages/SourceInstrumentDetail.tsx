import * as React from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, ArrowUpRight, BookOpen, Building2, ListChecks, FilePlus2, Bell } from 'lucide-react'
import { InstrumentMasthead } from '@/components/sources/InstrumentMasthead'
import { DataTable, type Column, type TableFilter } from '@/components/DataTable'
import { StatusChip } from '@/components/StatusChip'
import { SeverityBadge } from '@/components/SeverityBadge'
import { Button } from '@/components/ui/Button'
import { CopilotInline } from '@/components/copilot/CopilotInline'
import { getInstrument } from '@/data'
import { provisionsForInstrument, effectiveClause, statusTone, awaitingDecision } from '@/lib/sources'
import { fmtDate } from '@/lib/time'
import { useApp } from '@/store'
import { useEffectiveRegChanges } from '@/lib/effective'
import { useCanAct } from '@/lib/gating'
import { cn } from '@/lib/utils'
import type { SourceProvision } from '@/types'
import { ComingSoon } from './ComingSoon'

function severityRank(s: SourceProvision['severity']): number {
  return ['Low', 'Medium', 'High', 'Critical'].indexOf(s ?? 'Low')
}

export function SourceInstrumentDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const sessionInstruments = useApp((s) => s.sessionInstruments)
  const sessionProvisions = useApp((s) => s.sessionProvisions)
  const sessionInst = id ? sessionInstruments.find((i) => i.id === id) : undefined
  const inst = (id ? getInstrument(id) : undefined) ?? sessionInst
  const overrides = useApp((s) => s.clauseOverrides)
  const pushToast = useApp((s) => s.pushToast)
  const addInstrumentChange = useApp((s) => s.addInstrumentChange)
  const canAdd = useCanAct({ kind: 'regchange.acknowledge' })
  const regChanges = useEffectiveRegChanges()
  const [adding, setAdding] = React.useState(false)

  // Created (session) acts resolve clauses from the session store; seeded acts
  // from the seed merged with clause-pipeline overrides.
  const clauses = !inst
    ? []
    : sessionInst
      ? sessionProvisions.filter((p) => p.instrumentId === inst.id)
      : provisionsForInstrument(inst.id).map((p) => effectiveClause(p, overrides))
  const pendingChanges = inst ? regChanges.filter((r) => r.instrumentId === inst.id && r.status !== 'Closed') : []

  if (!inst) return <ComingSoon title="Act not found" />

  const supersedes = inst.supersedesId ? getInstrument(inst.supersedesId) : undefined
  const supersededBy = inst.supersededById ? getInstrument(inst.supersededById) : undefined
  const awaitingCount = clauses.filter((c) => c.applicable && c.status && awaitingDecision(c.status)).length
  const savedCount = clauses.filter((c) => c.status === 'Saved').length
  const naCount = clauses.filter((c) => c.status === 'Not applicable').length

  const columns: Column<SourceProvision>[] = [
    {
      key: 'name',
      header: 'Compliance',
      sortValue: (c) => c.nameOfCompliance ?? c.title,
      headerClassName: 'w-[25%]',
      render: (c) => <span className="block truncate text-sm font-medium text-foreground" title={c.nameOfCompliance ?? c.title}>{c.nameOfCompliance ?? c.title}</span>,
    },
    {
      key: 'section',
      header: 'Section',
      sortValue: (c) => c.provision,
      headerClassName: 'w-[15%]',
      render: (c) => <span className="block truncate font-mono text-2xs text-info" title={c.provision}>{c.provision}</span>,
    },
    {
      key: 'description',
      header: 'Description',
      sortValue: (c) => c.briefDescription ?? '',
      headerClassName: 'w-[22%]',
      render: (c) => <span className="block truncate text-xs text-muted-foreground" title={c.briefDescription}>{c.briefDescription ?? '—'}</span>,
    },
    {
      key: 'severity',
      header: 'Severity',
      sortValue: (c) => severityRank(c.severity),
      headerClassName: 'w-[11%]',
      render: (c) => (c.severity ? <SeverityBadge severity={c.severity} dense /> : <span className="text-2xs text-muted-foreground">—</span>),
    },
    {
      key: 'frequency',
      header: 'Frequency',
      sortValue: (c) => c.frequency ?? '',
      headerClassName: 'w-[11%]',
      render: (c) => <span className="block truncate text-xs text-muted-foreground">{c.frequency ?? '—'}</span>,
    },
    {
      key: 'due',
      header: 'Due',
      sortValue: (c) => (c.nextDue ? new Date(c.nextDue).getTime() : Infinity),
      headerClassName: 'w-[8%]',
      render: (c) => <span className="block truncate text-xs text-muted-foreground">{c.nextDue ? fmtDate(c.nextDue) : '—'}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      sortValue: (c) => c.status ?? 'zz',
      headerClassName: 'w-[8%]',
      render: (c) => (c.status ? <StatusChip status={c.status} tone={statusTone(c.status)} /> : <span className="text-2xs text-muted-foreground">Ref</span>),
    },
  ]

  const statusOptions = Array.from(new Set(clauses.map((c) => c.status).filter(Boolean))) as string[]
  const filters: TableFilter<SourceProvision>[] = [
    { key: 'status', label: 'Status', options: statusOptions, predicate: (c, v) => c.status === v },
    { key: 'severity', label: 'Severity', options: ['Critical', 'High', 'Medium', 'Low'], predicate: (c, v) => c.severity === v },
  ]

  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-2">
        <button onClick={() => navigate('/sources')} className="inline-flex items-center gap-1 rounded text-xs font-medium text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <ArrowLeft className="size-3.5" /> Source Library
        </button>
        <Button
          variant="outline"
          size="sm"
          disabled={!canAdd}
          title={canAdd ? undefined : 'Registering a circular / new version is done by the Compliance team.'}
          onClick={() => setAdding(true)}
        >
          <FilePlus2 className="size-4" /> Add circular / new version
        </Button>
      </div>

      <InstrumentMasthead
        inst={inst}
        supersedes={supersedes}
        supersededBy={supersededBy}
        onNavigate={(sid) => navigate(`/sources/${sid}`)}
        onOpenDocument={() =>
          pushToast({
            title: 'Source document opened',
            description: inst.attachedDocument?.filename ?? `${inst.id}.pdf`,
            variant: 'success',
          })
        }
      />

      {pendingChanges.length > 0 && (
        <button
          onClick={() => navigate(`/reg-change/${pendingChanges[0].id}`)}
          className="mb-4 flex w-full items-center gap-2 rounded-lg border border-medium/40 bg-medium-soft/40 px-3.5 py-2 text-left transition-colors hover:bg-medium-soft/70"
        >
          <Bell className="size-4 shrink-0 text-medium" />
          <span className="min-w-0 flex-1 text-sm text-foreground">
            {pendingChanges.length} update{pendingChanges.length === 1 ? '' : 's'} registered against this Act — under review
            <span className="ml-1.5 font-mono text-2xs text-muted-foreground">{pendingChanges[0].id}</span>
          </span>
          <ArrowUpRight className="size-4 shrink-0 text-muted-foreground" />
        </button>
      )}

      {/* Briefing: what the act covers + how it affects Sankalp */}
      <div className="card-surface mb-4 grid grid-cols-1 divide-y divide-border/70 sm:grid-cols-2 sm:divide-x sm:divide-y-0">
        <div className="p-4">
          <h3 className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold text-foreground"><BookOpen className="size-4 text-info" /> What this covers</h3>
          <p className="text-sm leading-relaxed text-foreground">{inst.summary ?? `${inst.title} - see the clauses below.`}</p>
        </div>
        <div className="p-4">
          <h3 className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold text-foreground"><Building2 className="size-4 text-info" /> How it affects Sankalp</h3>
          <p className="text-sm leading-relaxed text-foreground">{inst.applicability ?? 'Applicability under review.'}</p>
        </div>
      </div>

      {/* Clause pipeline — a secondary read of where this act's clauses stand, above the working table */}
      <div className="mb-2 flex flex-wrap items-center gap-x-4 gap-y-1.5">
        <div className="flex items-center gap-1.5 text-xs">
          <ListChecks className="size-3.5 text-muted-foreground" />
          <span className="text-muted-foreground"><span className="font-semibold tnum text-foreground">{clauses.length}</span> clauses</span>
          {awaitingCount > 0 && <span className="text-medium">· <span className="font-semibold tnum">{awaitingCount}</span> awaiting</span>}
          <span className="text-muted-foreground">· <span className="font-semibold tnum text-foreground">{savedCount}</span> saved</span>
        </div>
        {clauses.length > 0 && (
          <div
            className="flex h-1.5 w-40 shrink-0 overflow-hidden rounded-full bg-border/50"
            role="img"
            aria-label={`${savedCount} saved, ${awaitingCount} awaiting, ${naCount} not applicable of ${clauses.length} clauses`}
          >
            {savedCount > 0 && <span className="bg-ok" style={{ width: `${(savedCount / clauses.length) * 100}%` }} />}
            {awaitingCount > 0 && <span className="bg-medium" style={{ width: `${(awaitingCount / clauses.length) * 100}%` }} />}
            {naCount > 0 && <span className="bg-muted-foreground/50" style={{ width: `${(naCount / clauses.length) * 100}%` }} />}
          </div>
        )}
        <span className="ml-auto hidden text-2xs text-muted-foreground sm:block">Open a clause for its extract, penalty tiers and the save / specialist / Copilot workflow</span>
      </div>
      <DataTable
        data={clauses}
        columns={columns}
        tableClassName="table-fixed"
        searchKeys={['id', (c) => c.nameOfCompliance ?? c.title, 'provision', (c) => c.briefDescription ?? '']}
        searchPlaceholder="Search clause, section or description…"
        filters={filters}
        initialSort={{ key: 'section', dir: 'asc' }}
        onRowClick={(c) => navigate(`/sources/section/${c.id}`)}
      />

      <div className="mt-4">
        <CopilotInline entityId={inst.id} tabs={['ask', 'agents']} defaultTab="ask" agentRun="scan" collapsible defaultCollapsed />
      </div>

      {adding && (
        <AddChangeModal
          instrumentTitle={inst.title}
          onClose={() => setAdding(false)}
          onSubmit={(kind, title) => {
            const rid = addInstrumentChange(inst.id, kind, title)
            setAdding(false)
            if (rid) navigate(`/reg-change/${rid}`)
          }}
        />
      )}
    </div>
  )
}

function AddChangeModal({
  instrumentTitle,
  onClose,
  onSubmit,
}: {
  instrumentTitle: string
  onClose: () => void
  onSubmit: (kind: 'Circular' | 'New version', title: string) => void
}) {
  const [kind, setKind] = React.useState<'Circular' | 'New version'>('Circular')
  const [title, setTitle] = React.useState('')
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-foreground/20 backdrop-blur-[1px] animate-fade-in" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md rounded-xl border border-border bg-background p-4 shadow-xl animate-slide-up">
        <div className="mb-1 flex items-center gap-1.5">
          <FilePlus2 className="size-4 text-info" />
          <h3 className="text-sm font-semibold text-foreground">Add a circular / new version</h3>
        </div>
        <p className="mb-3 text-2xs text-muted-foreground">
          Register an update to <span className="font-medium text-foreground">{instrumentTitle}</span>. It enters the Regulatory
          Change pipeline, flags the obligations and controls this Act produced, and alerts the owner to assess and acknowledge.
        </p>
        <div className="space-y-3">
          <div>
            <div className="mb-1 text-2xs font-medium uppercase tracking-wide text-muted-foreground">Type</div>
            <div className="flex gap-1.5">
              {(['Circular', 'New version'] as const).map((k) => (
                <button
                  key={k}
                  onClick={() => setKind(k)}
                  className={cn('rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors', kind === k ? 'border-info bg-info-soft text-info' : 'border-border text-muted-foreground hover:bg-muted')}
                >
                  {k}
                </button>
              ))}
            </div>
          </div>
          <label className="block">
            <span className="text-2xs font-medium uppercase tracking-wide text-muted-foreground">Summary</span>
            <input
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && title.trim() && onSubmit(kind, title.trim())}
              placeholder={kind === 'Circular' ? 'e.g. Clarification on breach-intimation timelines' : 'e.g. 2026 amendment — revised retention rule'}
              className="mt-1 w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </label>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" disabled={!title.trim()} onClick={() => onSubmit(kind, title.trim())}>
            <FilePlus2 className="size-4" /> Register &amp; route
          </Button>
        </div>
      </div>
    </div>
  )
}
