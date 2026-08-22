import * as React from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowUpRight, CheckCircle2, ShieldAlert, Undo2, Send, BellRing } from 'lucide-react'
import { MakerCheckerChain } from '@/components/MakerChecker'
import { StatusChip } from '@/components/StatusChip'
import { Avatar } from '@/components/Avatar'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'
import { personName } from '@/data/people'
import { getControl } from '@/data'
import { fmtDate, fmtIST } from '@/lib/time'
import { useApp } from '@/store'
import { useCanAct } from '@/lib/gating'
import { acceptanceState, actionProgress, isAboveTarget, reviewLadder } from '@/lib/riskWorkflow'
import type { Risk } from '@/types'

export function RiskApprovalsTab({ risk }: { risk: Risk }) {
  const navigate = useNavigate()
  const pushToast = useApp((s) => s.pushToast)
  const submit = useApp((s) => s.submitRiskTreatment)
  const approve = useApp((s) => s.approveRiskTreatment)
  const returnPlan = useApp((s) => s.returnRiskTreatment)

  const { review, approval, acceptance } = risk.lifecycle
  const progress = actionProgress(risk)
  // The execution gate: a plan cannot be approved while an action is still open.
  const gateOpen = progress.total > 0 && progress.done < progress.total

  const canSubmit = useCanAct({ kind: 'risk.submit' })
  const canApprove = useCanAct({ kind: 'risk.approve', makerId: approval.maker })
  const accState = acceptanceState(risk)
  const ladder = reviewLadder(risk)
  const fired = ladder.filter((e) => e.fired)

  return (
    <div className="space-y-4">
      {/* review */}
      <div className="card-surface p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">Second-line review</h3>
          <StatusChip
            status={review.outcome}
            tone={review.outcome === 'Endorsed' ? 'ok' : review.outcome === 'Returned' ? 'warn' : 'progress'}
          />
        </div>
        <div className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3">
          <Attr label="Reviewer">
            <span className="inline-flex items-center gap-1.5">
              <Avatar id={review.reviewer} size={20} />
              <span className="text-xs">{personName(review.reviewer)}</span>
            </span>
          </Attr>
          <Attr label="Reviewed">{review.reviewedOn ? fmtDate(review.reviewedOn) : '—'}</Attr>
          <Attr label="Execution gate">
            {progress.total === 0 ? (
              <span className="text-xs text-muted-foreground">Not applicable</span>
            ) : gateOpen ? (
              <span className="text-xs font-medium text-medium tnum">
                {progress.total - progress.done} action{progress.total - progress.done === 1 ? '' : 's'} open
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-xs text-ok">
                <CheckCircle2 className="size-3.5" /> All actions closed
              </span>
            )}
          </Attr>
        </div>
        {review.note && (
          <p className="mt-3 rounded-md border border-border bg-muted/30 px-3 py-2 text-xs leading-relaxed text-foreground">{review.note}</p>
        )}
      </div>

      {/* approval chain */}
      <div className="card-surface p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">Approval chain (maker-checker)</h3>
          <StatusChip status={approval.state} />
        </div>
        <MakerCheckerChain
          mc={approval}
          submittedAt={approval.submittedOn}
          approvedAt={approval.approvedOn}
          makerRole="Owner (prepares the plan)"
          checkerRole="Approver (signs off)"
        />

        <div className="mt-3 flex flex-wrap items-center gap-2">
          {approval.state !== 'Approved' && approval.state !== 'Submitted' && (
            <Button
              size="sm"
              disabled={!canSubmit || gateOpen}
              title={
                gateOpen
                  ? 'Every remediation action must be closed before the plan can be submitted for approval.'
                  : canSubmit
                    ? undefined
                    : 'Submitting a treatment plan is done by the Risk Manager, Control Owner or Compliance Manager.'
              }
              onClick={() => {
                submit(risk.id)
                pushToast({ title: 'Treatment plan submitted', description: `${risk.id} sent to ${personName(approval.checker)} for approval.`, variant: 'success' })
              }}
            >
              <Send className="size-4" /> Submit for approval
            </Button>
          )}
          {approval.state === 'Submitted' && (
            <>
              <Button
                size="sm"
                disabled={!canApprove}
                title={canApprove ? undefined : 'The person who prepared the plan cannot approve it. Switch to the Risk Manager or Executive persona.'}
                onClick={() => {
                  approve(risk.id)
                  pushToast({ title: 'Treatment plan approved', description: `${risk.id} approved and moved to monitoring.`, variant: 'success' })
                }}
              >
                <CheckCircle2 className="size-4" /> Approve
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={!canApprove}
                title={canApprove ? undefined : 'The person who prepared the plan cannot return it to themselves.'}
                onClick={() => {
                  returnPlan(risk.id)
                  pushToast({ title: 'Treatment plan returned', description: `${risk.id} returned to ${personName(risk.owner)}.`, variant: 'default' })
                }}
              >
                <Undo2 className="size-4" /> Return to owner
              </Button>
            </>
          )}
          {approval.state === 'Approved' && (
            <span className="inline-flex items-center gap-1.5 text-xs text-ok">
              <CheckCircle2 className="size-4" /> Approved by {personName(approval.checker)}
              {approval.approvedOn ? ` on ${fmtDate(approval.approvedOn)}` : ''}
            </span>
          )}
        </div>
      </div>

      {/* acceptance / exception */}
      {acceptance ? (
        <div
          className={cn(
            'card-surface p-4',
            accState === 'Expired' ? 'border-critical/40' : accState === 'Expiring soon' ? 'border-medium/40' : undefined,
          )}
        >
          <div className="mb-3 flex items-center justify-between">
            <h3 className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
              <ShieldAlert className={cn('size-4', accState === 'Expired' ? 'text-critical' : 'text-medium')} />
              Risk acceptance
            </h3>
            <StatusChip
              status={accState ?? 'Active'}
              tone={accState === 'Expired' ? 'danger' : accState === 'Expiring soon' ? 'warn' : 'neutral'}
            />
          </div>
          <div className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4">
            <Attr label="Accepted by">
              <span className="inline-flex items-center gap-1.5">
                <Avatar id={acceptance.acceptedBy} size={20} />
                <span className="text-xs">{personName(acceptance.acceptedBy)}</span>
              </span>
            </Attr>
            <Attr label="Accepted on">{fmtDate(acceptance.acceptedOn)}</Attr>
            <Attr label="Expires">
              <span className={cn('tnum', accState === 'Expired' ? 'font-medium text-critical' : accState === 'Expiring soon' ? 'font-medium text-medium' : undefined)}>
                {fmtDate(acceptance.expiresOn)}
              </span>
            </Attr>
            <Attr label="Compensating control">
              {acceptance.compensatingControlId ? (
                <button
                  onClick={() => navigate(`/controls/${acceptance.compensatingControlId}`)}
                  className="font-mono text-2xs font-semibold text-info hover:underline"
                >
                  {acceptance.compensatingControlId} <ArrowUpRight className="inline size-3" />
                </button>
              ) : (
                '—'
              )}
            </Attr>
          </div>
          <p className="mt-3 text-xs leading-relaxed text-foreground">{acceptance.rationale}</p>
          {acceptance.compensatingControlId && (
            <CompensatingControl id={acceptance.compensatingControlId} onOpen={() => navigate(`/controls/${acceptance.compensatingControlId}`)} />
          )}
        </div>
      ) : (
        isAboveTarget(risk) && <AcceptancePrompt risk={risk} />
      )}

      {/* review cadence ladder */}
      <div className="card-surface p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
            <BellRing className="size-4 text-info" /> Periodic review
          </h3>
          <span className="text-2xs text-muted-foreground">
            {risk.lifecycle.ownership.reviewFrequency} · next {fmtDate(risk.lifecycle.ownership.nextReviewOn)}
          </span>
        </div>
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
              <span className="shrink-0 tnum text-muted-foreground" title={fmtIST(e.at)}>
                {fmtDate(e.at)}
              </span>
            </li>
          ))}
        </ol>
        <p className="mt-2 text-2xs tnum text-muted-foreground">
          {fired.length} of {ladder.length} rungs fired.
        </p>
      </div>
    </div>
  )
}

