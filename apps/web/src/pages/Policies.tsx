import * as React from 'react'
import { useNavigate } from 'react-router-dom'
import { Download, FileText, AlertTriangle } from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import { DataTable, type Column, type TableFilter } from '@/components/DataTable'
import { StatusChip } from '@/components/StatusChip'
import { Avatar } from '@/components/Avatar'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'
import { WORLD } from '@/data'
import { personName } from '@/data/people'
import { fmtDate, fmtRelative, NOW_MS } from '@/lib/time'
import { useApp } from '@/store'
import { useEffectiveCampaigns } from '@/lib/effective'
import { attestationEstate, coverageTone, policyCoverage } from '@/lib/attestation'
import { useScope, passesDeptFilter } from '@/lib/access'
import { DepartmentSelect, initialDepartment, ScopeEmpty } from '@/components/ScopeBanner'
import type { Policy } from '@/types'

export function Policies() {
  const navigate = useNavigate()
  const pushToast = useApp((s) => s.pushToast)
  const scope = useScope()
  const [dept, setDept] = React.useState(() => initialDepartment(scope))
  React.useEffect(() => setDept(initialDepartment(scope)), [scope.seesAll, scope.department])
  // Department access boundary (1.1): scope to the user's department; Compliance
  // and the administrator see every policy (and can narrow via the dropdown).
  const policies = React.useMemo(() => WORLD.policies.filter((p) => passesDeptFilter(p.owner, scope, dept)), [scope, dept])

  const categories = React.useMemo(() => Array.from(new Set(policies.map((p) => p.category))).sort(), [policies])
  const owners = React.useMemo(() => Array.from(new Set(policies.map((p) => personName(p.owner)))).sort(), [policies])
  const reviewDue = policies.filter((p) => new Date(p.nextReview).getTime() < NOW_MS).length
  const campaigns = useEffectiveCampaigns()
  const estate = attestationEstate(policies, campaigns)

  const columns: Column<Policy>[] = [
    {
      key: 'id',
      header: 'Policy ID',
      sortValue: (p) => p.id,
      render: (p) => <span className="font-mono text-xs font-semibold text-info">{p.id}</span>,
    },
    {
      key: 'title',
      header: 'Title',
      sortValue: (p) => p.title,
      className: 'max-w-[300px]',
      render: (p) => (
        <span className="flex items-center gap-2">
          <FileText className="size-3.5 shrink-0 text-muted-foreground" />
          <span className="min-w-0 truncate text-sm text-foreground">{p.title}</span>
        </span>
      ),
    },
    { key: 'category', header: 'Category', sortValue: (p) => p.category, render: (p) => <span className="text-xs text-foreground">{p.category}</span> },
    {
      key: 'version',
      header: 'Version',
      sortValue: (p) => p.version,
      render: (p) => <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-2xs font-semibold text-foreground">{p.version}</span>,
    },
    {
      key: 'owner',
      header: 'Owner',
      sortValue: (p) => personName(p.owner),
      render: (p) => (
        <span className="inline-flex items-center gap-1.5">
          <Avatar id={p.owner} size={20} />
          <span className="truncate text-xs text-foreground">{personName(p.owner)}</span>
        </span>
      ),
    },
    {
      key: 'approvedBy',
      header: 'Approved by',
      sortValue: (p) => personName(p.approvedBy),
      render: (p) => <span className="text-xs text-foreground">{personName(p.approvedBy)}</span>,
    },
    {
      key: 'nextReview',
      header: 'Next review',
      sortValue: (p) => new Date(p.nextReview).getTime(),
      render: (p) => {
        const overdue = new Date(p.nextReview).getTime() < NOW_MS
        return (
          <span className={cn('inline-flex items-center gap-1 text-xs', overdue ? 'font-medium text-critical' : 'text-muted-foreground')}>
            {overdue && <AlertTriangle className="size-3" />}
            {fmtDate(p.nextReview)}
            <span className="text-2xs opacity-70">· {fmtRelative(p.nextReview)}</span>
          </span>
        )
      },
    },
    {
      key: 'mapped',
      header: 'Mapped controls',
      align: 'right',
      sortValue: (p) => p.mappedControls.length,
      render: (p) => <span className="text-xs tabular-nums text-foreground">{p.mappedControls.length}</span>,
    },
    {
      key: 'attested',
      header: 'Attested',
      className: 'w-40',
      sortValue: (p) => {
        const c = policyCoverage(p, campaigns)
        return c.audience === 0 ? -1 : c.coveragePct
      },
      render: (p) => {
        const c = policyCoverage(p, campaigns)
        if (c.audience === 0) return <span className="text-2xs text-muted-foreground">not in scope</span>
        return (
          <span
            className="inline-flex items-center gap-1.5"
            title={`${c.attested} of ${c.audience} on ${p.version}${c.stale ? ` · ${c.stale} on an earlier version` : ''}`}
          >
            <StatusChip status={c.state} tone={coverageTone(c.state)} />
            <span className="text-2xs tnum text-muted-foreground">{c.coveragePct}%</span>
          </span>
        )
      },
    },
    { key: 'status', header: 'Status', sortValue: (p) => p.status, render: (p) => <StatusChip status={p.status} /> },
  ]

  const filters: TableFilter<Policy>[] = [
    { key: 'category', label: 'Category', options: categories, predicate: (p, v) => p.category === v },
    { key: 'status', label: 'Status', options: ['Published', 'In review', 'Draft'], predicate: (p, v) => p.status === v },
    { key: 'owner', label: 'Owner', options: owners, predicate: (p, v) => personName(p.owner) === v },
    {
      key: 'attested',
      label: 'Attestation',
      options: ['Current', 'Partial', 'Superseded', 'Never attested', 'Not in scope'],
      predicate: (p, v) => {
        const c = policyCoverage(p, campaigns)
        return v === 'Not in scope' ? c.audience === 0 : c.audience > 0 && c.state === v
      },
    },
  ]

  return (
    <div>
      <PageHeader
        eyebrow="Risk & Control"
        title="Policies"
        description={`${policies.length} versioned policies — each owned, approved and mapped to the controls that operationalise it, with review cadence tracked.`}
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={() => pushToast({ title: 'Policy register exported', description: 'policy-register-jun-2026.csv.', variant: 'success' })}
          >
            <Download className="size-4" /> Export
          </Button>
        }
      />

      <div className="mb-3 flex flex-wrap items-center gap-2 text-xs">
        <DepartmentSelect value={dept} onChange={setDept} />
        <span className="rounded-md border border-border bg-background px-2.5 py-1">
          Published <span className="font-semibold tnum text-ok">{policies.filter((p) => p.status === 'Published').length}</span>
        </span>
        <span className="rounded-md border border-border bg-background px-2.5 py-1">
          In review <span className="font-semibold tnum text-info">{policies.filter((p) => p.status === 'In review').length}</span>
        </span>
        {reviewDue > 0 && (
          <span className="rounded-md border border-critical/30 bg-critical-soft px-2.5 py-1 text-critical">
            Review overdue <span className="font-semibold tnum">{reviewDue}</span>
          </span>
        )}
        <button
          onClick={() => navigate('/campaigns')}
          className={cn(
            'rounded-md border px-2.5 py-1',
            estate.outstanding > 0 ? 'border-medium/40 bg-medium-soft text-medium' : 'border-border bg-background',
          )}
          title={`${estate.inScope} policies under attestation · ${estate.fullyAttested} fully signed · ${estate.partial} partial · ${estate.superseded} superseded by a new version`}
        >
          Attested <span className="font-semibold tnum">{estate.coveragePct}%</span>
          {estate.outstanding > 0 && <span className="ml-1 tnum">· {estate.outstanding} outstanding</span>}
        </button>
      </div>

      {!scope.seesAll && policies.length === 0 ? (
        <ScopeEmpty entity="policies" />
      ) : (
        <DataTable
          data={policies}
          columns={columns}
          searchKeys={['id', 'title', 'category', (p) => personName(p.owner)]}
          searchPlaceholder="Search policy title, category or owner…"
          filters={filters}
          initialSort={{ key: 'id', dir: 'asc' }}
          onRowClick={(p) => navigate(`/policies/${p.id}`)}
            tableClassName="table-fixed"
        />
      )}
    </div>
  )
}
