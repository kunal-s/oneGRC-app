import * as React from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { X, Download, Network, Gauge } from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import { DataTable, type Column, type TableFilter } from '@/components/DataTable'
import { StatusChip } from '@/components/StatusChip'
import { ScoreBadge, scoreBand } from '@/components/RiskScore'
import { Avatar } from '@/components/Avatar'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'
import { WORLD } from '@/data'
import { personName } from '@/data/people'
import { residualCell, DOMAIN_COLORS, DOMAIN_LABELS } from '@/lib/heatmap'
import { useApp } from '@/store'
import { ReportMenu } from '@/components/kit/ReportMenu'
import { reportsForModule } from '@/components/kit/reports'
import { acceptanceState, actionProgress, deriveRiskStage, isAboveTarget, stageIndex, stageTone } from '@/lib/riskWorkflow'
import { useEffectiveRisks, useEffectiveCampaigns } from '@/lib/effective'
import { assessmentState, assessmentTone, lastAssessment } from '@/lib/rcsa'
import { fmtDate } from '@/lib/time'
import { Tabs, type TabDef } from '@/components/ui/Tabs'
import { KriRegister } from './risks/KriRegister'
import { kriSummary, worstBandForRisk, krisForRisk } from '@/lib/kri'
import { WORLD as W } from '@/data'
import type { Risk, RiskDomain } from '@/types'

const ASSESSMENT_ORDER = { 'Never assessed': 0, Overdue: 1, 'Due soon': 2, Current: 3 } as const

const TREATMENTS = ['Mitigate', 'Accept', 'Transfer', 'Avoid']
const RESIDUAL_BANDS = ['Critical', 'High', 'Medium', 'Low']

function DomainChip({ domain }: { domain: RiskDomain }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-foreground">
      <span className="size-2 rounded-full" style={{ background: DOMAIN_COLORS[domain] }} />
      {domain === 'ThirdParty' ? 'Third-party' : domain}
    </span>
  )
}

