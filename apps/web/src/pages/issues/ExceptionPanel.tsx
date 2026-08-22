import * as React from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowUpRight, BellRing, CalendarClock, CheckCircle2, FileWarning, ShieldCheck, Undo2, XCircle } from 'lucide-react'
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
import { exceptionLadder, exceptionOrigin, exceptionState } from '@/lib/exceptions'
import type { Issue } from '@/types'

const TONE = { Active: 'ok', 'Expiring soon': 'warn', Expired: 'danger', Closed: 'neutral' } as const

/** The deviation record behind an exception issue: why it exists, what covers
 *  the gap in the meantime, who approved it and when it runs out. */
export function ExceptionPanel({ issue }: { issue: Issue }) {
  const navigate = useNavigate()
  const pushToast = useApp((s) => s.pushToast)
  const approveException = useApp((s) => s.approveException)
  const renewException = useApp((s) => s.renewException)
  const closeException = useApp((s) => s.closeException)

  const e = issue.exception
  const state = exceptionState(issue)
  const origin = exceptionOrigin(issue)
  const ladder = exceptionLadder(issue)
  const [renewDays, setRenewDays] = React.useState(90)

  const canApprove = useCanAct({ kind: 'exception.approve', makerId: e?.requestedBy })
  const canRenew = useCanAct({ kind: 'exception.renew', makerId: e?.requestedBy })
  const canClose = useCanAct({ kind: 'exception.close' })

  if (!e) return null

  const awaiting = e.approvalState === 'Requested'
  const rejected = e.approvalState === 'Rejected'
  const settled = !!e.closedOn || issue.status === 'Resolved'
  const compensating = e.compensatingControl ? getControl(e.compensatingControl) : undefined

  return (
    <div
      className={cn(
        'card-surface p-4',
        state === 'Expired' && !settled ? 'border-critical/40' : state === 'Expiring soon' ? 'border-medium/40' : undefined,
      )}
    >
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <h3 className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
          <FileWarning className={cn('size-4', state === 'Expired' && !settled ? 'text-critical' : 'text-medium')} />
          Exception
        </h3>
        {awaiting ? (
          <StatusChip status="Awaiting approval" tone="progress" />
        ) : rejected ? (
          <StatusChip status="Rejected" tone="neutral" />
        ) : (
          state && <StatusChip status={state} tone={TONE[state]} />
        )}
        {e.renewalCount > 0 && (
          <span className={cn('rounded px-1.5 py-0.5 text-2xs font-semibold', e.renewalCount >= 2 ? 'bg-medium-soft text-medium' : 'bg-muted text-muted-foreground')}>
            renewed {e.renewalCount}×
          </span>
        )}
        {origin && (
          <button
            onClick={() => navigate(origin.route)}
            className="ml-auto inline-flex items-center gap-1 font-mono text-2xs font-semibold text-info hover:underline"
          >
            {origin.kind}: {origin.id} <ArrowUpRight className="size-3" />
          </button>
        )}
      </div>

      <p className="mb-3 rounded-md border border-border bg-muted/30 px-3 py-2 text-xs leading-relaxed text-foreground">{e.reason}</p>

      <div className="mb-3 grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4">
        <Attr label="Requested by">
          <span className="inline-flex items-center gap-1.5">
            <Avatar id={e.requestedBy} size={20} />
            <span className="truncate text-xs">{personName(e.requestedBy)}</span>
          </span>
        </Attr>
        <Attr label="Requested on">{fmtDate(e.requestedOn)}</Attr>
        <Attr label="Approved on">{e.approvedOn ? fmtDate(e.approvedOn) : '—'}</Attr>
        <Attr label="Expires">
          <span className={cn('tnum', state === 'Expired' && !settled ? 'font-medium text-critical' : state === 'Expiring soon' ? 'font-medium text-medium' : undefined)}>
            {fmtDate(e.expiresOn)}
          </span>
        </Attr>
      </div>

      {compensating ? (
        <button
          onClick={() => navigate(`/controls/${compensating.id}`)}
          className="group mb-3 flex w-full items-center gap-2 rounded-md border border-border bg-background px-2.5 py-2 text-left hover:border-info/40 hover:bg-info-soft/40"
        >
          <ShieldCheck className="size-3.5 shrink-0 text-ok" />
          <span className="text-2xs font-medium uppercase tracking-wide text-muted-foreground">Compensating</span>
          <span className="font-mono text-2xs font-semibold text-info">{compensating.id}</span>
          <span className="min-w-0 flex-1 truncate text-xs text-foreground">{compensating.title}</span>
          <StatusChip status={compensating.result} />
          <ArrowUpRight className="size-3 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
        </button>
      ) : (
        <p className="mb-3 rounded-md border border-medium/40 bg-medium-soft px-2.5 py-2 text-2xs text-medium">
          No compensating control recorded — the gap is uncovered for the life of this exception.
        </p>
      )}

      <div className="mb-3">
        <h4 className="mb-1.5 text-2xs font-semibold uppercase tracking-wide text-muted-foreground">Approval (maker-checker)</h4>
        <MakerCheckerChain
          mc={{ maker: e.requestedBy, checker: e.approvedBy, state: awaiting ? 'Submitted' : rejected ? 'Drafted' : 'Approved' }}
          submittedAt={e.requestedOn}
          approvedAt={e.approvedOn}
          makerRole="Requested by"
          checkerRole="Approved by"
        />
      </div>

      {!settled && !rejected && (
        <div className="mb-3 flex flex-wrap items-center gap-2">
          {awaiting ? (
            <>
              <Button
                size="sm"
                disabled={!canApprove}
                title={canApprove ? undefined : 'The person who requested an exception cannot approve it. Switch to the Compliance Manager, Risk Manager or Executive persona.'}
                onClick={() => {
                  approveException(issue.id, true)
                  pushToast({ title: 'Exception approved', description: `${issue.id} in force until ${fmtDate(e.expiresOn)}.`, variant: 'success' })
                }}
              >
                <CheckCircle2 className="size-4" /> Approve exception
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={!canApprove}
                title={canApprove ? undefined : 'Only a checker other than the requester may decide this.'}
                onClick={() => {
                  approveException(issue.id, false)
                  pushToast({ title: 'Exception rejected', description: `${issue.id} refused — the original remediation date stands.`, variant: 'default' })
                }}
              >
                <XCircle className="size-4" /> Reject
              </Button>
            </>
          ) : (
            <>
              <div className="inline-flex items-center gap-1.5">
                <select
                  value={renewDays}
                  onChange={(ev) => setRenewDays(Number(ev.target.value))}
                  className="h-7 rounded-md border border-border bg-background px-1.5 text-xs outline-none focus:ring-2 focus:ring-ring"
                >
                  {[30, 60, 90, 180].map((d) => (
                    <option key={d} value={d}>
                      +{d} days
                    </option>
                  ))}
                </select>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!canRenew}
                  title={canRenew ? undefined : 'Renewing extends a deviation, so the requester cannot renew their own exception.'}
                  onClick={() => {
                    const next = new Date(Date.now() + renewDays * 86400000).toISOString()
                    renewException(issue.id, next)
                    pushToast({ title: 'Exception renewed', description: `${issue.id} extended to ${fmtDate(next)}.`, variant: 'success' })
                  }}
                >
                  <CalendarClock className="size-4" /> Renew
                </Button>
              </div>
              <Button
                variant="outline"
                size="sm"
                disabled={!canClose}
                title={canClose ? undefined : 'Closing an exception is done by the Control Owner, Compliance Manager or Auditor.'}
                onClick={() => {
                  closeException(issue.id)
                  pushToast({ title: 'Exception closed', description: `${issue.id} withdrawn — the underlying condition is remediated.`, variant: 'success' })
                }}
              >
                <Undo2 className="size-4" /> Close (remediated)
              </Button>
            </>
          )}
        </div>
      )}

      {ladder.length > 0 && (
        <div>
          <h4 className="mb-1.5 flex items-center gap-1.5 text-2xs font-semibold uppercase tracking-wide text-muted-foreground">
            <BellRing className="size-3.5 text-info" /> Expiry reminders &amp; escalation
          </h4>
          <ol className="space-y-1">
            {ladder.map((r, i) => (
              <li
                key={i}
                className={cn(
                  'flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-2xs',
                  r.fired ? 'border-border bg-muted/40' : 'border-dashed border-border',
                )}
              >
                <span className={cn('rounded px-1.5 py-0 font-semibold', r.fired ? 'bg-ok-soft text-ok' : 'bg-muted text-muted-foreground')}>
                  {r.fired ? 'Fired' : 'Scheduled'}
                </span>
                <span className="min-w-0 flex-1 truncate text-foreground">
                  {r.kind === 'reminder' ? `Reminder to ${personName(r.target)}` : `Escalate to ${r.targetRole}`} · {r.intervalLabel}
                </span>
                <span className="shrink-0 tnum text-muted-foreground" title={fmtIST(r.at)}>
                  {fmtDate(r.at)}
                </span>
              </li>
            ))}
          </ol>
        </div>
      )}
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
