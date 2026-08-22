import { useNavigate } from 'react-router-dom'
import { ArrowUpRight, Gauge } from 'lucide-react'
import { Sparkline } from '@/components/Sparkline'
import { StatusChip } from '@/components/StatusChip'
import { cn } from '@/lib/utils'
import { DOMAIN_COLORS } from '@/lib/heatmap'
import { useEffectiveRisks } from '@/lib/effective'
import { appetiteRows, appetiteSummary, byExposure, DOMAIN_LABEL, type AppetiteRow } from '@/lib/appetite'

const TONE = {
  'Outside appetite': 'danger',
  'At tolerance': 'warn',
  'Within appetite': 'ok',
} as const

/**
 * Risk appetite by domain — the board policy on the left, the live measurement
 * on the right, and the gap between them as a status. Ordered exception-first,
 * so what is outside appetite reads before what is comfortably inside it.
 */
export function AppetitePanel({ className }: { className?: string }) {
  const navigate = useNavigate()
  const rows = byExposure(appetiteRows(useEffectiveRisks()))
  const summary = appetiteSummary(rows)

  return (
    <div className={cn('card-surface p-4', className)}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
          <Gauge className="size-4 text-muted-foreground" /> Risk appetite
        </h2>
        <div className="flex items-center gap-1.5 text-2xs">
          {summary.outside > 0 && (
            <span className="rounded border border-critical/30 bg-critical-soft px-1.5 py-0.5 font-medium tnum text-critical">
              {summary.outside} outside appetite
            </span>
          )}
          {summary.atTolerance > 0 && (
            <span className="rounded border border-medium/40 bg-medium-soft px-1.5 py-0.5 font-medium tnum text-medium">
              {summary.atTolerance} at tolerance
            </span>
          )}
          <span className="rounded border border-border bg-background px-1.5 py-0.5 font-medium tnum text-muted-foreground">
            {summary.within} within
          </span>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40 text-left text-2xs font-semibold uppercase tracking-wide text-muted-foreground">
              <th className="px-3 py-2">Domain</th>
              <th className="px-3 py-2">Board-approved appetite</th>
              <th className="w-28 px-3 py-2">Tolerance</th>
              <th className="w-20 px-3 py-2 text-right">Aggregate</th>
              <th className="w-28 px-3 py-2">4-quarter trend</th>
              <th className="w-36 px-3 py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <AppetiteTableRow key={row.domain} row={row} onOpen={() => navigate(`/risks?domain=${row.domain}`)} />
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-2 text-2xs tnum text-muted-foreground">
        Aggregate = mean residual of each domain's worst fifth, on the 1&ndash;25 scale. Trend reconstructed from completed remediation
        actions at each quarter end.
      </p>
    </div>
  )
}

function AppetiteTableRow({ row, onOpen }: { row: AppetiteRow; onOpen: () => void }) {
  const outside = row.status === 'Outside appetite'
  const tone = TONE[row.status]
  const barColor = outside ? 'hsl(var(--critical))' : row.status === 'At tolerance' ? 'hsl(var(--medium))' : 'hsl(var(--ok))'

  return (
    <tr
      onClick={onOpen}
      className={cn(
        'group cursor-pointer border-b border-border/70 last:border-0 hover:bg-info-soft/30',
        outside && 'bg-critical-soft/30',
      )}
    >
      <td className="px-3 py-2">
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2 shrink-0 rounded-full" style={{ background: DOMAIN_COLORS[row.domain] }} />
          <span className="text-xs font-medium text-foreground">{DOMAIN_LABEL(row.domain)}</span>
          <span className="text-2xs tnum text-muted-foreground">{row.riskCount}</span>
        </span>
      </td>
      <td className="max-w-[320px] px-3 py-2">
        <div className="truncate text-xs text-foreground" title={row.appetiteStatement}>
          {row.appetiteStatement}
        </div>
        <div className="truncate text-2xs text-muted-foreground">Objective: {row.linkedObjective}</div>
      </td>
      <td className="px-3 py-2">
        <ToleranceBar band={row.toleranceBand} value={row.currentAggregate} />
      </td>
      <td className="px-3 py-2 text-right">
        <span className={cn('text-sm font-semibold tnum', outside ? 'text-critical' : 'text-foreground')}>{row.currentAggregate}</span>
        {row.breachCount > 0 && (
          <div className="text-2xs tnum text-critical" title={`${row.breachCount} individual risks in the red band`}>
            {row.breachCount} in red
          </div>
        )}
      </td>
      <td className="px-3 py-2">
        <span className="inline-flex items-center gap-1.5">
          <Sparkline data={row.trend} width={56} height={20} color={barColor} />
          <span
            className={cn('text-2xs tnum', row.qoqDelta > 0 ? 'text-critical' : row.qoqDelta < 0 ? 'text-ok' : 'text-muted-foreground')}
            title="Movement against the previous quarter"
          >
            {row.qoqDelta > 0 ? `+${row.qoqDelta}` : row.qoqDelta === 0 ? 'flat' : row.qoqDelta}
          </span>
        </span>
      </td>
      <td className="px-3 py-2">
        <span className="inline-flex items-center gap-1.5">
          <StatusChip status={row.status} tone={tone} />
          <ArrowUpRight className="size-3 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
        </span>
      </td>
    </tr>
  )
}

/** Green / amber / red bands with the current aggregate marked on them, so the
 *  distance to the next threshold is visible rather than arithmetic. */
function ToleranceBar({ band, value }: { band: { green: number; amber: number; red: number }; value: number }) {
  const max = Math.max(25, band.red + 4, value + 2)
  const pctOf = (v: number) => `${Math.min(100, (v / max) * 100)}%`
  return (
    <div title={`Green ≤ ${band.green} · Amber ${band.green + 1}–${band.amber} · Red ≥ ${band.red}`}>
      <div className="relative h-2 w-full overflow-hidden rounded-full bg-critical/25">
        <div className="absolute inset-y-0 left-0 bg-medium/40" style={{ width: pctOf(band.red) }} />
        <div className="absolute inset-y-0 left-0 bg-ok/50" style={{ width: pctOf(band.green) }} />
        <div
          className="absolute inset-y-0 w-0.5 bg-foreground"
          style={{ left: pctOf(value) }}
          aria-label={`Current aggregate ${value}`}
        />
      </div>
      <div className="mt-0.5 text-2xs tnum text-muted-foreground">
        ≤{band.green} · {band.green + 1}–{band.amber} · ≥{band.red}
      </div>
    </div>
  )
}
