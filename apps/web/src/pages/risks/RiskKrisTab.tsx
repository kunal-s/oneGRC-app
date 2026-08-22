import { useNavigate } from 'react-router-dom'
import { ArrowUpRight, BellRing, Gauge, RefreshCw, TrendingDown, TrendingUp } from 'lucide-react'
import { Sparkline } from '@/components/Sparkline'
import { StatusChip } from '@/components/StatusChip'
import { Avatar } from '@/components/Avatar'
import { cn } from '@/lib/utils'
import { personName } from '@/data/people'
import { fmtDate, fmtIST, fmtRelative } from '@/lib/time'
import {
  currentBand,
  formatKriValue,
  isStale,
  isWorsening,
  kriDelta,
  kriLadder,
  krisForRisk,
  nextRefreshDue,
  nextThreshold,
} from '@/lib/kri'
import type { KRI, Risk } from '@/types'

export const BAND_TONE = { Green: 'ok', Amber: 'warn', Red: 'danger' } as const
export const BAND_COLOR = { Green: 'hsl(var(--ok))', Amber: 'hsl(var(--medium))', Red: 'hsl(var(--critical))' } as const

/** The indicators warning about this risk — the leading half of the picture the
 *  residual score gives after the fact. */
export function RiskKrisTab({ risk }: { risk: Risk }) {
  const kris = krisForRisk(risk.id)

  if (kris.length === 0) {
    return (
      <div className="card-surface p-4">
        <h3 className="mb-1 flex items-center gap-1.5 text-sm font-semibold text-foreground">
          <Gauge className="size-4 text-muted-foreground" /> Key risk indicators
        </h3>
        <p className="text-xs text-muted-foreground">
          No indicator is currently measured against this risk. Residual score and control test results are the only signals here.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {kris.map((k) => (
        <KriCard key={k.id} kri={k} />
      ))}
    </div>
  )
}

export function KriCard({ kri: k }: { kri: KRI }) {
  const navigate = useNavigate()
  const band = currentBand(k)
  const delta = kriDelta(k)
  const worsening = isWorsening(k)
  const next = nextThreshold(k)
  const ladder = kriLadder(k)
  const fired = ladder.filter((e) => e.fired)
  const stale = isStale(k)
  const Trend = delta === 0 ? RefreshCw : worsening ? TrendingUp : TrendingDown

  return (
    <div className={cn('card-surface p-4', band === 'Red' && 'border-critical/40', band === 'Amber' && 'border-medium/40')}>
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-mono text-2xs font-semibold text-info">{k.id}</span>
            <StatusChip status={band} tone={BAND_TONE[band]} />
            {stale && (
              <span className="rounded bg-muted px-1.5 py-0 text-2xs font-medium text-muted-foreground" title="Not refreshed within two measurement periods">
                stale
              </span>
            )}
          </div>
          <h3 className="mt-0.5 text-sm font-semibold text-foreground">{k.name}</h3>
        </div>
        <div className="shrink-0 text-right">
          <div className={cn('text-lg font-semibold tnum', band === 'Red' ? 'text-critical' : band === 'Amber' ? 'text-medium' : 'text-ok')}>
            {formatKriValue(k)}
          </div>
          <div className={cn('inline-flex items-center gap-1 text-2xs tnum', worsening ? 'text-critical' : delta === 0 ? 'text-muted-foreground' : 'text-ok')}>
            <Trend className="size-3" />
            {delta === 0 ? 'no change' : `${delta > 0 ? '+' : ''}${delta} vs last`}
          </div>
        </div>
      </div>

      <div className="mb-3 grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,1fr)_200px]">
        <ThresholdBar kri={k} />
        <div className="flex items-end justify-end">
          <Sparkline data={k.history.map((h) => h.value)} width={180} height={40} color={BAND_COLOR[band]} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-x-6 gap-y-2.5 sm:grid-cols-4">
        <Attr label="Source">{k.metricSource}</Attr>
        <Attr label="Frequency">{k.frequency}</Attr>
        <Attr label="Owner">
          <span className="inline-flex items-center gap-1.5">
            <Avatar id={k.owner} size={18} />
            <span className="truncate text-xs">{personName(k.owner)}</span>
          </span>
        </Attr>
        <Attr label="Last refreshed">
          <span className={cn(stale && 'font-medium text-medium')} title={fmtIST(k.lastRefreshed)}>
            {fmtRelative(k.lastRefreshed)}
          </span>
        </Attr>
      </div>

      <p className="mt-3 rounded-md border border-border bg-muted/30 px-3 py-2 text-xs leading-relaxed text-foreground">{k.rationale}</p>

      {next && (
        <p className="mt-2 text-2xs tnum text-muted-foreground">
          {next.label} {next.value}
          {k.unit === '%' ? '%' : ` ${k.unit}`} · currently {formatKriValue(k)}
        </p>
      )}

      {k.linkedControls.length > 0 && (
        <div className="mt-3">
          <div className="mb-1 text-2xs font-semibold uppercase tracking-wide text-muted-foreground">Measures the effectiveness of</div>
          <div className="flex flex-wrap gap-1">
            {k.linkedControls.map((c) => (
              <button
                key={c}
                onClick={() => navigate(`/controls/${c}`)}
                className="inline-flex items-center gap-1 rounded border border-border bg-background px-1.5 py-0.5 font-mono text-2xs font-semibold text-info hover:border-info/40"
              >
                {c} <ArrowUpRight className="size-2.5" />
              </button>
            ))}
          </div>
        </div>
      )}

      {ladder.length > 0 && (
        <div className="mt-3 border-t border-border pt-2.5">
          <div className="mb-1.5 flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 text-2xs font-semibold uppercase tracking-wide text-muted-foreground">
              <BellRing className="size-3.5 text-info" /> Breach follow-up
            </span>
            <span className="text-2xs tnum text-muted-foreground">
              {fired.length}/{ladder.length} rungs fired · next refresh due {fmtDate(nextRefreshDue(k))}
            </span>
          </div>
          <ol className="space-y-1">
            {ladder.map((e, i) => (
              <li
                key={i}
                className={cn(
                  'flex items-center gap-2 rounded-md border px-2.5 py-1 text-2xs',
                  e.fired ? 'border-border bg-muted/40' : 'border-dashed border-border',
                )}
              >
                <span className={cn('rounded px-1.5 py-0 font-semibold', e.fired ? 'bg-ok-soft text-ok' : 'bg-muted text-muted-foreground')}>
                  {e.fired ? 'Fired' : 'Scheduled'}
                </span>
                <span className="min-w-0 flex-1 truncate text-foreground">
                  {e.kind === 'reminder' ? `Refresh reminder to ${personName(e.target)}` : `Escalate to ${e.targetRole}`} · {e.intervalLabel}
                </span>
                <span className="shrink-0 tnum text-muted-foreground">{fmtDate(e.at)}</span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  )
}

/** Green / amber / red laid out in reading order for the indicator's direction,
 *  with the current value marked — so "is 143 bad?" is answered visually. */
function ThresholdBar({ kri: k }: { kri: KRI }) {
  const { green, amber, red } = k.thresholds
  const higher = k.direction === 'higher-is-worse'
  const lo = higher ? 0 : Math.min(red, k.currentValue) * 0.98
  const hi = higher ? Math.max(red * 1.35, k.currentValue * 1.15, amber * 1.2) : Math.max(green * 1.01, k.currentValue * 1.005)
  const at = (v: number) => `${Math.max(0, Math.min(100, ((v - lo) / Math.max(0.0001, hi - lo)) * 100))}%`

  return (
    <div>
      <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-muted">
        {higher ? (
          <>
            <div className="absolute inset-y-0 left-0 bg-critical/30" style={{ width: '100%' }} />
            <div className="absolute inset-y-0 left-0 bg-medium/40" style={{ width: at(amber) }} />
            <div className="absolute inset-y-0 left-0 bg-ok/50" style={{ width: at(green) }} />
          </>
        ) : (
          <>
            <div className="absolute inset-y-0 left-0 bg-critical/30" style={{ width: '100%' }} />
            <div className="absolute inset-y-0 right-0 bg-medium/40" style={{ left: at(amber) }} />
            <div className="absolute inset-y-0 right-0 bg-ok/50" style={{ left: at(green) }} />
          </>
        )}
        <div className="absolute inset-y-0 w-0.5 bg-foreground" style={{ left: at(k.currentValue) }} title={`Current ${formatKriValue(k)}`} />
      </div>
      <div className="mt-1 flex items-center gap-3 text-2xs tnum text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <span className="size-2 rounded-full bg-ok" /> {higher ? `≤ ${green}` : `≥ ${green}`}
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="size-2 rounded-full bg-medium" /> {higher ? `${green}–${amber}` : `${amber}–${green}`}
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="size-2 rounded-full bg-critical" /> {higher ? `≥ ${red}` : `≤ ${red}`}
        </span>
        <span className="ml-auto">{k.direction === 'higher-is-worse' ? 'higher is worse' : 'lower is worse'}</span>
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
