import * as React from 'react'
import { useNavigate } from 'react-router-dom'
import { Scale, ScrollText, CheckCircle2, AlertTriangle, Download, Search, ChevronRight, Sparkles, FileText } from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import { StatusChip } from '@/components/StatusChip'
import { Button } from '@/components/ui/Button'
import { StatGroup, SavedViews, GroupedList, type Stat, type SavedView, type ListGroup } from '@/components/kit'
import { WORLD } from '@/data'
import { instrumentSummary, actStatus, type InstrumentSummary } from '@/lib/sources'
import { fmtDate } from '@/lib/time'
import { useApp } from '@/store'
import { useScope, passesInstrumentDeptFilter } from '@/lib/access'
import { useCanAct } from '@/lib/gating'
import { DepartmentSelect, initialDepartment, ScopeEmpty } from '@/components/ScopeBanner'
import { CreateSourceActWizard } from '@/components/CreateSourceActWizard'
import { cn } from '@/lib/utils'
import type { SourceInstrument } from '@/types'

type Bucket = 'needs' | 'tracked' | 'reference'
interface Row {
  inst: SourceInstrument
  summary: InstrumentSummary
  act?: 'Processing' | 'In review' | 'Tracked'
  bucket: Bucket
}

const ACT_TONE = { Processing: 'progress', 'In review': 'warn', Tracked: 'ok' } as const

function bucketOf(r: Omit<Row, 'bucket'>): Bucket {
  if (!r.act) return 'reference'
  return r.summary.awaiting > 0 ? 'needs' : 'tracked'
}

