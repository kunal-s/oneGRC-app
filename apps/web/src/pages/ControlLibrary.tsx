import * as React from 'react'
import { useNavigate } from 'react-router-dom'
import { Download, Bot, Hand, Layers, ShieldAlert, ShieldCheck } from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import { DataTable, type Column, type TableFilter } from '@/components/DataTable'
import { StatusChip } from '@/components/StatusChip'
import { FrameworkPills } from '@/components/FrameworkPill'
import { Avatar } from '@/components/Avatar'
import { Button } from '@/components/ui/Button'
import { StatGroup, SavedViews, type Stat, type SavedView } from '@/components/kit'
import { WORLD } from '@/data'
import { clausesForControl } from '@/lib/sources'
import { personName } from '@/data/people'
import { fmtDate, fmtRelative } from '@/lib/time'
import { useApp } from '@/store'
import { ReportMenu } from '@/components/kit/ReportMenu'
import { reportsForModule } from '@/components/kit/reports'
import { useEffectiveControls } from '@/lib/effective'
import { useScope, passesDeptFilter } from '@/lib/access'
import { DepartmentSelect, initialDepartment, ScopeEmpty } from '@/components/ScopeBanner'
import { pct } from '@/lib/format'
import type { Control } from '@/types'

const FRAMEWORK_OPTIONS = ['ISO 27001', 'NIST CSF', 'PCI DSS', 'PFRDA ICS']
type ViewId = 'all' | 'failing' | 'partial' | 'ccm' | 'mine' | 'multi'

