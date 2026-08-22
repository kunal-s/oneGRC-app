import { useNavigate } from 'react-router-dom'
import { ArrowUpRight, CalendarClock, Scale } from 'lucide-react'
import { DataTable, type Column, type TableFilter } from '@/components/DataTable'
import { StatusChip } from '@/components/StatusChip'
import { Avatar } from '@/components/Avatar'
import { cn } from '@/lib/utils'
import { WORLD, getRisk } from '@/data'
import { PEOPLE_BY_ID, personName } from '@/data/people'
import { fmtDate } from '@/lib/time'
import { ScoreBadge } from '@/components/RiskScore'
import { planProgress, quarterCoverage } from '@/lib/auditPlan'
import type { AuditPlanEntry } from '@/types'

const PRIORITY_ORDER = { High: 0, Medium: 1, Low: 2 } as const
const STATUS_TONE = { Complete: 'ok', 'In progress': 'progress', Planned: 'neutral', Deferred: 'danger' } as const

/** The annual risk-based plan, and how much of it has actually been delivered. */
export function AuditPlanTab() {
  const navigate = useNavigate()
  const plan = WORLD.auditPlan
  const p = planProgress(plan)
  const quarters = quarterCoverage(plan)

  const columns: Column<AuditPlanEntry>[] = [
    {
      key: 'quarter',
      header: 'Qtr',
      className: 'w-14',
      sortValue: (e) => e.plannedQuarter,
      render: (e) => <span className="font-mono text-xs font-semibold text-foreground">{e.plannedQuarter}</span>,
    },
    {
      key: 'entity',
      header: 'Auditable entity',
      className: 'max-w-[300px]',
      sortValue: (e) => e.auditableEntity,
      render: (e) => (
        <div className="min-w-0">
          <div className="truncate text-xs text-foreground">{e.auditableEntity}</div>
          {e.cadenceBasis && (
            <div className="inline-flex items-center gap-1 truncate text-2xs text-muted-foreground">
              <Scale className="size-2.5 shrink-0" /> {e.cadenceBasis}
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'priority',
      header: 'Priority',
      className: 'w-24',
      sortValue: (e) => PRIORITY_ORDER[e.priority],
      render: (e) => (
        <StatusChip status={e.priority} tone={e.priority === 'High' ? 'danger' : e.priority === 'Medium' ? 'warn' : 'neutral'} />
      ),
    },
    {
      key: 'risks',
      header: 'Driving risks',
      sortValue: (e) => -(getRisk(e.linkedRiskIds[0])?.residual ?? 0),
      render: (e) => (
        <span className="inline-flex items-center gap-1">
          {e.linkedRiskIds.slice(0, 3).map((rid) => {
            const r = getRisk(rid)
            if (!r) return null
            return (
              <button
                key={rid}
                onClick={(ev) => {
                  ev.stopPropagation()
                  navigate(`/risks/${rid}`)
                }}
                title={`${rid} — ${r.title}`}
              >
                <ScoreBadge score={r.residual} />
              </button>
            )
          })}
        </span>
      ),
    },
    {
      key: 'lastAudited',
      header: 'Last audited',
      className: 'w-28',
      sortValue: (e) => (e.lastAudited ? new Date(e.lastAudited).getTime() : 0),
      render: (e) =>
        e.lastAudited ? (
          <span className="text-xs tnum text-muted-foreground">{fmtDate(e.lastAudited)}</span>
        ) : (
          <span className="rounded bg-medium-soft px-1.5 py-0.5 text-2xs font-medium text-medium">never</span>
        ),
    },
    {
      key: 'auditor',
      header: 'Auditor',
      sortValue: (e) => e.auditor,
      render: (e) => {
        const person = PEOPLE_BY_ID[e.auditor]
        return person ? (
          <span className="inline-flex items-center gap-1.5">
            <Avatar id={e.auditor} size={18} />
            <span className="truncate text-xs text-foreground">{personName(e.auditor)}</span>
          </span>
        ) : (
          <span className="truncate text-xs text-muted-foreground">{e.auditor}</span>
        )
      },
    },
    {
      key: 'status',
      header: 'Status',
      className: 'w-28',
      sortValue: (e) => e.status,
      render: (e) => <StatusChip status={e.status} tone={STATUS_TONE[e.status]} />,
    },
    {
      key: 'audit',
      header: 'Audit',
      className: 'w-32',
      sortValue: (e) => e.linkedAuditId ?? '',
      render: (e) =>
        e.linkedAuditId ? (
          <span className="inline-flex items-center gap-1 font-mono text-2xs font-semibold text-info">
            {e.linkedAuditId} <ArrowUpRight className="size-2.5" />
          </span>
        ) : (
          <span className="text-2xs text-muted-foreground">—</span>
        ),
    },
  ]

  const filters: TableFilter<AuditPlanEntry>[] = [
    { key: 'quarter', label: 'Quarter', options: ['Q1', 'Q2', 'Q3', 'Q4'], predicate: (e, v) => e.plannedQuarter === v },
    { key: 'status', label: 'Status', options: ['Planned', 'In progress', 'Complete', 'Deferred'], predicate: (e, v) => e.status === v },
    { key: 'priority', label: 'Priority', options: ['High', 'Medium', 'Low'], predicate: (e, v) => e.priority === v },
    { key: 'type', label: 'Type', options: ['Internal', 'IS audit (CERT-In empanelled)', 'PFRDA'], predicate: (e, v) => e.auditType === v },
  ]

  return (
    <div>
      <div className="mb-3 grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
        <div className="card-surface p-4">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
              <CalendarClock className="size-4 text-muted-foreground" /> Plan vs actual
            </h3>
            <span className="text-2xs tnum text-muted-foreground">{plan[0]?.fy}</span>
          </div>
          <div className="mb-1.5 h-2.5 w-full overflow-hidden rounded-full bg-muted">
            <div className="flex h-full">
              <span className="h-full bg-ok" style={{ width: `${(p.complete / p.total) * 100}%` }} />
              <span className="h-full bg-info" style={{ width: `${(p.inProgress / p.total) * 100}%` }} />
              <span className="h-full bg-critical" style={{ width: `${(p.deferred / p.total) * 100}%` }} />
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-2xs tnum text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <span className="size-2 rounded-full bg-ok" /> {p.complete} complete
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="size-2 rounded-full bg-info" /> {p.inProgress} in progress
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="size-2 rounded-full bg-critical" /> {p.deferred} deferred
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="size-2 rounded-full bg-border" /> {p.planned} planned
            </span>
            <span className="ml-auto font-medium text-foreground">{p.deliveredPct}% delivered</span>
          </div>
          {p.neverAudited > 0 && (
            <p className="mt-2 text-2xs text-medium">
              {p.neverAudited} auditable {p.neverAudited === 1 ? 'entity has' : 'entities have'} never been audited.
            </p>
          )}
        </div>

        <div className="card-surface p-4">
          <h3 className="mb-2 text-sm font-semibold text-foreground">Coverage by quarter</h3>
          <div className="grid grid-cols-4 gap-2">
            {quarters.map((q) => (
              <div key={q.quarter} className={cn('rounded-lg border p-2.5', q.deferred > 0 ? 'border-critical/30' : 'border-border')}>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-foreground">{q.quarter}</span>
                  <span className="text-2xs tnum text-muted-foreground">{q.total}</span>
                </div>
                <div className="mt-1.5 space-y-0.5 text-2xs tnum text-muted-foreground">
                  <div className="text-ok">{q.complete} complete</div>
                  {q.inProgress > 0 && <div className="text-info">{q.inProgress} in progress</div>}
                  {q.deferred > 0 && <div className="text-critical">{q.deferred} deferred</div>}
                  {q.planned > 0 && <div>{q.planned} planned</div>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <DataTable
        data={plan}
        columns={columns}
        searchKeys={['auditableEntity', 'auditor', (e) => e.cadenceBasis ?? '']}
        searchPlaceholder="Search entity, auditor or cadence…"
        filters={filters}
        initialSort={{ key: 'quarter', dir: 'asc' }}
        onRowClick={(e) => e.linkedAuditId && navigate(`/audits/${e.linkedAuditId}`)}
        pageSize={20}
        rightSlot={<span className="text-2xs tnum text-muted-foreground">{p.total} auditable entities</span>}
      />
    </div>
  )
}
