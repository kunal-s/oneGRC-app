import * as React from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import {
  ArrowLeft,
  ArrowDownRight,
  ArrowUpRight,
  Minus,
  Download,
  History,
  Search,
  UserCog,
  Target,
  ShieldCheck,
  Gauge,
} from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import { StatusChip } from '@/components/StatusChip'
import { ScoreBadge, scoreBand } from '@/components/RiskScore'
import { CrossRefPanel } from '@/components/CrossRefPanel'
import { CampaignsForObject } from '@/components/CampaignsForObject'
import { ProofChain } from '@/components/ProofChain'
import { Timeline } from '@/components/Timeline'
import { Avatar } from '@/components/Avatar'
import { Tabs, type TabDef } from '@/components/ui/Tabs'
import { Button } from '@/components/ui/Button'
import { ReportMenu } from '@/components/kit/ReportMenu'
import { reportsForModule } from '@/components/kit/reports'
import { CopilotInline } from '@/components/copilot/CopilotInline'
import { RiskPositionMap } from './risks/RiskPositionMap'
import { RiskStageRibbon } from './risks/RiskStageRibbon'
import { RiskActionsTab } from './risks/RiskActionsTab'
import { RiskApprovalsTab } from './risks/RiskApprovalsTab'
import { RiskEvidenceTab } from './risks/RiskEvidenceTab'
import { RiskAssessmentPanel } from './risks/RiskAssessmentPanel'
import { RiskKrisTab } from './risks/RiskKrisTab'
import { getControl } from '@/data'
import { personName, PEOPLE_BY_ID } from '@/data/people'
import { resolveEntity } from '@/lib/entity'
import { resolveProofChain } from '@/lib/proofChain'
import { DOMAIN_COLORS } from '@/lib/heatmap'
import { cn } from '@/lib/utils'
import { fmtDate, fmtIST, fmtRelative, NOW_MS } from '@/lib/time'
import { useApp } from '@/store'
import { useEffectiveRisk } from '@/lib/effective'
import {
  actionProgress,
  deriveRiskStage,
  evidenceForRisk,
  isAboveTarget,
  projectedResidual,
  riskTimeline,
} from '@/lib/riskWorkflow'
import { krisForRisk, kriSummary } from '@/lib/kri'
import { vendorsForRisk } from '@/lib/vendors'
import { casesForRisk } from '@/lib/fraud'
import { ComingSoon } from './ComingSoon'