export function Sources() {
  const navigate = useNavigate()
  const pushToast = useApp((s) => s.pushToast)
  const overrides = useApp((s) => s.clauseOverrides)
  const sessionInstruments = useApp((s) => s.sessionInstruments)
  const sessionProvisions = useApp((s) => s.sessionProvisions)
  const canCreate = useCanAct({ kind: 'clause.save' }) // Compliance + Company Secretary (1.6)
  const scope = useScope()
  const [dept, setDept] = React.useState(() => initialDepartment(scope))
  React.useEffect(() => setDept(initialDepartment(scope)), [scope.seesAll, scope.department])
  const [view, setView] = React.useState<'all' | Bucket>('all')
  const [q, setQ] = React.useState('')
  const [createOpen, setCreateOpen] = React.useState(false)

  // A created (session) act is visible to its routed departments + Compliance/admin.
  const sessionVisible = (inst: SourceInstrument): boolean => {
    if (scope.seesAll) return dept === 'All departments' || (inst.departments ?? []).includes(dept as never)
    return (inst.departments ?? []).includes(scope.department as never)
  }

  // Department access boundary (1.1): a source act is visible to a department
  // that owns records deriving from it; Compliance and the administrator see all
  // (and can narrow via the dropdown). Session-created acts route explicitly.
  const rows: Row[] = React.useMemo(() => {
    const sessionRows: Row[] = sessionInstruments
      .filter(sessionVisible)
      .map((inst) => {
        const provs = sessionProvisions.filter((p) => p.instrumentId === inst.id)
        const summary: InstrumentSummary = { clauses: provs.length, reviewable: provs.length, applicable: provs.length, saved: 0, awaiting: provs.length }
        const base = { inst, summary, act: 'In review' as const }
        return { ...base, bucket: 'needs' as Bucket }
      })
    const seedRows: Row[] = WORLD.instruments
      .filter((inst) => passesInstrumentDeptFilter(inst.id, scope, dept))
      .map((inst) => {
        const base = { inst, summary: instrumentSummary(inst.id, overrides), act: actStatus(inst.id, overrides) }
        return { ...base, bucket: bucketOf(base) }
      })
    return [...sessionRows, ...seedRows]
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [overrides, scope, dept, sessionInstruments, sessionProvisions])

  const totalClauses = WORLD.sources.length
  const awaiting = rows.reduce((n, r) => n + r.summary.awaiting, 0)
  const saved = rows.reduce((n, r) => n + r.summary.saved, 0)
  const counts = {
    needs: rows.filter((r) => r.bucket === 'needs').length,
    tracked: rows.filter((r) => r.bucket === 'tracked').length,
    reference: rows.filter((r) => r.bucket === 'reference').length,
  }

  const filtered = rows.filter((r) => {
    if (view !== 'all' && r.bucket !== view) return false
    if (!q) return true
    const t = q.toLowerCase()
    return r.inst.title.toLowerCase().includes(t) || r.inst.id.toLowerCase().includes(t) || r.inst.authority.toLowerCase().includes(t)
  })

  const byAuthority = (a: Row, b: Row) => a.inst.authority.localeCompare(b.inst.authority) || b.summary.awaiting - a.summary.awaiting
  const groups: ListGroup<Row>[] = [
    { key: 'needs', label: 'Needs decision', tone: 'warn', items: filtered.filter((r) => r.bucket === 'needs').sort(byAuthority) },
    { key: 'tracked', label: 'Tracked', tone: 'ok', items: filtered.filter((r) => r.bucket === 'tracked').sort(byAuthority) },
    { key: 'reference', label: 'Reference standards', tone: 'neutral', defaultOpen: false, items: filtered.filter((r) => r.bucket === 'reference').sort(byAuthority) },
  ]

  const stats: Stat[] = [
    { label: 'Acts', value: WORLD.instruments.length, icon: <Scale className="size-3.5" />, tone: 'info', onClick: () => setView('all') },
    { label: 'Clauses', value: totalClauses, icon: <ScrollText className="size-3.5" /> },
    { label: 'Awaiting decision', value: awaiting, icon: <AlertTriangle className="size-3.5" />, tone: awaiting > 0 ? 'warn' : 'neutral', sub: `${counts.needs} acts`, onClick: () => setView('needs') },
    { label: 'Saved to controls', value: saved, icon: <CheckCircle2 className="size-3.5" />, tone: 'ok', onClick: () => setView('tracked') },
  ]

  const views: SavedView[] = [
    { id: 'all', label: 'All', count: rows.length },
    { id: 'needs', label: 'Needs decision', count: counts.needs },
    { id: 'tracked', label: 'Tracked', count: counts.tracked },
    { id: 'reference', label: 'Reference', count: counts.reference },
  ]

  return (
    <div>
      <div data-tour="sources-intake">
      <PageHeader
        eyebrow="Compliance"
        title="Source Library"
        description={
          <>
            {WORLD.instruments.length} instruments · {totalClauses} clauses. Internal duties are held under{' '}
            <button onClick={() => navigate('/policies')} className="font-medium text-info hover:underline">
              policies
            </button>
            .
          </>
        }
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate('/policies')}>
              <FileText className="size-4" /> Internal policies
            </Button>
            <Button size="sm" disabled={!canCreate} title={canCreate ? undefined : 'Source-act creation is restricted to Compliance and the Company Secretary.'} onClick={() => setCreateOpen(true)}>
              <Sparkles className="size-4" /> Create source act
            </Button>
            <Button variant="outline" size="sm" onClick={() => pushToast({ title: 'Source register exported', description: 'source-library-register.csv.', variant: 'success' })}>
              <Download className="size-4" /> Export
            </Button>
          </div>
        }
      />

      <CreateSourceActWizard open={createOpen} onClose={() => setCreateOpen(false)} />

      <StatGroup className="mb-4" stats={stats} />

      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <DepartmentSelect value={dept} onChange={setDept} />
          <SavedViews views={views} active={view} onSelect={(v) => setView(v as 'all' | Bucket)} />
        </div>
        <label className="flex h-8 w-64 items-center gap-2 rounded-md border border-border bg-muted/40 px-2.5 text-muted-foreground focus-within:bg-background">
          <Search className="size-3.5" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search act, id or authority"
            className="w-full bg-transparent text-xs text-foreground outline-none placeholder:text-muted-foreground"
          />
        </label>
      </div>
      </div>

      {!scope.seesAll && rows.length === 0 ? (
        <ScopeEmpty entity="source acts" />
      ) : (
      <GroupedList
        groups={groups}
        renderItem={(r) => (
          <button
            key={r.inst.id}
            onClick={() => navigate(`/sources/${r.inst.id}`)}
            className="group flex w-full items-center gap-3 px-3.5 py-2.5 text-left transition-colors hover:bg-info-soft/30"
          >
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium text-foreground">{r.inst.title}</div>
              <div className="mt-0.5 flex items-center gap-2 text-2xs text-muted-foreground">
                <span className="font-mono">{r.inst.id}</span>
                <span>·</span>
                <span>{r.inst.authority}</span>
                <span className="rounded bg-info-soft px-1.5 py-0 font-medium text-info">{r.inst.instrumentType}</span>
                {r.inst.createdInSession && <span className="rounded bg-accent/15 px-1.5 py-0 font-medium text-accent-foreground">created · AI-assisted</span>}
                <span>·</span>
                <span>updated {fmtDate(r.inst.dateOfIssue)}</span>
              </div>
            </div>
            <span className="hidden shrink-0 text-2xs tnum text-muted-foreground sm:block">{r.summary.clauses} clauses</span>
            <span className="w-20 shrink-0 text-right">
              {r.summary.awaiting > 0 ? (
                <span className="rounded bg-medium-soft px-1.5 py-0.5 text-2xs font-semibold text-medium">{r.summary.awaiting} awaiting</span>
              ) : r.summary.saved > 0 ? (
                <span className="inline-flex items-center gap-0.5 text-2xs text-ok"><CheckCircle2 className="size-3" /> tracked</span>
              ) : (
                <span className="text-2xs text-muted-foreground">-</span>
              )}
            </span>
            <span className="w-24 shrink-0">
              {r.act ? <StatusChip status={r.act} tone={ACT_TONE[r.act]} /> : <span className="text-2xs text-muted-foreground">Reference</span>}
            </span>
            <ChevronRight className={cn('size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5')} />
          </button>
        )}
      />
      )}
    </div>
  )
}
