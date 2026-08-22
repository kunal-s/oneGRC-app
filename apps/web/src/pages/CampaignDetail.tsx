import * as React from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, ArrowUpRight, BellRing, CheckCircle2, Download, FileText, Lightbulb, Lock, Megaphone, TrendingDown, Undo2 } from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import { DataTable, type Column, type TableFilter } from '@/components/DataTable'
import { StatusChip } from '@/components/StatusChip'
import { Avatar } from '@/components/Avatar'
import { Button } from '@/components/ui/Button'
import { Drawer } from '@/components/Drawer'
import { EvidenceList } from '@/components/EvidenceList'
import { cn } from '@/lib/utils'
import { personName } from '@/data/people'
import { getPolicy } from '@/data'
import { fmtDate, fmtIST, NOW_MS } from '@/lib/time'
import { useApp } from '@/store'
import { useCanAct } from '@/lib/gating'
import { useEffectiveCampaign, useEffectiveRisk, useEffectiveRisks } from '@/lib/effective'
import {
  asRcsa,
  controlEffectivenessSummary,
  cycleMovement,
  draftRcsa,
  effectivenessTone,
  emergingConcerns,
  ineffectiveControls,
  rcsaDelta,
  rcsaGaps,
} from '@/lib/rcsa'
import {
  PASS_MARK,
  asAttestation,
  attestationGaps,
  comprehensionSummary,
  declarations,
  draftAttestation,
  outstandingByDepartment,
  policyCoverage,
} from '@/lib/attestation'
import { asVendorDd, draftVendorDd, vendorDdGaps } from '@/lib/vendors'
import { useEffectiveVendor } from '@/lib/effective'
import { RcsaForm, RcsaSummary } from './campaigns/RcsaForm'
import { VendorDdForm, VendorDdSummary } from './campaigns/VendorDdForm'
import { AttestationForm, AttestationSummary } from './campaigns/AttestationForm'
import {
  campaignLadder,
  campaignProgress,
  campaignType,
  outcomeDistribution,
  outstandingBy,
  taskStatusLabel,
} from '@/lib/campaigns'
import { ComingSoon } from './ComingSoon'
import type { AttestationResponse, Campaign, CampaignTask, RcsaResponse, VendorDdResponse } from '@/types'

const TASK_TONE = { 'Not started': 'neutral', Submitted: 'progress', Approved: 'ok', Returned: 'warn', Overdue: 'danger' } as const
const TASK_ORDER = { Overdue: 0, Returned: 1, Submitted: 2, 'Not started': 3, Approved: 4 } as const

/** The tracker: who has responded, what they said, who is late, and the
 *  certificate the cycle produces when it closes. */