export function RiskDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const pushToast = useApp((s) => s.pushToast)
  const auditLog = useApp((s) => s.auditLog)
  const getAnyEvidence = useApp((s) => s.getAnyEvidence)
  // Deep-linkable tab, so a KRI breach in the queue lands on the indicator that
  // caused it rather than the top of the record.
  const [params] = useSearchParams()
  const [tab, setTab] = React.useState(params.get('tab') ?? 'overview')
  const risk = useEffectiveRisk(id ?? '')

  React.useEffect(() => setTab(params.get('tab') ?? 'overview'), [id, params])

  if (!risk) return <ComingSoon title="Risk not found" />

  const lc = risk.lifecycle
  const stage = deriveRiskStage(risk)
  const progress = actionProgress(risk)
  const evidence = evidenceForRisk(risk, getAnyEvidence)
  const timeline = riskTimeline(risk)
  const chain = resolveProofChain({ kind: 'risk', risk })
  const kris = krisForRisk(risk.id)
  const kriBreaches = kriSummary(kris).breached
  const trail = auditLog.filter((e) => e.entityId === risk.id)

  const TrendIcon = risk.trend === 'up' ? ArrowUpRight : risk.trend === 'down' ? ArrowDownRight : Minus

  const tabs: TabDef[] = [
    { key: 'overview', label: 'Overview' },
    { key: 'treatment', label: 'Treatment' },
    { key: 'kris', label: 'KRIs', count: kris.length },
    { key: 'actions', label: 'Actions', count: progress.total },
    { key: 'evidence', label: 'Evidence', count: evidence.length },
    { key: 'approvals', label: 'Approvals' },
    { key: 'timeline', label: 'Timeline', count: timeline.length },
  ]

  return (
    <div>
      <button
        onClick={() => navigate('/risks')}
        className="mb-3 inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" /> Risk Register
      </button>

      <PageHeader
        eyebrow={
          <span className="inline-flex items-center gap-1.5">
            <span className="font-mono text-info">{risk.id}</span>
            <span className="size-2 rounded-full" style={{ background: DOMAIN_COLORS[risk.domain] }} />
            {risk.domain === 'ThirdParty' ? 'Third-party' : risk.domain} risk
          </span>
        }
        title={risk.title}
        description={risk.description}
        actions={
          <div className="flex items-center gap-2">
            {kriBreaches > 0 && (
              <button
                onClick={() => setTab('kris')}
                className="inline-flex items-center gap-1 rounded-md border border-critical/30 bg-critical-soft px-2 py-1 text-2xs font-medium text-critical"
                title="Key risk indicators outside their threshold"
              >
                <Gauge className="size-3.5" /> {kriBreaches} KRI{kriBreaches === 1 ? '' : 's'} in breach
              </button>
            )}
            <StatusChip status={risk.status} />
            <ReportMenu templates={reportsForModule('Risk')} />
            <Button
              variant="outline"
              size="sm"
              onClick={() => pushToast({ title: 'Risk summary exported', description: `${risk.id} one-pager.`, variant: 'success' })}
            >
              <Download className="size-4" /> Export
            </Button>
          </div>
        }
      />

      <ProofChain nodes={chain} className="mb-3" />
      <RiskStageRibbon stage={stage} onJump={setTab} className="mb-4" />

      <Tabs tabs={tabs} active={tab} onChange={setTab} className="mb-4" />

      {tab === 'overview' && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
          <div className="space-y-4">
            {/* identification */}
            <div className="card-surface p-4">
              <h2 className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-foreground">
                <Search className="size-4 text-muted-foreground" /> How this risk was identified
              </h2>
              <div className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4">
                <Metric label="Source">{lc.identification.kind}</Metric>
                <Metric label="Originating record">
                  {lc.identification.ref ? (
                    <button
                      onClick={() => navigate(resolveEntity(lc.identification.ref!).route)}
                      className="font-mono text-xs font-semibold text-info hover:underline"
                    >
                      {lc.identification.ref} <ArrowUpRight className="inline size-3" />
                    </button>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </Metric>
                <Metric label="Identified">
                  <span title={fmtIST(lc.identification.identifiedOn)}>{fmtDate(lc.identification.identifiedOn)}</span>
                </Metric>
                <Metric label="Identified by">
                  <span className="inline-flex items-center gap-1.5">
                    <Avatar id={lc.identification.identifiedBy} size={20} />
                    <span className="truncate text-xs">{personName(lc.identification.identifiedBy)}</span>
                  </span>
                </Metric>
              </div>
              <p className="mt-3 rounded-md border border-border bg-muted/30 px-3 py-2 text-xs text-foreground">
                <span className="text-muted-foreground">Method · </span>
                {lc.identification.method}
              </p>
            </div>

            <RiskAssessmentPanel risk={risk} />

            {/* assessment */}
            <div className="card-surface p-4">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-foreground">Inherent vs residual position</h2>
                <span
                  className={cn(
                    'inline-flex items-center gap-1 text-xs font-medium',
                    risk.trend === 'up' ? 'text-critical' : risk.trend === 'down' ? 'text-ok' : 'text-muted-foreground',
                  )}
                >
                  <TrendIcon className="size-3.5" />
                  {risk.trend === 'up' ? 'Rising' : risk.trend === 'down' ? 'Improving' : 'Stable'} this quarter
                </span>
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-[minmax(0,1fr)_220px]">
                <RiskPositionMap risk={risk} />
                <div className="space-y-2">
                  <ScoreRow label="Likelihood" value={`${risk.likelihood} / 5`} />
                  <ScoreRow label="Impact" value={`${risk.impact} / 5`} />
                  <div className="flex items-center justify-between border-t border-border pt-2">
                    <span className="text-xs text-muted-foreground">Inherent</span>
                    <span className="inline-flex items-center gap-2">
                      <ScoreBadge score={risk.inherent} hollow />
                      <span className="text-2xs text-muted-foreground">{scoreBand(risk.inherent)}</span>
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Residual</span>
                    <span className="inline-flex items-center gap-2">
                      <ScoreBadge score={risk.residual} />
                      <span className="text-2xs text-muted-foreground">{scoreBand(risk.residual)}</span>
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Target</span>
                    <span className="inline-flex items-center gap-2">
                      <ScoreBadge score={lc.treatment.targetResidual} hollow />
                      <span className="text-2xs text-muted-foreground">by {fmtDate(lc.treatment.targetDate)}</span>
                    </span>
                  </div>
                  <div
                    className={cn(
                      'flex items-center justify-between rounded-md px-2 py-1.5',
                      isAboveTarget(risk) ? 'bg-medium-soft' : 'bg-ok-soft',
                    )}
                  >
                    <span className={cn('text-xs font-medium', isAboveTarget(risk) ? 'text-medium' : 'text-ok')}>
                      {isAboveTarget(risk) ? 'Above target by' : 'Mitigation effect'}
                    </span>
                    <span className={cn('text-sm font-semibold tnum', isAboveTarget(risk) ? 'text-medium' : 'text-ok')}>
                      {isAboveTarget(risk) ? `+${risk.residual - lc.treatment.targetResidual}` : `−${risk.inherent - risk.residual}`}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* ownership */}
            <div className="card-surface p-4">
              <h2 className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-foreground">
                <UserCog className="size-4 text-muted-foreground" /> Ownership &amp; review cadence
              </h2>
              <div className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-5">
                <Metric label="Owner">
                  <span className="inline-flex items-center gap-1.5">
                    <Avatar id={risk.owner} size={20} />
                    <span className="truncate text-xs">{PEOPLE_BY_ID[risk.owner]?.name ?? risk.owner}</span>
                  </span>
                </Metric>
                <Metric label="Line of defence">{lc.ownership.lod}</Metric>
                <Metric label="Delegate">
                  {lc.ownership.delegate ? (
                    <span className="inline-flex items-center gap-1.5">
                      <Avatar id={lc.ownership.delegate} size={20} />
                      <span className="truncate text-xs">{personName(lc.ownership.delegate)}</span>
                    </span>
                  ) : (
                    <span className="text-muted-foreground">None</span>
                  )}
                </Metric>
                <Metric label="Review cadence">{lc.ownership.reviewFrequency}</Metric>
                <Metric label="Next review">
                  <span className={cn('tnum', new Date(lc.ownership.nextReviewOn).getTime() < NOW_MS && 'font-medium text-critical')}>
                    {fmtDate(lc.ownership.nextReviewOn)}
                  </span>
                </Metric>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <CrossRefPanel
              groups={[
                { label: 'Controls mitigating this risk', ids: risk.linkedControls },
                { label: 'Incidents that realised this risk', ids: risk.linkedIncidents },
                { label: 'Open issues & remediation', ids: risk.linkedIssues },
                { label: 'Third parties behind this risk', ids: vendorsForRisk(risk.id).map((v) => v.id) },
                { label: 'Investigations that realised this risk', ids: casesForRisk(risk.id).map((c) => c.id) },
              ]}
            />
            <CampaignsForObject objectId={risk.id} />
            <CopilotInline entityId={risk.id} tabs={['ask']} />
          </div>
        </div>
      )}

      {tab === 'treatment' && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
          <div className="card-surface p-4">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <h2 className="text-sm font-semibold text-foreground">Treatment decision</h2>
              <StatusChip status={lc.treatment.decision} tone={lc.treatment.decision === 'Accept' ? 'neutral' : 'info'} />
              <span className="ml-auto text-2xs tnum text-muted-foreground">
                target ≤ {lc.treatment.targetResidual}/25 by {fmtDate(lc.treatment.targetDate)}
              </span>
            </div>
            <p className="text-sm leading-relaxed text-foreground">{lc.treatment.rationale}</p>

            <div className="mt-4 border-t border-border pt-3">
              <div className="mb-2 flex items-center gap-1.5">
                <Target className="size-4 text-muted-foreground" />
                <h3 className="text-sm font-semibold text-foreground">Progress to target</h3>
              </div>
              <ProgressToTarget
                inherent={risk.inherent}
                residual={risk.residual}
                projected={projectedResidual(risk)}
                target={lc.treatment.targetResidual}
              />
              <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Metric label="Inherent">{risk.inherent}/25</Metric>
                <Metric label="Residual today">{risk.residual}/25</Metric>
                <Metric label="Projected on completion">{projectedResidual(risk)}/25</Metric>
                <Metric label="Actions closed">
                  <span className="tnum">
                    {progress.done}/{progress.total}
                  </span>
                </Metric>
              </div>
            </div>
          </div>

          <div className="card-surface p-4">
            <h3 className="mb-2 text-sm font-semibold text-foreground">Controls carrying this treatment</h3>
            <div className="space-y-1">
              {risk.linkedControls.map((cid) => {
                const c = getControl(cid)
                if (!c) return null
                return (
                  <button
                    key={cid}
                    onClick={() => navigate(`/controls/${cid}`)}
                    className="group flex w-full items-center gap-2 rounded-md border border-border bg-background px-2 py-1.5 text-left hover:border-info/40 hover:bg-info-soft/40"
                  >
                    <ShieldCheck
                      className={cn(
                        'size-3.5 shrink-0',
                        c.result === 'Pass' ? 'text-ok' : c.result === 'Fail' ? 'text-critical' : 'text-medium',
                      )}
                    />
                    <span className="font-mono text-2xs font-semibold text-info">{c.id}</span>
                    <span className="min-w-0 flex-1 truncate text-xs text-foreground">{c.title}</span>
                    <StatusChip status={c.result} />
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {tab === 'kris' && <RiskKrisTab risk={risk} />}
      {tab === 'actions' && <RiskActionsTab risk={risk} />}
      {tab === 'evidence' && <RiskEvidenceTab risk={risk} />}
      {tab === 'approvals' && <RiskApprovalsTab risk={risk} />}

      {tab === 'timeline' && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
          <div className="card-surface p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                <History className="size-4 text-muted-foreground" /> Lifecycle timeline
              </h2>
              <span className="text-2xs tnum text-muted-foreground">{timeline.length} events</span>
            </div>
            <Timeline events={timeline} showDate />
          </div>

          <div className="card-surface p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground">Audit trail</h3>
              <span className="text-2xs text-muted-foreground">tamper-evident</span>
            </div>
            {trail.length > 0 ? (
              <ol className="space-y-1.5">
                {trail.map((e) => (
                  <li key={e.id} className="rounded-md border border-border bg-background px-2.5 py-1.5">
                    <div className="text-xs text-foreground">{e.action}</div>
                    <div className="mt-0.5 text-2xs text-muted-foreground" title={fmtIST(e.at)}>
                      {personName(e.actor)} · {fmtRelative(e.at)}
                    </div>
                    {e.detail && <div className="mt-0.5 truncate text-2xs text-muted-foreground">{e.detail}</div>}
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-xs text-muted-foreground">
                No changes recorded on this risk in the current session. Seeded history is shown in the lifecycle timeline; every new
                action writes here and to Settings → Audit Log.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

/** Inherent → residual → target on one axis, so the remaining gap is visible
 *  rather than inferred from three separate numbers. */
function ProgressToTarget({
  inherent,
  residual,
  projected,
  target,
}: {
  inherent: number
  residual: number
  projected: number
  target: number
}) {
  const pct = (v: number) => `${Math.round((Math.min(v, inherent) / Math.max(1, inherent)) * 100)}%`
  return (
    <div>
      <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-border">
        <div className="absolute inset-y-0 left-0 rounded-full bg-medium/60" style={{ width: pct(residual) }} />
        <div className="absolute inset-y-0 left-0 rounded-full bg-ok" style={{ width: pct(projected) }} />
        <div className="absolute inset-y-0 w-0.5 bg-foreground" style={{ left: pct(target) }} title={`Target ${target}/25`} />
      </div>
      <div className="mt-1.5 flex items-center gap-3 text-2xs text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <span className="size-2 rounded-full bg-ok" /> projected {projected}/25
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="size-2 rounded-full bg-medium/60" /> residual {residual}/25
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="h-2.5 w-0.5 bg-foreground" /> target {target}/25
        </span>
        <span className="ml-auto tnum">inherent {inherent}/25</span>
      </div>
    </div>
  )
}

function ScoreRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm font-medium tnum text-foreground">{value}</span>
    </div>
  )
}

function Metric({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-2xs font-medium uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-0.5 text-sm text-foreground">{children}</div>
    </div>
  )
}
