import * as React from 'react'
import { useNavigate } from 'react-router-dom'
import { Gauge, TrendingDown, TrendingUp, RefreshCw } from 'lucide-react'
import { DataTable, type Column, type TableFilter } from '@/components/DataTable'
import { StatusChip } from '@/components/StatusChip'
import { Avatar } from '@/components/Avatar'
import { Sparkline } from '@/components/Sparkline'
import { cn } from '@/lib/utils'
import { WORLD, getRisk } from '@/data'
import { personName } from '@/data/people'
import { fmtRelative, fmtIST } from '@/lib/time'
import { DOMAIN_COLORS } from '@/lib/heatmap'
import {
  currentBand,
  formatKriValue,
  isStale,
  isWorsening,
  kriDelta,
  kriSummary,
} from '@/lib/kri'
import { BAND_COLOR, BAND_TONE } from './RiskKrisTab'
import type { KRI } from '@/types'

const BAND_ORDER = { Red: 0, Amber: 1, Green: 2 } as const

/** Every indicator on one board — the monitoring view, with the same filter and
 *  export furniture as the register it sits beside. */
export function KriRegister() {
  const navigate = useNavigate()
  const kris = WORLD.kris
  const s = kriSummary(kris)
  const owners = React.useMemo(() => Array.from(new Set(kris.map((k) => personName(k.owner)))).sort(), [kris])
  const sources = React.useMemo(() => Array.from(new Set(kris.map((k) => k.metricSource))).sort(), [kris])

  const columns: Column<KRI>[] = [
    {
      key: 'id',
      header: 'KRI',
      sortValue: (k) => k.id,
      render: (k) => <span className="font-mono text-xs font-semibold text-info">{k.id}</span>,
    },
    {
      key: 'name',
      header: 'Indicator',
      className: 'max-w-[300px]',
      sortValue: (k) => k.name,
      render: (k) => (
        <div className="min-w-0">
          <div className="truncate text-xs text-foreground">{k.name}</div>
          <div className="truncate text-2xs text-muted-foreground">{k.metricSource}</div>
        </div>
      ),
    },
    {
      key: 'risk',
      header: 'Risk',
      sortValue: (k) => k.riskId,
      render: (k) => {
        const r = getRisk(k.riskId)
        return (
          <span className="inline-flex items-center gap-1.5">
            {r && <span className="size-2 shrink-0 rounded-full" style={{ background: DOMAIN_COLORS[r.domain] }} />}
            <span className="font-mono text-2xs font-semibold text-info">{k.riskId}</span>
          </span>
        )
      },
    },
    {
      key: 'value',
      header: 'Current',
      align: 'right',
      sortValue: (k) => k.currentValue,
      render: (k) => {
        const b = currentBand(k)
        return (
          <span className={cn('text-xs font-semibold tnum', b === 'Red' ? 'text-critical' : b === 'Amber' ? 'text-medium' : 'text-ok')}>
            {formatKriValue(k)}
          </span>
        )
      },
    },
    {
      key: 'thresholds',
      header: 'Thresholds',
      sortValue: (k) => k.thresholds.green,
      render: (k) => (
        <span className="text-2xs tnum text-muted-foreground" title={k.direction}>
          {k.direction === 'higher-is-worse'
            ? `≤${k.thresholds.green} · ${k.thresholds.green}–${k.thresholds.amber} · ≥${k.thresholds.red}`
            : `≥${k.thresholds.green} · ${k.thresholds.amber}–${k.thresholds.green} · ≤${k.thresholds.red}`}
        </span>
      ),
    },
    {
      key: 'band',
      header: 'Band',
      sortValue: (k) => BAND_ORDER[currentBand(k)],
      render: (k) => <StatusChip status={currentBand(k)} tone={BAND_TONE[currentBand(k)]} />,
    },
    {
      key: 'trend',
      header: 'Trend',
      sortValue: (k) => kriDelta(k),
      render: (k) => {
        const d = kriDelta(k)
        const worse = isWorsening(k)
        const Icon = d === 0 ? RefreshCw : worse ? TrendingUp : TrendingDown
        return (
          <span className="inline-flex items-center gap-1.5">
            <Sparkline data={k.history.map((h) => h.value)} width={52} height={18} color={BAND_COLOR[currentBand(k)]} />
            <span className={cn('inline-flex items-center gap-0.5 text-2xs tnum', worse ? 'text-critical' : d === 0 ? 'text-muted-foreground' : 'text-ok')}>
              <Icon className="size-3" />
              {d === 0 ? '—' : `${d > 0 ? '+' : ''}${d}`}
            </span>
          </span>
        )
      },
    },
    {
      key: 'owner',
      header: 'Owner',
      sortValue: (k) => personName(k.owner),
      render: (k) => (
        <span className="inline-flex items-center gap-1.5">
          <Avatar id={k.owner} size={20} />
          <span className="truncate text-xs text-foreground">{personName(k.owner)}</span>
        </span>
      ),
    },
    {
      key: 'refreshed',
      header: 'Last refreshed',
      sortValue: (k) => new Date(k.lastRefreshed).getTime(),
      render: (k) => (
        <span className={cn('text-2xs', isStale(k) ? 'font-medium text-medium' : 'text-muted-foreground')} title={fmtIST(k.lastRefreshed)}>
          {fmtRelative(k.lastRefreshed)}
          {isStale(k) && ' · stale'}
        </span>
      ),
    },
  ]

  const filters: TableFilter<KRI>[] = [
    { key: 'band', label: 'Band', options: ['Red', 'Amber', 'Green'], predicate: (k, v) => currentBand(k) === v },
    {
      key: 'domain',
      label: 'Domain',
      options: ['IT', 'Cyber', 'Operational', 'Investment', 'Compliance', 'Third-party'],
      predicate: (k, v) => {
        const d = getRisk(k.riskId)?.domain
        return v === 'Third-party' ? d === 'ThirdParty' : d === v
      },
    },
    { key: 'source', label: 'Source', options: sources, predicate: (k, v) => k.metricSource === v },
    { key: 'owner', label: 'Owner', options: owners, predicate: (k, v) => personName(k.owner) === v },
    { key: 'freq', label: 'Frequency', options: ['Daily', 'Weekly', 'Fortnightly', 'Monthly', 'Quarterly'], predicate: (k, v) => k.frequency === v },
    { key: 'trend', label: 'Trend', options: ['Worsening', 'Improving', 'Stale'], predicate: (k, v) => (v === 'Stale' ? isStale(k) : v === 'Worsening' ? isWorsening(k) : !isWorsening(k) && kriDelta(k) !== 0) },
  ]

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2 text-xs">
        <span className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-2.5 py-1">
          <Gauge className="size-3.5 text-muted-foreground" /> {s.total} indicators
        </span>
        <span className="rounded-md border border-critical/30 bg-critical-soft px-2.5 py-1 text-critical">
          Red <span className="font-semibold tnum">{s.red}</span>
        </span>
        <span className="rounded-md border border-medium/40 bg-medium-soft px-2.5 py-1 text-medium">
          Amber <span className="font-semibold tnum">{s.amber}</span>
        </span>
        <span className="rounded-md border border-ok/30 bg-ok-soft px-2.5 py-1 text-ok">
          Green <span className="font-semibold tnum">{s.green}</span>
        </span>
        <span className="rounded-md border border-border bg-background px-2.5 py-1">
          Worsening <span className="font-semibold tnum text-foreground">{s.worsening}</span>
        </span>
        {s.stale > 0 && (
          <span className="rounded-md border border-border bg-background px-2.5 py-1" title="Not refreshed within two measurement periods">
            Stale <span className="font-semibold tnum text-medium">{s.stale}</span>
          </span>
        )}
      </div>

      <DataTable
        data={kris}
        columns={columns}
        searchKeys={['id', 'name', 'riskId', (k) => personName(k.owner), (k) => k.metricSource]}
        searchPlaceholder="Search indicator, risk, owner or source…"
        filters={filters}
        initialSort={{ key: 'band', dir: 'asc' }}
        onRowClick={(k) => navigate(`/risks/${k.riskId}?tab=kris`)}
        pageSize={30}
        rightSlot={<span className="text-2xs tnum text-muted-foreground">{s.breached} in breach</span>}
      />
    </div>
  )
}
