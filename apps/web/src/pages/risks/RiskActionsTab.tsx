import * as React from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowUpRight, BellRing, CheckCircle2, CircleDot, PlayCircle } from 'lucide-react'
import { DataTable, type Column } from '@/components/DataTable'
import { StatusChip } from '@/components/StatusChip'
import { Avatar } from '@/components/Avatar'
import { Drawer } from '@/components/Drawer'
import { Button } from '@/components/ui/Button'
import { EvidenceList } from '@/components/EvidenceList'
import { cn } from '@/lib/utils'
import { personName } from '@/data/people'
import { fmtDate, fmtIST } from '@/lib/time'
import { useApp } from '@/store'
import { useCanAct } from '@/lib/gating'
import { actionLadder, actionStatusLabel, isActionOverdue } from '@/lib/riskWorkflow'
import type { Risk, RiskAction } from '@/types'

const STATUS_TONE = (a: RiskAction) =>
  isActionOverdue(a) ? 'danger' : a.status === 'Done' ? 'ok' : a.status === 'Blocked' ? 'warn' : a.status === 'In progress' ? 'progress' : 'neutral'

export function RiskActionsTab({ risk }: { risk: Risk }) {
  const navigate = useNavigate()
  const [open, setOpen] = React.useState<RiskAction | null>(null)
  const actions = risk.lifecycle.treatment.actions

  if (actions.length === 0) {
    return (
      <div className="card-surface p-4">
        <h3 className="mb-1 text-sm font-semibold text-foreground">Remediation actions</h3>
        <p className="text-xs text-muted-foreground">
          {risk.lifecycle.treatment.decision === 'Accept'
            ? 'No execution actions — this risk is treated by formal acceptance. See the Approvals tab for the acceptance record and its expiry.'
            : `No execution actions — this risk is treated by ${risk.lifecycle.treatment.decision.toLowerCase()}. See the Treatment tab for the decision and its rationale.`}
        </p>
      </div>
    )
  }

  const columns: Column<RiskAction>[] = [
    {
      key: 'seq',
      header: '#',
      className: 'w-10',
      sortValue: (a) => a.seq,
      render: (a) => <span className="font-mono text-2xs tnum text-muted-foreground">{a.seq}</span>,
    },
    {
      key: 'title',
      header: 'Action',
      sortValue: (a) => a.title,
      render: (a) => (
        <div className="min-w-0">
          <div className="truncate text-xs font-medium text-foreground">{a.title}</div>
          <div className="font-mono text-2xs text-muted-foreground">
            {a.id}
            {a.dependsOnSeq ? ` · after step ${a.dependsOnSeq}` : ''}
          </div>
        </div>
      ),
    },
    {
      key: 'owner',
      header: 'Owner → reviewer',
      sortValue: (a) => personName(a.owner),
      render: (a) => (
        <span className="inline-flex items-center gap-1" title={`${personName(a.owner)} → ${personName(a.reviewer)}`}>
          <Avatar id={a.owner} size={18} />
          <span className="text-muted-foreground">→</span>
          <Avatar id={a.reviewer} size={18} />
        </span>
      ),
    },
    {
      key: 'milestones',
      header: 'Milestones',
      className: 'w-28',
      sortValue: (a) => a.milestones.filter((m) => m.done).length / Math.max(1, a.milestones.length),
      render: (a) => {
        const done = a.milestones.filter((m) => m.done).length
        return (
          <span className="inline-flex items-center gap-1.5">
            <span className="flex gap-0.5">
              {a.milestones.map((m, i) => (
                <span key={i} className={cn('h-1.5 w-3 rounded-sm', m.done ? 'bg-ok' : 'bg-border')} />
              ))}
            </span>
            <span className="text-2xs tnum text-muted-foreground">
              {done}/{a.milestones.length}
            </span>
          </span>
        )
      },
    },
    {
      key: 'residual',
      header: '−Residual',
      align: 'right',
      className: 'w-20',
      sortValue: (a) => a.residualContribution,
      render: (a) => <span className="text-xs tnum text-foreground">−{a.residualContribution}</span>,
    },
    {
      key: 'due',
      header: 'Due',
      className: 'w-24',
      sortValue: (a) => new Date(a.dueDate).getTime(),
      render: (a) => (
        <span className={cn('text-xs tnum', isActionOverdue(a) ? 'font-medium text-critical' : 'text-muted-foreground')}>{fmtDate(a.dueDate)}</span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      className: 'w-28',
      sortValue: (a) => actionStatusLabel(a),
      render: (a) => <StatusChip status={actionStatusLabel(a)} tone={STATUS_TONE(a)} />,
    },
    {
      key: 'issue',
      header: 'Issue',
      className: 'w-28',
      sortValue: (a) => a.issueId ?? '',
      render: (a) =>
        a.issueId ? (
          <button
            onClick={(e) => {
              e.stopPropagation()
              navigate(`/issues/${a.issueId}`)
            }}
            className="font-mono text-2xs font-semibold text-info hover:underline"
          >
            {a.issueId}
          </button>
        ) : (
          <span className="text-2xs text-muted-foreground">—</span>
        ),
    },
  ]

  return (
    <>
      <DataTable
        data={actions}
        columns={columns}
        searchKeys={['id', 'title', (a) => personName(a.owner)]}
        searchPlaceholder="Search action, id or owner…"
        initialSort={{ key: 'seq', dir: 'asc' }}
        onRowClick={(a) => setOpen(a)}
        pageSize={20}
        rightSlot={
          <span className="text-2xs tnum text-muted-foreground">
            {actions.filter((a) => a.status === 'Done').length}/{actions.length} complete
            {actions.filter(isActionOverdue).length > 0 && (
              <span className="ml-1.5 font-medium text-critical">{actions.filter(isActionOverdue).length} overdue</span>
            )}
          </span>
        }
      />
      <ActionDrawer risk={risk} action={open} onClose={() => setOpen(null)} />
    </>
  )
}

function ActionDrawer({ risk, action, onClose }: { risk: Risk; action: RiskAction | null; onClose: () => void }) {
  const advance = useApp((s) => s.advanceRiskAction)
  const pushToast = useApp((s) => s.pushToast)
  const setEvidenceDraft = useApp((s) => s.setEvidenceDraft)
  const navigate = useNavigate()
  const canAdvance = useCanAct({ kind: 'risk.action.advance' })
  if (!action) return null

  const ladder = actionLadder(action)
  const nextLabel = action.status === 'Not started' ? 'Start action' : 'Mark complete'

  return (
    <Drawer
      open={!!action}
      onClose={onClose}
      title={<span className="font-mono text-sm">{action.id}</span>}
      subtitle={action.title}
      footer={
        action.status !== 'Done' ? (
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              disabled={!canAdvance}
              title={canAdvance ? undefined : 'Progressing remediation actions is done by the Risk Manager, Control Owner or Compliance Manager.'}
              onClick={() => {
                advance(risk.id, action.id)
                pushToast({
                  title: nextLabel === 'Start action' ? 'Action started' : 'Action completed',
                  description:
                    nextLabel === 'Start action'
                      ? `${action.id} moved to In progress.`
                      : `${action.id} closed — residual reduced by ${action.residualContribution}.`,
                  variant: 'success',
                })
                onClose()
              }}
            >
              {action.status === 'Not started' ? <PlayCircle className="size-4" /> : <CheckCircle2 className="size-4" />} {nextLabel}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setEvidenceDraft({ controlId: risk.linkedControls[0] })
                navigate('/evidence/new')
              }}
            >
              Attach evidence
            </Button>
          </div>
        ) : undefined
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Owner (maker)">
            <span className="inline-flex items-center gap-1.5">
              <Avatar id={action.owner} size={20} /> {personName(action.owner)}
            </span>
          </Field>
          <Field label="Reviewer (checker)">
            <span className="inline-flex items-center gap-1.5">
              <Avatar id={action.reviewer} size={20} /> {personName(action.reviewer)}
            </span>
          </Field>
          <Field label="Due">
            <span className={cn('tnum', isActionOverdue(action) && 'font-medium text-critical')}>{fmtIST(action.dueDate)}</span>
          </Field>
          <Field label="Status">
            <StatusChip status={actionStatusLabel(action)} tone={STATUS_TONE(action)} />
          </Field>
          <Field label="Residual contribution">−{action.residualContribution} points</Field>
          <Field label="Tracked as">
            {action.issueId ? (
              <button onClick={() => navigate(`/issues/${action.issueId}`)} className="font-mono text-xs font-semibold text-info hover:underline">
                {action.issueId} <ArrowUpRight className="inline size-3" />
              </button>
            ) : (
              <span className="text-muted-foreground">—</span>
            )}
          </Field>
        </div>

        <div>
          <h4 className="mb-1.5 text-2xs font-semibold uppercase tracking-wide text-muted-foreground">Milestones</h4>
          <ol className="space-y-1">
            {action.milestones.map((m, i) => (
              <li key={i} className="flex items-center gap-2 rounded-md border border-border bg-background px-2.5 py-1.5">
                {m.done ? <CheckCircle2 className="size-3.5 shrink-0 text-ok" /> : <CircleDot className="size-3.5 shrink-0 text-muted-foreground" />}
                <span className={cn('min-w-0 flex-1 truncate text-xs', m.done ? 'text-foreground' : 'text-muted-foreground')}>{m.label}</span>
                <span className="shrink-0 text-2xs tnum text-muted-foreground">{fmtDate(m.dueDate)}</span>
              </li>
            ))}
          </ol>
        </div>

        {action.evidenceIds.length > 0 && (
          <div>
            <h4 className="mb-1.5 text-2xs font-semibold uppercase tracking-wide text-muted-foreground">Evidence</h4>
            <EvidenceList ids={action.evidenceIds} />
          </div>
        )}

        {ladder.length > 0 && (
          <div>
            <h4 className="mb-1.5 flex items-center gap-1.5 text-2xs font-semibold uppercase tracking-wide text-muted-foreground">
              <BellRing className="size-3.5 text-info" /> Reminder &amp; escalation ladder
            </h4>
            <ol className="space-y-1">
              {ladder.map((e, i) => (
                <li
                  key={i}
                  className={cn(
                    'flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-2xs',
                    e.fired ? 'border-border bg-muted/40' : 'border-dashed border-border',
                  )}
                >
                  <span className={cn('rounded px-1.5 py-0 font-semibold', e.fired ? 'bg-ok-soft text-ok' : 'bg-muted text-muted-foreground')}>
                    {e.fired ? 'Fired' : 'Scheduled'}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-foreground">
                    {e.kind === 'reminder' ? `Reminder to ${personName(e.target)}` : `Escalate to ${e.targetRole}`} · {e.intervalLabel}
                  </span>
                  <span className="shrink-0 tnum text-muted-foreground">{fmtDate(e.at)}</span>
                </li>
              ))}
            </ol>
          </div>
        )}
      </div>
    </Drawer>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-2xs font-medium uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-0.5 text-xs text-foreground">{children}</div>
    </div>
  )
}

