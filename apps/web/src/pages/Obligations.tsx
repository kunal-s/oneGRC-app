import * as React from 'react'
import { useNavigate } from 'react-router-dom'
import { Download, CalendarDays, List, Network, Search } from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import { DataTable, type Column } from '@/components/DataTable'
import { StatusChip } from '@/components/StatusChip'
import { Avatar } from '@/components/Avatar'
import { Button } from '@/components/ui/Button'
import { MakerChecker } from '@/components/MakerChecker'
import { ObligationCalendar } from './obligations/ObligationCalendar'
import { cn } from '@/lib/utils'
import { personName } from '@/data/people'
import { fmtDate, fmtRelative, NOW_MS } from '@/lib/time'
import { REGULATOR_ORDER, REGULATOR_COLORS, RegulatorChip } from '@/lib/regulators'
import { useApp } from '@/store'
import { ReportMenu } from '@/components/kit/ReportMenu'
import { reportsForModule } from '@/components/kit/reports'
import { useEffectiveObligations } from '@/lib/effective'
import { useScope, ownerInScope, passesDeptFilter } from '@/lib/access'
import { DepartmentSelect, initialDepartment } from '@/components/ScopeBanner'
import { filingTiming } from '@/lib/cycles'
import type { Obligation } from '@/types'

/** On-time / late chip for a filed obligation (E2.3). */
function TimingChip({ o }: { o: Obligation }) {
  const t = filingTiming(o)
  if (o.status !== 'Filed') return null
  return (
    <span className={cn('rounded px-1.5 py-0 text-2xs font-medium', t === 'late' ? 'bg-medium-soft text-medium' : 'bg-ok-soft text-ok')}>
      {t === 'late' ? 'late' : 'on time'}
    </span>
  )
}

// The calendar workbench status cut (E2.2). Covers the plan's Filed / Unfiled
// (Pending), Completed (Filed), Overdue and Due-soon filters in one control.
type StatusKey = 'all' | 'pending' | 'filed' | 'overdue' | 'due'
const STATUS_TABS: { key: StatusKey; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'filed', label: 'Filed' },
  { key: 'overdue', label: 'Overdue' },
  { key: 'due', label: 'Due soon' },
]