export function ControlLibrary() {
  const navigate = useNavigate()
  const pushToast = useApp((s) => s.pushToast)
  const selfId = useApp((s) => s.personId)
  const clauseOverrides = useApp((s) => s.clauseOverrides)
  const scope = useScope()
  const [dept, setDept] = React.useState(() => initialDepartment(scope))
  React.useEffect(() => setDept(initialDepartment(scope)), [scope.seesAll, scope.department])
  const [view, setView] = React.useState<ViewId>('all')

  const rawControls = useEffectiveControls()
  // Department access boundary (1.1): scope the library to the user's department;
  // Compliance and the administrator see all controls (and can narrow via the dropdown).
  const allControls = React.useMemo(() => rawControls.filter((c) => passesDeptFilter(c.owner, scope, dept)), [rawControls, scope, dept])

  // How many clauses / acts each control satisfies (Sources pipeline).
  const satisfies = React.useMemo(() => {
    const m = new Map<string, { clauses: number; acts: number }>()
    for (const c of allControls) {
      const cl = clausesForControl(c.id, clauseOverrides)
      if (cl.length) m.set(c.id, { clauses: cl.length, acts: new Set(cl.map((p) => p.instrumentId)).size })
    }
    return m
  }, [allControls, clauseOverrides])

  const owners = React.useMemo(
    () => Array.from(new Set(allControls.map((c) => personName(c.owner)))).sort(),
    [allControls],
  )
  const ccmCount = allControls.filter((c) => c.automation === 'CCM').length
  const multiMapped = allControls.filter((c) => c.frameworks.length >= 2).length
  const avgFrameworks = (WORLD.controls.reduce((s, c) => s + c.frameworks.length, 0) / WORLD.controls.length).toFixed(1)
  const failing = allControls.filter((c) => c.result === 'Fail').length
  const partial = allControls.filter((c) => c.result === 'Partial').length
  const coverage = allControls.length ? (allControls.filter((c) => c.result !== 'Fail').length / allControls.length) * 100 : 0

  const views: SavedView[] = [
    { id: 'all', label: 'All', count: allControls.length },
    { id: 'failing', label: 'Failing', count: failing },
    { id: 'partial', label: 'Partial', count: partial },
    { id: 'ccm', label: 'CCM', count: ccmCount },
    { id: 'mine', label: 'Mine', count: allControls.filter((c) => c.owner === selfId).length },
    { id: 'multi', label: 'Multi-framework', count: multiMapped },
  ]
  const data = allControls.filter((c) => {
    switch (view) {
      case 'failing': return c.result === 'Fail'
      case 'partial': return c.result === 'Partial'
      case 'ccm': return c.automation === 'CCM'
      case 'mine': return c.owner === selfId
      case 'multi': return c.frameworks.length >= 2
      default: return true
    }
  })

  const columns: Column<Control>[] = [
    {
      key: 'id',
      header: 'Control ID',
      sortValue: (c) => c.id,
      render: (c) => <span className="font-mono text-xs font-semibold text-info">{c.id}</span>,
    },
    {
      key: 'title',
      header: 'Title',
      sortValue: (c) => c.title,
      className: 'max-w-[260px]',
      render: (c) => <span className="block truncate text-sm text-foreground">{c.title}</span>,
    },
    {
      key: 'frameworks',
      header: 'Frameworks satisfied',
      sortValue: (c) => c.frameworks.length,
      render: (c) => (c.frameworks.length ? <FrameworkPills frameworks={c.frameworks} /> : <span className="text-2xs text-muted-foreground">—</span>),
    },
    {
      key: 'satisfies',
      header: 'Satisfies clauses',
      sortValue: (c) => satisfies.get(c.id)?.clauses ?? 0,
      render: (c) => {
        const s = satisfies.get(c.id)
        return s ? (
          <span className="inline-flex items-center gap-1 rounded bg-info-soft px-1.5 py-0.5 text-2xs font-medium text-info" title={`${s.clauses} clause(s) across ${s.acts} act(s)`}>
            {s.clauses} clause{s.clauses === 1 ? '' : 's'} · {s.acts} act{s.acts === 1 ? '' : 's'}
          </span>
        ) : (
          <span className="text-2xs text-muted-foreground">—</span>
        )
      },
    },
    {
      key: 'owner',
      header: 'Owner',
      sortValue: (c) => personName(c.owner),
      render: (c) => (
        <span className="inline-flex items-center gap-1.5">
          <Avatar id={c.owner} size={20} />
          <span className="truncate text-xs text-foreground">{personName(c.owner)}</span>
        </span>
      ),
    },
    { key: 'type', header: 'Type', sortValue: (c) => c.type, render: (c) => <span className="text-xs text-foreground">{c.type}</span> },
    {
      key: 'automation',
      header: 'Automation',
      sortValue: (c) => c.automation,
      render: (c) =>
        c.automation === 'CCM' ? (
          <span className="inline-flex items-center gap-1 rounded bg-ok-soft px-1.5 py-0.5 text-2xs font-medium text-ok">
            <Bot className="size-3" /> CCM
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 rounded bg-muted px-1.5 py-0.5 text-2xs font-medium text-muted-foreground">
            <Hand className="size-3" /> Manual
          </span>
        ),
    },
    {
      key: 'lastTested',
      header: 'Last tested',
      sortValue: (c) => new Date(c.lastTested).getTime(),
      render: (c) => (
        <span className="text-xs text-muted-foreground" title={fmtDate(c.lastTested)}>
          {fmtRelative(c.lastTested)}
        </span>
      ),
    },
    {
      key: 'result',
      header: 'Result',
      sortValue: (c) => c.result,
      render: (c) => <StatusChip status={c.result} />,
    },
    {
      key: 'evidenceCount',
      header: 'Evidence',
      align: 'right',
      sortValue: (c) => c.evidenceCount,
      render: (c) => <span className="text-xs tabular-nums text-foreground">{c.evidenceCount}</span>,
    },
  ]

  const filters: TableFilter<Control>[] = [
    { key: 'framework', label: 'Framework', options: FRAMEWORK_OPTIONS, predicate: (c, v) => c.frameworks.includes(v as Control['frameworks'][number]) },
    { key: 'automation', label: 'Automation', options: ['CCM', 'Manual'], predicate: (c, v) => c.automation === v },
    { key: 'result', label: 'Result', options: ['Pass', 'Partial', 'Fail'], predicate: (c, v) => c.result === v },
    { key: 'owner', label: 'Owner', options: owners, predicate: (c, v) => personName(c.owner) === v },
  ]

  return (
    <div>
      <PageHeader
        eyebrow="Risk & Control"
        title="Control Library"
        description={`${WORLD.controls.length} controls mapped across ISO 27001, NIST CSF, PCI DSS and PFRDA ICS.`}
        actions={
          <div className="flex items-center gap-2">
            <ReportMenu templates={reportsForModule('Control')} />
            <Button
              variant="outline"
              size="sm"
              onClick={() => pushToast({ title: 'Control library exported', description: 'control-library-jun-2026.csv.', variant: 'success' })}
            >
              <Download className="size-4" /> Export
            </Button>
          </div>
        }
      />

      <div className="mb-3">
        <DepartmentSelect value={dept} onChange={setDept} />
      </div>

      {!scope.seesAll && allControls.length === 0 ? (
        <ScopeEmpty entity="controls" />
      ) : (
        <>
          <StatGroup className="mb-3" stats={summaryStats({ coverage, avgFrameworks, multiMapped, ccmCount, failing, navigate, setView })} />

          <SavedViews className="mb-3" views={views} active={view} onSelect={(v) => setView(v as ViewId)} />

          <DataTable
            data={data}
            columns={columns}
            searchKeys={['id', 'title', (c) => personName(c.owner)]}
            searchPlaceholder="Search control id, title or owner…"
            filters={filters}
            initialSort={{ key: 'id', dir: 'asc' }}
            onRowClick={(c) => navigate(`/controls/${c.id}`)}
            rightSlot={<span className="text-2xs tnum text-muted-foreground">{data.length} shown</span>}
          />
        </>
      )}
    </div>
  )
}

function summaryStats(a: {
  coverage: number
  avgFrameworks: string
  multiMapped: number
  ccmCount: number
  failing: number
  navigate: (to: string) => void
  setView: (v: ViewId) => void
}): Stat[] {
  return [
    { label: 'Control coverage', value: pct(a.coverage), tone: 'ok', icon: <ShieldCheck className="size-3.5" />, onClick: () => a.setView('all') },
    { label: 'Avg frameworks / control', value: a.avgFrameworks, icon: <Layers className="size-3.5" />, sub: `${a.multiMapped} mapped to 2+` },
    { label: 'CCM-automated', value: a.ccmCount, tone: 'info', icon: <Bot className="size-3.5" />, onClick: () => a.setView('ccm') },
    { label: 'Failing', value: a.failing, tone: a.failing ? 'danger' : 'ok', icon: <ShieldAlert className="size-3.5" />, onClick: () => a.setView('failing') },
  ]
}