function CompensatingControl({ id, onOpen }: { id: string; onOpen: () => void }) {
  const c = getControl(id)
  if (!c) return null
  return (
    <button
      onClick={onOpen}
      className="group mt-3 flex w-full items-center gap-2 rounded-md border border-border bg-background px-2.5 py-2 text-left hover:border-info/40 hover:bg-info-soft/40"
    >
      <span className="font-mono text-2xs font-semibold text-info">{c.id}</span>
      <span className="min-w-0 flex-1 truncate text-xs text-foreground">{c.title}</span>
      <StatusChip status={c.result} />
      <span className="shrink-0 text-2xs tnum text-muted-foreground">tested {fmtDate(c.lastTested)}</span>
      <ArrowUpRight className="size-3 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
    </button>
  )
}

/** Residual above target with no acceptance on file is an undocumented gap —
 *  offer the formal, time-bound decision rather than leaving it silent. */
function AcceptancePrompt({ risk }: { risk: Risk }) {
  const acceptRisk = useApp((s) => s.acceptRisk)
  const pushToast = useApp((s) => s.pushToast)
  const canAccept = useCanAct({ kind: 'risk.accept', makerId: risk.owner })
  const [rationale, setRationale] = React.useState('')
  const target = risk.lifecycle.treatment.targetResidual
  const expiresOn = new Date(Date.now() + 182 * 86400000).toISOString()

  return (
    <div className="card-surface border-medium/40 p-4">
      <h3 className="mb-1 flex items-center gap-1.5 text-sm font-semibold text-foreground">
        <ShieldAlert className="size-4 text-medium" /> Residual above target
      </h3>
      <p className="mb-3 text-xs text-muted-foreground tnum">
        Residual {risk.residual}/25 against a target of {target}/25. Either further treatment closes the gap, or the exposure is formally
        accepted for a bounded period.
      </p>
      <textarea
        value={rationale}
        onChange={(e) => setRationale(e.target.value)}
        rows={2}
        placeholder="Rationale for accepting the residual exposure…"
        className="mb-2 w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:border-info focus:outline-none"
      />
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant="outline"
          disabled={!canAccept || rationale.trim().length < 10}
          title={
            !canAccept
              ? 'A risk owner cannot accept their own risk. Switch to the Executive or Risk Manager persona.'
              : rationale.trim().length < 10
                ? 'Record a rationale before accepting.'
                : undefined
          }
          onClick={() => {
            acceptRisk(risk.id, { rationale: rationale.trim(), expiresOn, compensatingControlId: risk.linkedControls[0] })
            pushToast({ title: 'Risk accepted', description: `${risk.id} accepted until ${fmtDate(expiresOn)}.`, variant: 'success' })
          }}
        >
          Accept with expiry {fmtDate(expiresOn)}
        </Button>
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
