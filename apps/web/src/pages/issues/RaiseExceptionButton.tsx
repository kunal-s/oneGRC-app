import * as React from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowUpRight, FileWarning } from 'lucide-react'
import { Drawer } from '@/components/Drawer'
import { Button } from '@/components/ui/Button'
import { StatusChip } from '@/components/StatusChip'
import { cn } from '@/lib/utils'
import { WORLD } from '@/data'
import { personName, lineManagerOf, COMPLIANCE_OFFICER } from '@/data/people'
import { fmtDate } from '@/lib/time'
import { useApp } from '@/store'
import { useCanAct } from '@/lib/gating'
import { useEffectiveIssues } from '@/lib/effective'
import { exceptionState, exceptionsForRef } from '@/lib/exceptions'
import type { Issue, Severity } from '@/types'

const TONE = { Active: 'ok', 'Expiring soon': 'warn', Expired: 'danger', Closed: 'neutral' } as const

/**
 * "Raise exception" from a control or an obligation record — the entry point to
 * the register. Also shows any exception already on file against this record, so
 * the deviation is visible where the duty lives, not only in /issues.
 */
export function RaiseExceptionButton({
  refId,
  refTitle,
  ownerId,
  severity = 'Medium',
  className,
}: {
  refId: string
  refTitle: string
  ownerId: string
  severity?: Severity
  className?: string
}) {
  const navigate = useNavigate()
  const raiseException = useApp((s) => s.raiseException)
  const pushToast = useApp((s) => s.pushToast)
  const selfId = useApp((s) => s.personId)
  const canRaise = useCanAct({ kind: 'exception.raise' })
  const issues = useEffectiveIssues()

  const existing = exceptionsForRef(issues, refId)
  const [open, setOpen] = React.useState(false)
  const [reason, setReason] = React.useState('')
  const [days, setDays] = React.useState(90)
  const [compensating, setCompensating] = React.useState('')

  // The checker must not be the requester — default to the requester's line
  // manager, falling back to the Compliance Officer.
  const approver = React.useMemo(() => {
    const head = lineManagerOf(selfId)
    return head && head !== selfId ? head : COMPLIANCE_OFFICER !== selfId ? COMPLIANCE_OFFICER : 'meera'
  }, [selfId])

  // Only a passing control is worth offering as cover for the gap.
  const candidates = React.useMemo(
    () => WORLD.controls.filter((c) => c.result === 'Pass' && c.id !== refId).slice(0, 40),
    [refId],
  )

  const expiresOn = new Date(Date.now() + days * 86400000).toISOString()

  return (
    <>
      {existing.length > 0 && (
        <div className={cn('space-y-1', className)}>
          {existing.map((i) => (
            <ExistingRow key={i.id} issue={i} onOpen={() => navigate(`/issues/${i.id}`)} />
          ))}
        </div>
      )}

      <Button
        variant="outline"
        size="sm"
        className={existing.length ? 'mt-2' : className}
        disabled={!canRaise}
        title={canRaise ? undefined : 'Raising an exception is done by the Control Owner, Compliance Manager, Analyst or Risk Manager.'}
        onClick={() => setOpen(true)}
      >
        <FileWarning className="size-4" /> Raise exception
      </Button>

      <Drawer
        open={open}
        onClose={() => setOpen(false)}
        title="Raise an exception"
        subtitle={`${refId} — ${refTitle}`}
        footer={
          <div className="flex items-center justify-between gap-2">
            <span className="text-2xs text-muted-foreground">
              Routes to {personName(approver)} for approval · expires {fmtDate(expiresOn)}
            </span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button
                size="sm"
                disabled={reason.trim().length < 20}
                title={reason.trim().length < 20 ? 'Record why the deviation is necessary (at least a sentence).' : undefined}
                onClick={() => {
                  const id = raiseException({
                    refId,
                    refTitle,
                    reason: reason.trim(),
                    compensatingControl: compensating || undefined,
                    expiresOn,
                    severity,
                    approvedBy: approver,
                  })
                  setOpen(false)
                  setReason('')
                  pushToast({ title: 'Exception raised', description: `${id} sent to ${personName(approver)} for approval.`, variant: 'success' })
                  navigate(`/issues/${id}`)
                }}
              >
                Submit for approval
              </Button>
            </div>
          </div>
        }
      >
        <div className="space-y-3">
          <label className="block">
            <span className="text-2xs font-medium uppercase tracking-wide text-muted-foreground">Reason for the deviation</span>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
              placeholder="Why the requirement cannot be met, and what changes that…"
              className="mt-1 w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </label>

          <label className="block">
            <span className="text-2xs font-medium uppercase tracking-wide text-muted-foreground">Compensating control</span>
            <select
              value={compensating}
              onChange={(e) => setCompensating(e.target.value)}
              className="mt-1 w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">None — the gap is uncovered</option>
              {candidates.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.id} — {c.title}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-2xs font-medium uppercase tracking-wide text-muted-foreground">Requested expiry</span>
            <select
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
              className="mt-1 w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring"
            >
              {[30, 60, 90, 180, 365].map((d) => (
                <option key={d} value={d}>
                  {d} days — {fmtDate(new Date(Date.now() + d * 86400000).toISOString())}
                </option>
              ))}
            </select>
          </label>

          <p className="text-2xs text-muted-foreground">
            An exception always expires. Reminders fire 7, 3 and 1 days before expiry; if it lapses without renewal or closure it escalates
            to {personName(approver)}, then Compliance, then the CRO. Owner of record: {personName(ownerId)}.
          </p>
        </div>
      </Drawer>
    </>
  )
}

function ExistingRow({ issue, onOpen }: { issue: Issue; onOpen: () => void }) {
  const st = exceptionState(issue)
  const awaiting = issue.exception?.approvalState === 'Requested'
  return (
    <button
      onClick={onOpen}
      className="group flex w-full items-center gap-2 rounded-md border border-border bg-background px-2.5 py-1.5 text-left hover:border-info/40 hover:bg-info-soft/40"
    >
      <FileWarning className={cn('size-3.5 shrink-0', st === 'Expired' ? 'text-critical' : 'text-medium')} />
      <span className="font-mono text-2xs font-semibold text-info">{issue.id}</span>
      <span className="min-w-0 flex-1 truncate text-xs text-foreground">
        {issue.exception ? `expires ${fmtDate(issue.exception.expiresOn)}` : ''}
      </span>
      {awaiting ? <StatusChip status="Awaiting approval" tone="progress" /> : st && <StatusChip status={st} tone={TONE[st]} />}
      <ArrowUpRight className="size-3 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
    </button>
  )
}