export function CampaignDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const campaign = useEffectiveCampaign(id ?? '')
  const closeCampaign = useApp((s) => s.closeCampaign)
  const pushToast = useApp((s) => s.pushToast)
  const canClose = useCanAct({ kind: 'risk.approve', makerId: undefined })
  const [openTask, setOpenTask] = React.useState<string | null>(null)

  if (!campaign) return <ComingSoon title="Campaign not found" />

  const spec = campaignType(campaign.type)
  const p = campaignProgress(campaign)
  const ladder = campaignLadder(campaign)
  const fired = ladder.filter((e) => e.fired)
  const outstanding = outstandingBy(campaign)
  const outcomes = outcomeDistribution(campaign)
  const late = new Date(campaign.dueOn).getTime() < NOW_MS && campaign.status !== 'Closed'
  const task = openTask ? campaign.tasks.find((t) => t.id === openTask) ?? null : null

  const columns: Column<CampaignTask>[] = [
    {
      key: 'object',
      header: spec.objectKind === 'policy' ? 'Policy' : 'Risk',
      className: 'max-w-[260px]',
      sortValue: (t) => t.objectId,
      render: (t) => (
        <div className="min-w-0">
          <div className="font-mono text-2xs font-semibold text-info">{t.objectId}</div>
          <div className="truncate text-xs text-foreground">{spec.objectLabel(t.objectId)}</div>
        </div>
      ),
    },
    {
      key: 'assignee',
      header: 'Assignee',
      sortValue: (t) => personName(t.assignee),
      render: (t) => (
        <span className="inline-flex items-center gap-1.5">
          <Avatar id={t.assignee} size={20} />
          <span className="truncate text-xs text-foreground">{personName(t.assignee)}</span>
        </span>
      ),
    },
    {
      key: 'reviewer',
      header: 'Reviewer',
      sortValue: (t) => personName(t.reviewer ?? ''),
      render: (t) =>
        t.reviewer ? (
          <span className="inline-flex items-center gap-1.5">
            <Avatar id={t.reviewer} size={18} />
            <span className="truncate text-2xs text-muted-foreground">{personName(t.reviewer)}</span>
          </span>
        ) : (
          <span className="text-2xs text-muted-foreground">—</span>
        ),
    },
    {
      key: 'response',
      header: 'Response',
      className: 'max-w-[260px]',
      sortValue: (t) => spec.summarise(t),
      render: (t) => <span className="block truncate text-xs text-foreground">{t.status === 'Not started' ? '—' : spec.summarise(t)}</span>,
    },
    {
      key: 'submitted',
      header: 'Submitted',
      className: 'w-24',
      sortValue: (t) => (t.submittedOn ? new Date(t.submittedOn).getTime() : 0),
      render: (t) => <span className="text-xs tnum text-muted-foreground">{t.submittedOn ? fmtDate(t.submittedOn) : '—'}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      className: 'w-28',
      sortValue: (t) => TASK_ORDER[taskStatusLabel(t, campaign)],
      render: (t) => {
        const l = taskStatusLabel(t, campaign)
        return <StatusChip status={l} tone={TASK_TONE[l]} />
      },
    },
  ]

  const filters: TableFilter<CampaignTask>[] = [
    { key: 'status', label: 'Status', options: ['Not started', 'Submitted', 'Approved', 'Returned', 'Overdue'], predicate: (t, v) => taskStatusLabel(t, campaign) === v },
    { key: 'assignee', label: 'Assignee', options: Array.from(new Set(campaign.tasks.map((t) => personName(t.assignee)))).sort(), predicate: (t, v) => personName(t.assignee) === v },
  ]

  return (
    <div>
      <button onClick={() => navigate('/campaigns')} className="mb-3 inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-3.5" /> Campaigns
      </button>

      <PageHeader
        eyebrow={
          <span className="inline-flex items-center gap-1.5">
            <Megaphone className="size-3.5 text-muted-foreground" />
            <span className="font-mono text-info">{campaign.id}</span>
            <span className="text-muted-foreground">· {campaign.type}</span>
          </span>
        }
        title={campaign.title}
        description={`${campaign.period} · launched ${fmtDate(campaign.launchedOn)} by ${personName(campaign.launchedBy)} · due ${fmtDate(campaign.dueOn)}`}
        actions={
          <div className="flex items-center gap-2">
            <StatusChip status={campaign.status} tone={campaign.status === 'Closed' ? 'ok' : late ? 'danger' : 'progress'} />
            {campaign.status !== 'Closed' && (
              <Button
                size="sm"
                disabled={!canClose || p.submitted > 0}
                title={
                  p.submitted > 0
                    ? `${p.submitted} submission${p.submitted === 1 ? '' : 's'} still awaiting review — a cycle cannot close over an undecided response.`
                    : canClose
                      ? undefined
                      : 'Closing a campaign is done by the Risk Manager or Executive persona.'
                }
                onClick={() => {
                  closeCampaign(campaign.id)
                  pushToast({ title: 'Campaign closed', description: 'Completion certificate filed to the Evidence Vault.', variant: 'success' })
                }}
              >
                <Lock className="size-4" /> Close cycle
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={() => pushToast({ title: 'Tracker exported', description: `${campaign.id}-tracker.csv.`, variant: 'success' })}>
              <Download className="size-4" /> Export
            </Button>
          </div>
        }
      />

      <div className="mb-4 grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,1fr)]">
        <div className="card-surface p-4">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">Completion</h3>
            <span className="text-2xs tnum text-muted-foreground">
              {p.approved}/{p.total} approved · {p.respondedPct}% responded
            </span>
          </div>
          <div className="mb-2 flex h-2.5 w-full overflow-hidden rounded-full bg-muted">
            <span className="h-full bg-ok" style={{ width: `${(p.approved / Math.max(1, p.total)) * 100}%` }} />
            <span className="h-full bg-info" style={{ width: `${(p.submitted / Math.max(1, p.total)) * 100}%` }} />
            <span className="h-full bg-medium" style={{ width: `${(p.returned / Math.max(1, p.total)) * 100}%` }} />
            <span className="h-full bg-critical" style={{ width: `${(p.overdue / Math.max(1, p.total)) * 100}%` }} />
          </div>
          <div className="flex flex-wrap gap-x-3 gap-y-1 text-2xs tnum text-muted-foreground">
            <Legend colour="bg-ok" label={`${p.approved} approved`} />
            <Legend colour="bg-info" label={`${p.submitted} in review`} />
            <Legend colour="bg-medium" label={`${p.returned} returned`} />
            <Legend colour="bg-critical" label={`${p.overdue} overdue`} />
            <Legend colour="bg-border" label={`${p.notStarted} not started`} />
          </div>
          {campaign.obligationId && (
            <button
              onClick={() => navigate(`/obligations/${campaign.obligationId}`)}
              className="mt-2.5 inline-flex items-center gap-1 text-2xs font-medium text-info hover:underline"
            >
              Discharges {campaign.obligationId} <ArrowUpRight className="size-3" />
            </button>
          )}
        </div>

        <div className="card-surface p-4">
          <h3 className="mb-2 text-sm font-semibold text-foreground">Outstanding assignees</h3>
          {outstanding.length > 0 ? (
            <div className="space-y-1">
              {outstanding.slice(0, 5).map((o) => (
                <div key={o.assignee} className="flex items-center gap-2 rounded-md border border-border bg-background px-2 py-1">
                  <Avatar id={o.assignee} size={18} />
                  <span className="min-w-0 flex-1 truncate text-xs text-foreground">{personName(o.assignee)}</span>
                  <span className="shrink-0 text-2xs tnum text-muted-foreground">{o.open} open</span>
                  {o.overdue > 0 && <span className="shrink-0 rounded bg-critical-soft px-1 py-0 text-2xs font-semibold tnum text-critical">{o.overdue}</span>}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">Every assignee has responded and been reviewed.</p>
          )}
        </div>

        <div className="card-surface p-4">
          <h3 className="mb-2 text-sm font-semibold text-foreground">Outcome distribution</h3>
          {outcomes.length > 0 ? (
            <div className="space-y-1">
              {outcomes.slice(0, 5).map((o) => (
                <div key={o.label} className="flex items-center gap-2">
                  <span className="min-w-0 flex-1 truncate text-2xs text-foreground" title={o.label}>
                    {o.label}
                  </span>
                  <span className="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
                    <span className="block h-full bg-info" style={{ width: `${(o.count / Math.max(...outcomes.map((x) => x.count))) * 100}%` }} />
                  </span>
                  <span className="w-6 shrink-0 text-right text-2xs tnum text-muted-foreground">{o.count}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">No responses submitted yet.</p>
          )}
        </div>
      </div>

      {campaign.type === 'RCSA' && <RcsaCyclePanels campaign={campaign} />}
      {campaign.type === 'Policy attestation' && <AttestationCyclePanels campaign={campaign} />}

      {campaign.evidenceId && (
        <div className="card-surface mb-4 p-4">
          <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-foreground">
            <CheckCircle2 className="size-4 text-ok" /> Completion certificate
          </h3>
          <EvidenceList ids={[campaign.evidenceId]} />
        </div>
      )}

      {ladder.length > 0 && (
        <div className="card-surface mb-4 p-4">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
              <BellRing className="size-4 text-info" /> Reminders &amp; escalation
            </h3>
            <span className="text-2xs tnum text-muted-foreground">
              {fired.length} of {ladder.length} rungs fired
            </span>
          </div>
          <ol className="grid grid-cols-1 gap-1 sm:grid-cols-2">
            {ladder.map((e, i) => (
              <li
                key={i}
                className={cn('flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-2xs', e.fired ? 'border-border bg-muted/40' : 'border-dashed border-border')}
              >
                <span className={cn('rounded px-1.5 py-0 font-semibold', e.fired ? 'bg-ok-soft text-ok' : 'bg-muted text-muted-foreground')}>
                  {e.fired ? 'Fired' : 'Scheduled'}
                </span>
                <span className="min-w-0 flex-1 truncate text-foreground">
                  {e.kind === 'reminder' ? `Reminder to ${personName(e.target)}` : `Escalate to ${e.targetRole}`} · {e.intervalLabel}
                </span>
                <span className="shrink-0 tnum text-muted-foreground" title={fmtIST(e.at)}>
                  {fmtDate(e.at)}
                </span>
              </li>
            ))}
          </ol>
        </div>
      )}

      <DataTable
        data={campaign.tasks}
        columns={columns}
        searchKeys={['objectId', (t) => personName(t.assignee), (t) => spec.objectLabel(t.objectId)]}
        searchPlaceholder="Search object or assignee…"
        filters={filters}
        initialSort={{ key: 'status', dir: 'asc' }}
        onRowClick={(t) => setOpenTask(t.id)}
        pageSize={30}
        rightSlot={<span className="text-2xs tnum text-muted-foreground">{p.total} tasks</span>}
      />

      <TaskDrawer campaign={campaign} task={task} onClose={() => setOpenTask(null)} />
    </div>
  )
}

/**
 * What the cycle says beyond "who replied": how the estate moved, which
 * controls the first line says are not working, and what nobody has a risk for
 * yet. This is the output a Risk Committee reads — the completion percentage is
 * only how you got here.
 */
function RcsaCyclePanels({ campaign }: { campaign: Campaign }) {
  const navigate = useNavigate()
  const risks = useEffectiveRisks()
  const byId = React.useMemo(() => new Map(risks.map((r) => [r.id, r])), [risks])
  const move = cycleMovement(campaign, (id) => byId.get(id))
  const effectiveness = controlEffectivenessSummary(campaign)
  const weak = ineffectiveControls(campaign)
  const concerns = emergingConcerns(campaign)
  const rated = effectiveness.reduce((n, e) => n + e.count, 0)
  if (rated === 0) return null

  return (
    <div className="mb-4 grid grid-cols-1 gap-3 lg:grid-cols-3">
      <div className="card-surface p-4">
        <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-foreground">
          <TrendingDown className="size-4 text-muted-foreground" /> Score movement
        </h3>
        <div className="flex items-baseline gap-1.5">
          <span className={cn('text-2xl font-semibold tnum', move.netPoints > 0 ? 'text-critical' : move.netPoints < 0 ? 'text-ok' : 'text-foreground')}>
            {move.netPoints > 0 ? '+' : ''}
            {move.netPoints}
          </span>
          <span className="text-2xs text-muted-foreground">net residual points across {move.up + move.down + move.flat} approved assessments</span>
        </div>
        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-2xs tnum text-muted-foreground">
          <Legend colour="bg-critical" label={`${move.up} scored up`} />
          <Legend colour="bg-ok" label={`${move.down} scored down`} />
          <Legend colour="bg-border" label={`${move.flat} re-confirmed`} />
        </div>
      </div>

      <div className="card-surface p-4">
        <h3 className="mb-2 text-sm font-semibold text-foreground">Control effectiveness</h3>
        <div className="mb-2 flex h-2.5 w-full overflow-hidden rounded-full bg-muted">
          {effectiveness.map((e) => (
            <span
              key={e.effectiveness}
              className={cn(
                'h-full',
                e.effectiveness === 'Effective' ? 'bg-ok' : e.effectiveness === 'Partially effective' ? 'bg-medium' : e.effectiveness === 'Ineffective' ? 'bg-critical' : 'bg-border',
              )}
              style={{ width: `${(e.count / rated) * 100}%` }}
            />
          ))}
        </div>
        <div className="space-y-0.5">
          {effectiveness.map((e) => (
            <div key={e.effectiveness} className="flex items-center gap-2 text-2xs">
              <StatusChip status={e.effectiveness} tone={effectivenessTone(e.effectiveness)} />
              <span className="ml-auto tnum text-muted-foreground">{e.count}</span>
            </div>
          ))}
        </div>
        {weak.length > 0 && (
          <div className="mt-2 border-t border-border pt-2">
            <div className="mb-1 text-2xs font-semibold uppercase tracking-wide text-muted-foreground">Flagged by the first line</div>
            {weak.slice(0, 3).map((w) => (
              <button
                key={w.controlId}
                onClick={() => navigate(`/controls/${w.controlId}`)}
                className="group flex w-full items-center gap-1.5 rounded px-1 py-0.5 text-left hover:bg-info-soft/30"
                title={w.comment}
              >
                <span className="font-mono text-2xs font-semibold text-info">{w.controlId}</span>
                <span className="ml-auto shrink-0 text-2xs tnum text-muted-foreground">
                  on {w.riskIds.length} risk{w.riskIds.length === 1 ? '' : 's'}
                </span>
                <ArrowUpRight className="size-3 shrink-0 text-muted-foreground opacity-0 group-hover:opacity-100" />
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="card-surface p-4">
        <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-foreground">
          <Lightbulb className="size-4 text-info" /> Emerging concerns
        </h3>
        {concerns.length > 0 ? (
          <div className="space-y-1.5">
            {concerns.slice(0, 3).map((c) => (
              <div key={c.task.id} className="rounded-md border border-info/30 bg-info-soft/20 px-2 py-1.5">
                <p className="text-2xs text-foreground">{c.concern}</p>
                <p className="mt-0.5 text-2xs text-muted-foreground">
                  {c.raisedBy} · against {c.task.objectId}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">No assessor raised a concern outside the existing register this cycle.</p>
        )}
      </div>
    </div>
  )
}

/**
 * What an attestation cycle says beyond the completion bar: which departments
 * are holding it up, whether the message actually landed, and what people
 * declared on the way through.
 */
function AttestationCyclePanels({ campaign }: { campaign: Campaign }) {
  const navigate = useNavigate()
  const policy = getPolicy(campaign.scope.objectIds[0])
  const coverage = policy ? policyCoverage(policy, [campaign]) : undefined
  const byDept = outstandingByDepartment(campaign).filter((d) => d.outstanding > 0)
  const comp = comprehensionSummary(campaign)
  const decls = declarations(campaign)

  return (
    <div className="mb-4 grid grid-cols-1 gap-3 lg:grid-cols-3">
      <div className="card-surface p-4">
        <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-foreground">
          <FileText className="size-4 text-muted-foreground" /> Version coverage
        </h3>
        {policy && coverage ? (
          <>
            <button
              onClick={() => navigate(`/policies/${policy.id}`)}
              className="group flex w-full items-center gap-2 rounded-md border border-border bg-background px-2 py-1.5 text-left hover:border-info/40"
            >
              <span className="font-mono text-2xs font-semibold text-info">{policy.id}</span>
              <span className="min-w-0 flex-1 truncate text-2xs text-foreground">{policy.title}</span>
              <span className="shrink-0 rounded bg-muted px-1.5 py-0 font-mono text-2xs font-semibold">{policy.version}</span>
              <ArrowUpRight className="size-3 shrink-0 text-muted-foreground opacity-0 group-hover:opacity-100" />
            </button>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className={cn('text-2xl font-semibold tnum', coverage.coveragePct === 100 ? 'text-ok' : 'text-foreground')}>
                {coverage.coveragePct}%
              </span>
              <span className="text-2xs text-muted-foreground">
                of {coverage.audience} acknowledged {policy.version}
              </span>
            </div>
            {coverage.stale > 0 && (
              <p className="mt-1 text-2xs text-medium">
                {coverage.stale} acknowledged an earlier version and have not re-signed.
              </p>
            )}
          </>
        ) : (
          <p className="text-xs text-muted-foreground">The policy this cycle covers is no longer in the register.</p>
        )}
      </div>

      <div className="card-surface p-4">
        <h3 className="mb-2 text-sm font-semibold text-foreground">Outstanding by department</h3>
        {byDept.length > 0 ? (
          <div className="space-y-1">
            {byDept.slice(0, 5).map((d) => (
              <div key={d.department} className="flex items-center gap-2" title={d.people.join(', ')}>
                <span className="min-w-0 flex-1 truncate text-2xs text-foreground">{d.department}</span>
                <span className="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
                  <span className="block h-full bg-medium" style={{ width: `${(d.outstanding / d.total) * 100}%` }} />
                </span>
                <span className="w-10 shrink-0 text-right text-2xs tnum text-muted-foreground">
                  {d.outstanding}/{d.total}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">Every department has signed.</p>
        )}
      </div>

      <div className="card-surface p-4">
        <h3 className="mb-2 text-sm font-semibold text-foreground">Comprehension &amp; declarations</h3>
        {comp.answered > 0 ? (
          <>
            <div className="flex items-baseline gap-1.5">
              <span className={cn('text-2xl font-semibold tnum', comp.meanScore >= PASS_MARK ? 'text-ok' : 'text-medium')}>{comp.meanScore}%</span>
              <span className="text-2xs text-muted-foreground">mean across {comp.answered} responses</span>
            </div>
            {comp.weakest.length > 0 && (
              <p className="mt-1 text-2xs text-muted-foreground" title={comp.weakest[0].prompt}>
                Most missed: <span className="text-foreground">{comp.weakest[0].prompt.slice(0, 72)}…</span> ({comp.weakest[0].wrong} of{' '}
                {comp.weakest[0].asked})
              </p>
            )}
          </>
        ) : (
          <p className="text-xs text-muted-foreground">No comprehension responses yet.</p>
        )}
        {decls.length > 0 && (
          <div className="mt-2 space-y-1 border-t border-border pt-2">
            {decls.slice(0, 3).map((d) => (
              <div key={d.task.id} className="flex items-start gap-1.5">
                <StatusChip status={d.declaration.kind} tone={d.declaration.kind === 'Cannot comply' ? 'danger' : 'warn'} />
                <span className="min-w-0 flex-1 text-2xs text-muted-foreground">
                  <span className="text-foreground">{personName(d.task.assignee)}</span> — {d.declaration.detail}
                </span>
                {d.declaration.issueId && (
                  <button
                    onClick={() => navigate(`/issues/${d.declaration.issueId}`)}
                    className="shrink-0 font-mono text-2xs font-semibold text-info hover:underline"
                  >
                    {d.declaration.issueId}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function TaskDrawer({ campaign, task, onClose }: { campaign: Campaign; task: CampaignTask | null; onClose: () => void }) {
  const navigate = useNavigate()
  const review = useApp((s) => s.reviewCampaignTask)
  const submit = useApp((s) => s.submitCampaignTask)
  const pushToast = useApp((s) => s.pushToast)
  const selfId = useApp((s) => s.personId)
  const canReview = useCanAct({ kind: 'risk.approve', makerId: task?.assignee })
  const risk = useEffectiveRisk(task?.objectId ?? '')
  const policy = campaign.type === 'Policy attestation' ? getPolicy(task?.objectId ?? '') : undefined
  const vendor = useEffectiveVendor(task?.objectId ?? '')

  // The draft lives here so the footer can read its completeness; it is
  // re-seeded whenever the drawer opens on a different task. Each campaign type
  // brings its own payload; the container itself never looks inside one.
  const isRcsa = campaign.type === 'RCSA' && !!risk
  const isAttestation = campaign.type === 'Policy attestation' && !!policy
  const isDd = campaign.type === 'Vendor due diligence' && !!vendor
  const [draft, setDraft] = React.useState<RcsaResponse | null>(null)
  const [ack, setAck] = React.useState<AttestationResponse | null>(null)
  const [dd, setDd] = React.useState<VendorDdResponse | null>(null)
  React.useEffect(() => {
    setDraft(risk && campaign.type === 'RCSA' ? (task ? asRcsa(task) ?? draftRcsa(risk) : null) : null)
    setAck(policy && campaign.type === 'Policy attestation' ? (task ? asAttestation(task) ?? draftAttestation(policy) : null) : null)
    setDd(vendor && campaign.type === 'Vendor due diligence' ? (task ? asVendorDd(task) ?? draftVendorDd(vendor) : null) : null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [task?.id, risk?.id, policy?.id, policy?.version, vendor?.id])

  if (!task) return null

  const spec = campaignType(campaign.type)
  const label = taskStatusLabel(task, campaign)
  const closed = campaign.status === 'Closed'
  const submitted = isRcsa && draft ? asRcsa(task) : undefined
  const submittedAck = isAttestation ? asAttestation(task) : undefined
  const submittedDd = isDd ? asVendorDd(task) : undefined
  const gaps = isRcsa && draft
    ? rcsaGaps(draft)
    : isAttestation && ack && policy
      ? attestationGaps(ack, policy)
      : isDd && dd && vendor
        ? vendorDdGaps(dd, vendor)
        : []

  return (
    <Drawer
      open={!!task}
      onClose={onClose}
      width="max-w-2xl"
      title={<span className="font-mono text-sm">{task.objectId}</span>}
      subtitle={spec.objectLabel(task.objectId)}
      footer={
        closed ? undefined : label === 'Submitted' ? (
          <div className="flex w-full items-center justify-between gap-2">
            <span className="text-2xs text-muted-foreground">
              {isRcsa && submitted && risk
                ? rcsaDelta(risk, submitted).length > 0
                  ? `Approving re-scores ${task.objectId} on the register.`
                  : `Approving re-confirms ${task.objectId} at its current score.`
                : isAttestation && submittedAck
                  ? submittedAck.declaration?.kind === 'Cannot comply'
                    ? 'Approving raises the declared gap as an exception in the register.'
                    : `Approving records the acknowledgement against ${policy?.version}.`
                  : isDd && submittedDd
                    ? `Approving concludes the review — ${submittedDd.recommendation.toLowerCase()} — and stamps the diligence date on ${task.objectId}.`
                    : `Approving writes the response back to ${task.objectId}.`}
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={!canReview}
                title={canReview ? undefined : 'The assignee cannot review their own submission.'}
                onClick={() => {
                  review(campaign.id, task.id, false)
                  pushToast({ title: 'Returned to assignee', description: `${task.objectId} sent back for rework.`, variant: 'default' })
                }}
              >
                <Undo2 className="size-4" /> Return
              </Button>
              <Button
                size="sm"
                disabled={!canReview}
                title={canReview ? undefined : 'The assignee cannot approve their own submission.'}
                onClick={() => {
                  review(campaign.id, task.id, true)
                  pushToast({ title: 'Submission approved', description: `${task.objectId} approved.`, variant: 'success' })
                }}
              >
                <CheckCircle2 className="size-4" /> Approve
              </Button>
            </div>
          </div>
        ) : task.assignee === selfId ? (
          <div className="flex w-full items-center justify-between gap-2">
            <span className="text-2xs text-muted-foreground">
              {gaps.length > 0 ? `${gaps.length} item${gaps.length === 1 ? '' : 's'} still to complete.` : `Routes to ${personName(task.reviewer ?? '')} for review.`}
            </span>
            <Button
              size="sm"
              disabled={gaps.length > 0}
              title={gaps.length > 0 ? gaps[0] : undefined}
              onClick={() => {
                submit(campaign.id, task.id, isRcsa && draft ? { ...draft } : isAttestation && ack ? { ...ack } : isDd && dd ? { ...dd } : { acknowledged: true })
                pushToast({ title: 'Submitted for review', description: `${task.objectId} sent to ${personName(task.reviewer ?? '')}.`, variant: 'success' })
              }}
            >
              {isAttestation ? 'Sign and submit' : isDd ? 'Submit review' : 'Submit assessment'}
            </Button>
          </div>
        ) : undefined
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4">
          <Attr label="Status">
            <StatusChip status={label} tone={TASK_TONE[label]} />
          </Attr>
          <Attr label="Assignee">
            <span className="inline-flex items-center gap-1.5">
              <Avatar id={task.assignee} size={20} /> {personName(task.assignee)}
            </span>
          </Attr>
          <Attr label="Reviewer">
            {task.reviewer ? (
              <span className="inline-flex items-center gap-1.5">
                <Avatar id={task.reviewer} size={20} /> {personName(task.reviewer)}
              </span>
            ) : (
              '—'
            )}
          </Attr>
          <Attr label="Submitted">{task.submittedOn ? fmtIST(task.submittedOn) : '—'}</Attr>
        </div>

        {/* The assessor fills the form; everyone else reads the submission. */}
        {isRcsa && risk && draft && !closed && task.assignee === selfId && label !== 'Submitted' ? (
          <RcsaForm risk={risk} value={draft} onChange={setDraft} />
        ) : isAttestation && policy && ack && !closed && task.assignee === selfId && label !== 'Submitted' ? (
          <AttestationForm policy={policy} value={ack} onChange={setAck} />
        ) : isRcsa && risk && submitted ? (
          <RcsaSummary risk={risk} response={submitted} />
        ) : isDd && vendor && dd && !closed && task.assignee === selfId && label !== 'Submitted' ? (
          <VendorDdForm vendor={vendor} value={dd} onChange={setDd} />
        ) : isAttestation && policy && submittedAck ? (
          <AttestationSummary policy={policy} response={submittedAck} />
        ) : isDd && vendor && submittedDd ? (
          <VendorDdSummary vendor={vendor} response={submittedDd} />
        ) : (
          <div>
            <div className="mb-1 text-2xs font-semibold uppercase tracking-wide text-muted-foreground">Response</div>
            {task.status === 'Not started' ? (
              <p className="rounded-md border border-dashed border-border px-3 py-2 text-xs text-muted-foreground">
                Not yet submitted.
              </p>
            ) : (
              <div className="rounded-md border border-border bg-muted/30 px-3 py-2">
                <p className="text-xs font-medium text-foreground">{spec.summarise(task)}</p>
                <dl className="mt-1.5 space-y-0.5">
                  {Object.entries(task.response).map(([k, v]) => (
                    <div key={k} className="flex gap-2 text-2xs">
                      <dt className="shrink-0 text-muted-foreground">{k}</dt>
                      <dd className="min-w-0 flex-1 text-foreground">{typeof v === 'object' ? JSON.stringify(v) : String(v)}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            )}
          </div>
        )}

        {task.reviewNote && (
          <div>
            <div className="mb-1 text-2xs font-semibold uppercase tracking-wide text-muted-foreground">Reviewer note</div>
            <p className="rounded-md border border-medium/40 bg-medium-soft/40 px-3 py-2 text-xs text-foreground">{task.reviewNote}</p>
          </div>
        )}

        <button
          onClick={() => {
            onClose()
            navigate(spec.objectRoute(task.objectId))
          }}
          className="group flex w-full items-center gap-2 rounded-md border border-border bg-background px-2.5 py-2 text-left hover:border-info/40 hover:bg-info-soft/40"
        >
          <span className="font-mono text-2xs font-semibold text-info">{task.objectId}</span>
          <span className="min-w-0 flex-1 truncate text-xs text-foreground">{spec.objectLabel(task.objectId)}</span>
          <ArrowUpRight className="size-3 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
        </button>
      </div>
    </Drawer>
  )
}

function Legend({ colour, label }: { colour: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1">
      <span className={cn('size-2 rounded-full', colour)} /> {label}
    </span>
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