export function RiskRegister() {
  const navigate = useNavigate()
  const pushToast = useApp((s) => s.pushToast)
  const [params, setParams] = useSearchParams()

  const likelihood = params.get('likelihood')
  const impact = params.get('impact')
  const cellFilter = likelihood && impact ? { l: Number(likelihood), i: Number(impact) } : null
  // Domain drill-through from the appetite panel, alongside the heat map's
  // likelihood x impact cell drill-through.
  const domainFilter = params.get('domain') as RiskDomain | null
  // Deep link into a workflow slice, e.g. the Campaigns coverage tile pointing
  // at the risks whose self-assessment has lapsed.
  const workflowParam = params.get('workflow') ?? undefined
  // Register | KRIs — the indicator board sits beside the register it measures.
  const view = params.get('view') === 'kris' ? 'kris' : 'risks'
  const setView = (v: string) => setParams(v === 'kris' ? { view: 'kris' } : {})
  const kriStats = kriSummary(W.kris)

  // Read through the session-override layer so an approved plan or a completed
  // remediation action is reflected here, not only on the detail page.
  const allRisks = useEffectiveRisks()
  const campaigns = useEffectiveCampaigns()

  const risks = React.useMemo(() => {
    let rows = allRisks
    if (domainFilter) rows = rows.filter((r) => r.domain === domainFilter)
    if (cellFilter) {
      rows = rows.filter((r) => {
        const c = residualCell(r)
        return c.likelihood === cellFilter.l && c.impact === cellFilter.i
      })
    }
    return rows
  }, [cellFilter, domainFilter, allRisks])

  const owners = React.useMemo(
    () => Array.from(new Set(WORLD.risks.map((r) => r.owner))).map((id) => personName(id)).sort(),
    [],
  )

  const domainCounts = React.useMemo(() => {
    const c: Record<string, number> = {}
    for (const r of WORLD.risks) c[r.domain] = (c[r.domain] ?? 0) + 1
    return c
  }, [])

  const columns: Column<Risk>[] = [
    {
      key: 'id',
      header: 'Risk ID',
      sortValue: (r) => r.id,
      render: (r) => <span className="font-mono text-xs font-semibold text-info">{r.id}</span>,
    },
    {
      key: 'title',
      header: 'Title',
      sortValue: (r) => r.title,
      className: 'max-w-[340px]',
      render: (r) => <span className="block truncate text-sm text-foreground">{r.title}</span>,
    },
    {
      key: 'domain',
      header: 'Domain',
      sortValue: (r) => r.domain,
      render: (r) => <DomainChip domain={r.domain} />,
    },
    {
      key: 'owner',
      header: 'Owner',
      sortValue: (r) => personName(r.owner),
      render: (r) => (
        <span className="inline-flex items-center gap-1.5">
          <Avatar id={r.owner} size={20} />
          <span className="truncate text-xs text-foreground">{personName(r.owner)}</span>
        </span>
      ),
    },
    {
      key: 'inherent',
      header: 'Inherent',
      align: 'center',
      sortValue: (r) => r.inherent,
      render: (r) => <ScoreBadge score={r.inherent} hollow />,
    },
    {
      key: 'residual',
      header: 'Residual',
      align: 'center',
      sortValue: (r) => r.residual,
      render: (r) => <ScoreBadge score={r.residual} />,
    },
    {
      key: 'treatment',
      header: 'Treatment',
      sortValue: (r) => r.treatment,
      render: (r) => <StatusChip status={r.treatment} tone={r.treatment === 'Accept' ? 'neutral' : 'info'} />,
    },
    {
      key: 'kri',
      header: 'KRI',
      align: 'center',
      sortValue: (r) => {
        const b = worstBandForRisk(r.id)
        return b === 'Red' ? 0 : b === 'Amber' ? 1 : b === 'Green' ? 2 : 3
      },
      render: (r) => {
        const b = worstBandForRisk(r.id)
        if (!b) return <span className="text-2xs text-muted-foreground">—</span>
        const n = krisForRisk(r.id).length
        if (b === 'Green') return <span className="text-2xs tnum text-muted-foreground" title={`${n} indicators, all within threshold`}>{n}</span>
        return (
          <span
            className={cn('inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-2xs font-semibold', b === 'Red' ? 'bg-critical-soft text-critical' : 'bg-medium-soft text-medium')}
            title={`${n} indicators · worst band ${b}`}
          >
            <Gauge className="size-3" /> {b}
          </span>
        )
      },
    },
    {
      key: 'stage',
      header: 'Stage',
      sortValue: (r) => stageIndex(deriveRiskStage(r)),
      render: (r) => {
        const s = deriveRiskStage(r)
        const tone = stageTone(s)
        return <StatusChip status={s} tone={tone === 'danger' ? 'danger' : tone === 'warn' ? 'warn' : tone === 'ok' ? 'ok' : 'progress'} />
      },
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'center',
      sortValue: (r) => {
        const p = actionProgress(r)
        return p.total === 0 ? -1 : p.done / p.total
      },
      render: (r) => {
        const p = actionProgress(r)
        if (p.total === 0) return <span className="text-2xs text-muted-foreground">—</span>
        return (
          <span className="inline-flex items-center gap-1.5">
            <span className="text-xs tnum text-foreground">
              {p.done}/{p.total}
            </span>
            {p.overdue > 0 && (
              <span className="rounded bg-critical-soft px-1 py-0 text-2xs font-semibold tnum text-critical" title={`${p.overdue} overdue`}>
                {p.overdue}
              </span>
            )}
          </span>
        )
      },
    },
    {
      key: 'assessed',
      header: 'Assessed',
      sortValue: (r) => ASSESSMENT_ORDER[assessmentState(r, campaigns)],
      render: (r) => {
        const s = assessmentState(r, campaigns)
        const last = lastAssessment(r.id, campaigns)
        return (
          <span title={last ? `Last approved ${fmtDate(last.at)} · ${last.campaign.id}` : 'No approved self-assessment on record'}>
            <StatusChip status={s} tone={assessmentTone(s)} />
          </span>
        )
      },
    },
    {
      key: 'status',
      header: 'Status',
      sortValue: (r) => r.status,
      render: (r) => <StatusChip status={r.status} />,
    },
  ]

  const filters: TableFilter<Risk>[] = [
    {
      key: 'domain',
      label: 'Domain',
      options: DOMAIN_LABELS.map((d) => (d.key === 'ThirdParty' ? 'Third-party' : d.key)),
      predicate: (r, v) => (v === 'Third-party' ? r.domain === 'ThirdParty' : r.domain === v),
    },
    { key: 'owner', label: 'Owner', options: owners, predicate: (r, v) => personName(r.owner) === v },
    {
      key: 'residual',
      label: 'Residual',
      options: RESIDUAL_BANDS,
      predicate: (r, v) => scoreBand(r.residual) === v,
    },
    { key: 'treatment', label: 'Treatment', options: TREATMENTS, predicate: (r, v) => r.treatment === v },
    {
      key: 'workflow',
      label: 'Workflow',
      options: ['Above target', 'KRI in breach', 'Actions overdue', 'Awaiting approval', 'Acceptance expiring', 'Exception expired', 'Assessment lapsed'],
      predicate: (r, v) => {
        switch (v) {
          case 'Assessment lapsed': {
            const s = assessmentState(r, campaigns)
            return s === 'Overdue' || s === 'Never assessed'
          }
          case 'Above target':
            return isAboveTarget(r)
          case 'KRI in breach': {
            const b = worstBandForRisk(r.id)
            return b === 'Red' || b === 'Amber'
          }
          case 'Actions overdue':
            return actionProgress(r).overdue > 0
          case 'Awaiting approval':
            return deriveRiskStage(r) === 'Awaiting approval'
          case 'Acceptance expiring':
            return acceptanceState(r) === 'Expiring soon'
          case 'Exception expired':
            return deriveRiskStage(r) === 'Exception expired'
          default:
            return true
        }
      },
    },
  ]

  return (
    <div>
      <PageHeader
        eyebrow="Risk & Control"
        title="Risk Register"
        description={`${WORLD.risks.length} risks across six domains, scored inherent vs residual.`}
        actions={
          <div className="flex items-center gap-2">
            <ReportMenu templates={reportsForModule('Risk')} />
            <Button
              variant="outline"
              size="sm"
              onClick={() => pushToast({ title: 'Risk Register exported', description: 'risk-register-jun-2026.csv.', variant: 'success' })}
            >
              <Download className="size-4" />
              Export
            </Button>
          </div>
        }
      />

      {/* Domain summary */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 text-2xs font-medium uppercase tracking-wide text-muted-foreground">
          <Network className="size-3.5" /> Domain
        </span>
        {DOMAIN_LABELS.map((d) => (
          <span
            key={d.key}
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-2 py-1 text-xs"
          >
            <span className="size-2 rounded-full" style={{ background: DOMAIN_COLORS[d.key] }} />
            <span className="text-foreground">{d.label}</span>
            <span className="font-semibold tnum text-muted-foreground">{domainCounts[d.key] ?? 0}</span>
          </span>
        ))}
      </div>

      <Tabs
        className="mb-3"
        tabs={[
          { key: 'risks', label: 'Register', count: allRisks.length },
          { key: 'kris', label: 'KRIs', count: kriStats.total },
        ] as TabDef[]}
        active={view}
        onChange={setView}
      />

      {view === 'kris' ? (
        <KriRegister />
      ) : (
      <>
      {domainFilter && (
        <div className="mb-3 flex items-center gap-2 rounded-md border border-info/30 bg-info-soft/50 px-3 py-2 text-xs">
          <span className="font-medium text-foreground">
            Filtered from risk appetite — {domainFilter === 'ThirdParty' ? 'Third-party' : domainFilter} domain ({risks.length}{' '}
            {risks.length === 1 ? 'risk' : 'risks'})
          </span>
          <button
            onClick={() => setParams({})}
            className="ml-auto inline-flex items-center gap-1 rounded border border-border bg-background px-1.5 py-0.5 font-medium text-muted-foreground hover:text-foreground"
          >
            <X className="size-3" /> Clear
          </button>
        </div>
      )}

      {cellFilter && (
        <div className="mb-3 flex items-center gap-2 rounded-md border border-info/30 bg-info-soft/50 px-3 py-2 text-xs">
          <span className="font-medium text-foreground">
            Filtered from heat map — residual likelihood {cellFilter.l} × impact {cellFilter.i} ({risks.length}{' '}
            {risks.length === 1 ? 'risk' : 'risks'})
          </span>
          <button
            onClick={() => setParams({})}
            className="ml-auto inline-flex items-center gap-1 rounded border border-border bg-background px-1.5 py-0.5 font-medium text-muted-foreground hover:text-foreground"
          >
            <X className="size-3" /> Clear
          </button>
        </div>
      )}

      <DataTable
        data={risks}
        columns={columns}
        searchKeys={['id', 'title', (r) => personName(r.owner)]}
        searchPlaceholder="Search risk id, title or owner…"
        filters={filters}
        initialFilters={workflowParam ? { workflow: workflowParam } : undefined}
        initialSort={{ key: 'residual', dir: 'desc' }}
        onRowClick={(r) => navigate(`/risks/${r.id}`)}
        rightSlot={
          <span className="text-2xs text-muted-foreground">
            sorted by residual ·{' '}
            <span className={cn('font-medium', 'text-critical')}>
              {risks.filter((r) => scoreBand(r.residual) === 'Critical').length} critical
            </span>
          </span>
        }
      />
      </>
      )}
    </div>
  )
}
