import { useNavigate } from 'react-router-dom'
import { Download, GitPullRequestArrow, Sparkles, Zap } from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import { DataTable, type Column, type TableFilter } from '@/components/DataTable'
import { StatusChip } from '@/components/StatusChip'
import { Avatar } from '@/components/Avatar'
import { Button } from '@/components/ui/Button'
import { RegulatorChip, REGULATOR_ORDER } from '@/lib/regulators'
import { METRICS } from '@/data'
import { personName } from '@/data/people'
import { fmtDate, fmtRelative } from '@/lib/time'
import { inGroup } from '@/lib/format'
import { useApp } from '@/store'
import { useEffectiveRegChanges } from '@/lib/effective'
import type { RegulatoryChange } from '@/types'

const SOURCES = ['Regulatory Intelligence feed', 'PFRDA circular']

export function RegChange() {
  const navigate = useNavigate()
  const pushToast = useApp((s) => s.pushToast)
  const regChanges = useEffectiveRegChanges()

  const open = regChanges.filter((c) => c.status !== 'Closed').length
  const featured = ['RCM-2026-118', 'RCM-2026-117']

  const columns: Column<RegulatoryChange>[] = [
    {
      key: 'id',
      header: 'Change ID',
      sortValue: (c) => c.id,
      render: (c) => (
        <span className="inline-flex items-center gap-1.5">
          {featured.includes(c.id) && <Sparkles className="size-3 text-medium" />}
          <span className="font-mono text-xs font-semibold text-info">{c.id}</span>
        </span>
      ),
    },
    { key: 'regulator', header: 'Regulator', sortValue: (c) => c.regulator, render: (c) => <RegulatorChip regulator={c.regulator} /> },
    {
      key: 'summary',
      header: 'Summary',
      sortValue: (c) => c.summary,
      className: 'max-w-[320px]',
      render: (c) => <span className="block truncate text-sm text-foreground">{c.summary}</span>,
    },
    { key: 'source', header: 'Source', sortValue: (c) => c.source, render: (c) => <span className="text-xs text-muted-foreground">{c.source}</span> },
    {
      key: 'publishedAt',
      header: 'Published',
      sortValue: (c) => new Date(c.publishedAt).getTime(),
      render: (c) => <span className="text-xs text-muted-foreground" title={fmtDate(c.publishedAt)}>{fmtRelative(c.publishedAt)}</span>,
    },
    {
      key: 'impact',
      header: 'Impact',
      sortValue: (c) => c.impactedObligations.length + c.impactedControls.length,
      render: (c) => (
        <span className="inline-flex items-center gap-1.5 text-2xs">
          {c.impactedObligations.length > 0 && <span className="rounded bg-info-soft px-1.5 py-0.5 font-medium text-info">{c.impactedObligations.length} obl</span>}
          {c.impactedControls.length > 0 && <span className="rounded bg-ok-soft px-1.5 py-0.5 font-medium text-ok">{c.impactedControls.length} ctrl</span>}
          {c.impactedObligations.length + c.impactedControls.length === 0 && <span className="text-muted-foreground">—</span>}
        </span>
      ),
    },
    {
      key: 'owner',
      header: 'Owner',
      sortValue: (c) => personName(c.owner),
      render: (c) => (
        <span className="inline-flex items-center gap-1.5"><Avatar id={c.owner} size={20} /> <span className="truncate text-xs text-foreground">{personName(c.owner)}</span></span>
      ),
    },
    { key: 'status', header: 'Status', sortValue: (c) => c.status, render: (c) => <StatusChip status={c.status} /> },
  ]

  const filters: TableFilter<RegulatoryChange>[] = [
    { key: 'regulator', label: 'Regulator', options: REGULATOR_ORDER, predicate: (c, v) => c.regulator === v },
    { key: 'source', label: 'Source', options: SOURCES, predicate: (c, v) => c.source === v },
    { key: 'status', label: 'Status', options: ['Assessed', 'In progress', 'Closed'], predicate: (c, v) => c.status === v },
  ]

  return (
    <div>
      <PageHeader
        eyebrow="Compliance"
        title="Regulatory Change"
        description="Changes ingested from the regulatory-intelligence feeds, each mapped to the obligations and controls it touches."
        actions={
          <Button variant="outline" size="sm" onClick={() => pushToast({ title: 'Reg-change log exported', description: 'regulatory-change-2026.csv.', variant: 'success' })}>
            <Download className="size-4" /> Export
          </Button>
        }
      />

      {/* provenance banner */}
      <div className="mb-3 flex flex-wrap items-center gap-3 rounded-lg border border-info/30 bg-info-soft/40 px-4 py-2.5">
        <GitPullRequestArrow className="size-5 text-info" />
        <div>
          <div className="text-sm font-semibold text-foreground">
            {inGroup(METRICS.regUpdates2025)} updates captured in 2025
          </div>
          <div className="text-2xs text-muted-foreground">
            Provenance: Regulatory Intelligence feed · PFRDA circulars — native Indian statutory coverage
          </div>
        </div>
        <div className="ml-auto flex items-center gap-2 text-xs">
          <span className="rounded-md border border-border bg-background px-2 py-1">Open <span className="font-semibold tnum text-info">{open}</span></span>
          <span className="rounded-md border border-border bg-background px-2 py-1">Total <span className="font-semibold tnum text-foreground">{regChanges.length}</span></span>
        </div>
      </div>

      {/* featured worked items */}
      <div className="mb-3 grid grid-cols-1 gap-3 md:grid-cols-2">
        {featured.map((fid) => {
          const c = regChanges.find((x) => x.id === fid)!
          return (
            <button
              key={fid}
              onClick={() => navigate(`/reg-change/${fid}`)}
              className="group rounded-lg border border-medium/30 bg-medium-soft/30 p-3 text-left transition-colors hover:bg-medium-soft/50"
            >
              <div className="flex items-center gap-2">
                <Zap className="size-3.5 text-medium" />
                <span className="font-mono text-2xs font-semibold text-info">{c.id}</span>
                <RegulatorChip regulator={c.regulator} />
                <StatusChip status={c.status} className="ml-auto" />
              </div>
              <div className="mt-1.5 text-sm font-medium text-foreground">{c.summary}</div>
              <div className="mt-1 flex items-center gap-2 text-2xs text-muted-foreground">
                <span>auto-updated</span>
                <span className="rounded bg-info-soft px-1.5 py-0.5 font-medium text-info">{c.impactedObligations.length} obligation(s)</span>
                <span className="rounded bg-ok-soft px-1.5 py-0.5 font-medium text-ok">{c.impactedControls.length} control(s)</span>
                <span>· owner alerted</span>
              </div>
            </button>
          )
        })}
      </div>

      <DataTable
        data={regChanges}
        columns={columns}
        searchKeys={['id', 'summary', 'source']}
        searchPlaceholder="Search change id, summary or source…"
        filters={filters}
        initialSort={{ key: 'publishedAt', dir: 'desc' }}
        onRowClick={(c) => navigate(`/reg-change/${c.id}`)}
      />
    </div>
  )
}