export function Obligations() {
  const navigate = useNavigate()
  const pushToast = useApp((s) => s.pushToast)
  const selfId = useApp((s) => s.personId)
  const scope = useScope()
  const raw = useEffectiveObligations()
  // Department access boundary (1.1): a user sees only their department's duties;
  // Compliance and the administrator see all.
  const all = React.useMemo(() => raw.filter((o) => ownerInScope(o.owner, scope)), [raw, scope])

  // Calendar is the default workbench — a duty is a date first, a row second.
  const [tab, setTab] = React.useState<'list' | 'calendar'>('calendar')
  const [dept, setDept] = React.useState(() => initialDepartment(scope))
  React.useEffect(() => setDept(initialDepartment(scope)), [scope.seesAll, scope.department])
  const [status, setStatus] = React.useState<StatusKey>('pending')
  const [owner, setOwner] = React.useState('All')
  const [reg, setReg] = React.useState<string>('All') // regulator name or 'Internal'
  const [mineOnly, setMineOnly] = React.useState(false)
  const [q, setQ] = React.useState('')

  const owners = React.useMemo(() => Array.from(new Set(all.map((o) => personName(o.owner)))).sort(), [all])
  const overdue = all.filter((o) => o.status === 'Overdue').length
  const dueSoon = all.filter((o) => o.status === 'Due').length

  const matchStatus = (o: Obligation) =>
    status === 'all' ? true
      : status === 'pending' ? o.status !== 'Filed'
        : status === 'filed' ? o.status === 'Filed'
          : status === 'overdue' ? o.status === 'Overdue'
            : o.status === 'Due'
  const isMine = (o: Obligation) => o.owner === selfId || o.makerChecker.checker === selfId

  // One filtered set drives BOTH the calendar and the list (the shared toolbar).
  const filtered = React.useMemo(
    () =>
      all.filter(
        (o) =>
          passesDeptFilter(o.owner, scope, dept) &&
          matchStatus(o) &&
          (owner === 'All' || personName(o.owner) === owner) &&
          (reg === 'All' || (reg === 'Internal' ? o.origin === 'Internal' : o.regulator === reg)) &&
          (!mineOnly || isMine(o)) &&
          (!q || `${o.id} ${o.title} ${o.reference} ${personName(o.owner)}`.toLowerCase().includes(q.toLowerCase())),
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [all, scope, dept, status, owner, reg, mineOnly, q],
  )

  const columns: Column<Obligation>[] = [
    { key: 'id', header: 'Obligation ID', sortValue: (o) => o.id, render: (o) => <span className="font-mono text-xs font-semibold text-info">{o.id}</span> },
    {
      key: 'regulator',
      header: 'Source',
      sortValue: (o) => (o.origin === 'Internal' ? 'Internal' : o.regulator),
      render: (o) =>
        o.origin === 'Internal' ? (
          <span className="rounded bg-accent/15 px-1.5 py-0.5 text-2xs font-medium text-accent-foreground" title={o.policySource}>Internal</span>
        ) : (
          <RegulatorChip regulator={o.regulator} />
        ),
    },
    { key: 'title', header: 'Title', sortValue: (o) => o.title, className: 'max-w-[240px]', render: (o) => <span className="block truncate text-sm text-foreground">{o.title}</span> },
    { key: 'frequency', header: 'Frequency', sortValue: (o) => o.frequency, render: (o) => <span className="text-xs text-muted-foreground">{o.frequency}</span> },
    {
      key: 'dueDate',
      header: 'Due date',
      sortValue: (o) => new Date(o.dueDate).getTime(),
      render: (o) => {
        const overdueRow = o.status === 'Overdue'
        const soon = o.status === 'Due' && new Date(o.dueDate).getTime() - NOW_MS < 30 * 86400000
        return (
          <span className={cn('text-xs tnum', overdueRow ? 'font-medium text-critical' : soon ? 'text-medium' : 'text-foreground')}>
            {fmtDate(o.dueDate)}
            <span className="ml-1 text-2xs opacity-70">· {fmtRelative(o.dueDate)}</span>
          </span>
        )
      },
    },
    { key: 'owner', header: 'Owner', sortValue: (o) => personName(o.owner), render: (o) => <span className="inline-flex items-center gap-1.5"><Avatar id={o.owner} size={20} /><span className="truncate text-xs text-foreground">{personName(o.owner)}</span></span> },
    { key: 'makerChecker', header: 'Maker-checker', render: (o) => <MakerChecker mc={o.makerChecker} /> },
    { key: 'status', header: 'Status', sortValue: (o) => o.status, render: (o) => <span className="inline-flex items-center gap-1.5"><StatusChip status={o.status} /><TimingChip o={o} /></span> },
  ]

  return (
    <div>
      <PageHeader
        eyebrow="Compliance"
        title="Obligations"
        description={`${all.length} obligations, statutory and policy-driven.`}
        actions={
          <div className="flex items-center gap-2">
            <div className="flex items-center rounded-md border border-border p-0.5">
              <ToggleBtn active={tab === 'calendar'} onClick={() => setTab('calendar')} icon={<CalendarDays className="size-4" />} label="Calendar" />
              <ToggleBtn active={tab === 'list'} onClick={() => setTab('list')} icon={<List className="size-4" />} label="List" />
            </div>
            <ReportMenu templates={reportsForModule('Obligations')} />
            <Button variant="outline" size="sm" onClick={() => pushToast({ title: 'Compliance calendar exported', description: 'obligations-calendar.ics.', variant: 'success' })}>
              <Download className="size-4" /> Export
            </Button>
          </div>
        }
      />

      {/* Shared workbench toolbar — drives the calendar AND the list */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <DepartmentSelect value={dept} onChange={setDept} />
        <div className="flex items-center rounded-md border border-border p-0.5">
          {STATUS_TABS.map((s) => (
            <button
              key={s.key}
              onClick={() => setStatus(s.key)}
              className={cn('rounded px-2 py-1 text-2xs font-medium transition-colors', status === s.key ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground')}
            >
              {s.label}
            </button>
          ))}
        </div>
        <select value={owner} onChange={(e) => setOwner(e.target.value)} className="h-8 rounded-md border border-border bg-background px-2 text-xs text-foreground outline-none">
          <option value="All">Owner: All</option>
          {owners.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
        <button
          onClick={() => setMineOnly((m) => !m)}
          className={cn('h-8 rounded-md border px-2.5 text-xs font-medium transition-colors', mineOnly ? 'border-primary bg-primary text-primary-foreground' : 'border-border text-muted-foreground hover:text-foreground')}
        >
          Mine
        </button>
        <label className="flex h-8 items-center gap-1.5 rounded-md border border-border bg-background px-2 text-muted-foreground focus-within:bg-background">
          <Search className="size-3.5" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search id, title or owner" className="w-44 bg-transparent text-xs text-foreground outline-none placeholder:text-muted-foreground" />
        </label>
        <span className="ml-auto inline-flex items-center gap-2 text-xs">
          <button onClick={() => setStatus('overdue')} className="rounded-md border border-critical/30 bg-critical-soft px-2 py-1 font-medium text-critical hover:bg-critical-soft/80">{overdue} overdue</button>
          <button onClick={() => setStatus('due')} className="rounded-md border border-medium/40 bg-medium-soft px-2 py-1 font-medium text-medium hover:bg-medium-soft/80">{dueSoon} due soon</button>
        </span>
      </div>

      {/* per-regulator chips — clickable regulator filter */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 text-2xs font-medium uppercase tracking-wide text-muted-foreground">
          <Network className="size-3.5" /> Regulator
        </span>
        <button onClick={() => setReg('All')} className={cn('rounded-md border px-2 py-1 text-xs font-medium', reg === 'All' ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-background text-muted-foreground hover:text-foreground')}>All</button>
        {REGULATOR_ORDER.map((r) => {
          const total = all.filter((o) => o.regulator === r && o.origin !== 'Internal').length
          const active = reg === r
          return (
            <button
              key={r}
              onClick={() => setReg(active ? 'All' : r)}
              className={cn('inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs', active ? 'border-primary bg-info-soft' : 'border-border bg-background hover:bg-muted')}
            >
              <span className="size-2 rounded-full" style={{ background: REGULATOR_COLORS[r].dot }} />
              <span className="text-foreground">{r}</span>
              <span className="font-semibold tnum text-muted-foreground">{total}</span>
            </button>
          )
        })}
        <button onClick={() => setReg(reg === 'Internal' ? 'All' : 'Internal')} className={cn('rounded-md border px-2 py-1 text-xs font-medium', reg === 'Internal' ? 'border-primary bg-info-soft text-foreground' : 'border-border bg-background text-accent-foreground hover:bg-muted')}>
          Internal <span className="font-semibold tnum text-muted-foreground">{all.filter((o) => o.origin === 'Internal').length}</span>
        </button>
      </div>

      {tab === 'calendar' ? (
        <ObligationCalendar obligations={filtered} controlled />
      ) : (
        <DataTable
          data={filtered}
          columns={columns}
          initialSort={{ key: 'dueDate', dir: 'asc' }}
          onRowClick={(o) => navigate(`/obligations/${o.id}`)}
          rightSlot={<span className="text-2xs text-muted-foreground">{filtered.length} shown</span>}
        />
      )}
    </div>
  )
}

function ToggleBtn({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-medium transition-colors',
        active ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground',
      )}
    >
      {icon}
      {label}
    </button>
  )
}
