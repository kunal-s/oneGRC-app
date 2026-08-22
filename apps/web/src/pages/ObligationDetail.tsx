import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, CalendarClock, Send, CheckCircle2, GitPullRequestArrow, ArrowUpRight, FileCheck, ScrollText, BellRing, AlertTriangle, ListChecks, Paperclip, Clock } from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import { StatusChip } from '@/components/StatusChip'
import { Avatar } from '@/components/Avatar'
import { Button } from '@/components/ui/Button'
import { SourceList } from '@/components/SourceRef'
import { ProofChain } from '@/components/ProofChain'
import { resolveProofChain } from '@/lib/proofChain'
import { RegulatorChip } from '@/lib/regulators'
import { cn } from '@/lib/utils'
import { getRegChange, getEvidence } from '@/data'
import { PEOPLE_BY_ID, personName } from '@/data/people'
import { tasksForObligation, taskFollowUp, type Task } from '@/lib/tasks'
import { recentCycles, type Timing } from '@/lib/cycles'
import { fmtIST, fmtDate, fmtRelative, NOW_MS } from '@/lib/time'
import { useApp } from '@/store'
import { useEffectiveObligation } from '@/lib/effective'
import { useCanAct } from '@/lib/gating'
import { RaiseExceptionButton } from './issues/RaiseExceptionButton'
import { ComingSoon } from './ComingSoon'

export function ObligationDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const submitObligation = useApp((s) => s.submitObligation)
  const approveObligation = useApp((s) => s.approveObligation)
  const o = useEffectiveObligation(id ?? '')
  const canSubmit = useCanAct({ kind: 'obligation.submit' })
  const canApprove = useCanAct({ kind: 'obligation.approve', makerId: o?.makerChecker.maker })

  if (!o) return <ComingSoon title="Obligation not found" />

  const internal = o.origin === 'Internal'
  const owner = PEOPLE_BY_ID[o.owner]
  const taskWorkflow = useApp((s) => s.taskWorkflow)
  const tasks = tasksForObligation(o, taskWorkflow)
  const chain = resolveProofChain({ kind: 'obligation', obligation: o }, { taskWorkflow })
  // The "done but not documented" gap, computed from the tasks (Req 2).
  const gap = tasks.some((t) => t.status === 'Done' && !t.evidenceId)
  const regChange = o.linkedRegChange ? getRegChange(o.linkedRegChange) : undefined
  const overdue = o.status === 'Overdue'
  const daysToDue = Math.round((new Date(o.dueDate).getTime() - NOW_MS) / 86400000)

  return (
    <div>
      <button onClick={() => navigate('/obligations')} className="mb-3 inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-3.5" /> Obligations
      </button>

      <PageHeader
        eyebrow={
          <span className="inline-flex items-center gap-1.5">
            <span className="font-mono text-info">{o.id}</span>
            {internal ? (
              <span className="rounded bg-accent/15 px-1.5 py-0.5 text-2xs font-medium text-accent-foreground">Internal policy</span>
            ) : (
              <RegulatorChip regulator={o.regulator} />
            )}
            <span className="text-muted-foreground">· {o.frequency} · ref {o.reference}</span>
          </span>
        }
        title={o.title}
        description={
          internal
            ? `Policy-driven duty (${o.policySource ?? 'internal policy'}); owned by ${owner.name} (${owner.title}) — satisfied by the tasks below, each under maker-checker control.`
            : `Filed with ${o.regulator}; owned by ${owner.name} (${owner.title}) — satisfied by the tasks below, each under maker-checker control.`
        }
        actions={
          <div className="flex items-center gap-2">
            <StatusChip status={o.status} />
            {o.status === 'In review' ? (
              <Button size="sm" disabled={!canApprove} title={canApprove ? undefined : 'Approval is restricted to the checker (a Compliance Manager or the Executive who is not the maker).'} onClick={() => approveObligation(o.id)}>
                <CheckCircle2 className="size-4" /> Approve filing
              </Button>
            ) : o.status !== 'Filed' ? (
              <Button size="sm" disabled={!canSubmit} title={canSubmit ? undefined : 'Submitting is restricted to the Compliance Manager / Analyst (maker).'} onClick={() => submitObligation(o.id)}>
                <Send className="size-4" /> Submit for check
              </Button>
            ) : null}
            <RaiseExceptionButton
              refId={o.id}
              refTitle={o.title}
              ownerId={o.owner}
              severity={o.status === 'Overdue' ? 'High' : 'Medium'}
            />
          </div>
        }
      />

      <ProofChain nodes={chain} className="mb-4" />

      {gap && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-medium/40 bg-medium-soft/40 px-3.5 py-2.5 text-sm text-foreground">
          <FileCheck className="size-4 shrink-0 text-medium" />
          <span><span className="font-medium">Lacking evidence.</span> A completed task has no evidence attached. Attach the proof on that task to close it.</span>
        </div>
      )}

      <div className={cn('mb-4 flex flex-wrap items-center gap-2 rounded-lg border px-3.5 py-2.5', overdue ? 'border-critical/30 bg-critical-soft/40' : 'border-border bg-muted/30')}>
        <CalendarClock className={cn('size-4', overdue ? 'text-critical' : 'text-muted-foreground')} />
        <span className="text-sm font-medium text-foreground">Due {fmtIST(o.dueDate)}</span>
        <span className={cn('text-xs', overdue ? 'font-medium text-critical' : 'text-muted-foreground')}>
          {overdue ? `overdue by ${Math.abs(daysToDue)} days` : `${daysToDue} days remaining`}
        </span>
        <span className="ml-auto inline-flex items-center gap-1.5 text-xs text-muted-foreground">
          <Avatar id={o.owner} size={18} /> {owner.name} · {owner.title}
        </span>
      </div>

      {/* The recurring cycle and the maker/checker split that discharges it. */}
      <div data-tour="obligation-cycles-and-tasks">
        <TasksTable tasks={tasks} navigate={navigate} />

        <CycleHistory o={o} />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        {o.sourceRefs && o.sourceRefs.length > 0 && (
          <div className="card-surface p-3.5">
            <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-foreground">
              <ScrollText className="size-4 text-info" /> Source
            </h3>
            <SourceList ids={o.sourceRefs} />
            <p className="mt-2 text-2xs text-muted-foreground">
            </p>
          </div>
        )}

        {regChange && (
          <div className="card-surface p-3.5">
            <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-foreground">
              <GitPullRequestArrow className="size-4 text-info" /> Source regulatory change
            </h3>
            <button
              onClick={() => navigate(`/reg-change/${regChange.id}`)}
              className="group block w-full rounded-md border border-border bg-background p-2.5 text-left hover:border-info/40 hover:bg-info-soft/40"
            >
              <div className="flex items-center gap-2">
                <span className="font-mono text-2xs font-semibold text-info">{regChange.id}</span>
                <StatusChip status={regChange.status} />
                <ArrowUpRight className="ml-auto size-3.5 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </div>
              <div className="mt-1 text-xs text-foreground">{regChange.summary}</div>
              <div className="mt-0.5 text-2xs text-muted-foreground">{regChange.source} · {fmtRelative(regChange.publishedAt)}</div>
            </button>
            <p className="mt-2 text-2xs text-muted-foreground">This obligation was created/updated automatically when the change was ingested.</p>
          </div>
        )}
      </div>
    </div>
  )
}

// Per-cycle history (E2.3) — for each cycle, what was due and whether it was met
// on time or late. Makes "on time versus late" legible at a glance.
const TIMING_TONE: Record<Timing, string> = {
  'on-time': 'bg-ok-soft text-ok',
  late: 'bg-medium-soft text-medium',
  pending: 'bg-muted text-muted-foreground',
}
function CycleHistory({ o }: { o: import('@/types').Obligation }) {
  const cycles = recentCycles(o, 4)
  const onTime = cycles.filter((c) => c.timing === 'on-time').length
  const judged = cycles.filter((c) => c.timing !== 'pending').length
  return (
    <div className="card-surface mb-4 overflow-hidden">
      <div className="flex items-center justify-between border-b border-border px-3.5 py-2.5">
        <h3 className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
          <CalendarClock className="size-4 text-info" /> Cycle history · on time vs late
        </h3>
        <span className="text-2xs font-medium text-muted-foreground tnum">{judged ? `${onTime}/${judged} on time` : 'first cycle'}</span>
      </div>
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-border text-left text-2xs uppercase tracking-wide text-muted-foreground">
            <th className="px-3 py-2 font-medium">Cycle</th>
            <th className="px-3 py-2 font-medium">Due</th>
            <th className="px-3 py-2 font-medium">Filed</th>
            <th className="px-3 py-2 font-medium">Outcome</th>
          </tr>
        </thead>
        <tbody>
          {cycles.map((c, i) => (
            <tr key={i} className="border-b border-border/70 last:border-0">
              <td className="px-3 py-2 text-foreground">{c.period}</td>
              <td className="px-3 py-2 tnum text-muted-foreground">{fmtDate(c.dueDate)}</td>
              <td className="px-3 py-2 tnum text-muted-foreground">{c.filedAt ? fmtDate(c.filedAt) : '—'}</td>
              <td className="px-3 py-2"><span className={cn('rounded px-1.5 py-0.5 text-2xs font-medium', TIMING_TONE[c.timing])}>{c.timing === 'on-time' ? 'On time' : c.timing === 'late' ? 'Late' : 'Pending'}</span></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// The tasks that satisfy this obligation, tabulated. Maker-checker, evidence and
// reminders/escalations are tracked per task (TSK id), not on the obligation.
function TasksTable({ tasks, navigate }: { tasks: Task[]; navigate: (to: string) => void }) {
  const done = tasks.filter((t) => t.status === 'Done').length
  return (
    <div className="card-surface overflow-hidden">
      <div className="flex items-center justify-between border-b border-border px-3.5 py-2.5">
        <h3 className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
          <ListChecks className="size-4 text-info" /> Tasks to satisfy this obligation
        </h3>
        <span className="text-2xs font-medium text-muted-foreground tnum">{done} of {tasks.length} complete</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[860px] text-xs">
          <thead>
            <tr className="border-b border-border text-left text-2xs uppercase tracking-wide text-muted-foreground">
              <th className="px-3 py-2 font-medium">TSK ID</th>
              <th className="px-3 py-2 font-medium">Task</th>
              <th className="px-3 py-2 font-medium">Satisfies</th>
              <th className="px-3 py-2 font-medium">Maker</th>
              <th className="px-3 py-2 font-medium">Checker</th>
              <th className="px-3 py-2 font-medium">Due</th>
              <th className="px-3 py-2 font-medium">Status</th>
              <th className="px-3 py-2 font-medium">Evidence</th>
              <th className="px-3 py-2 font-medium">Follow-up</th>
            </tr>
          </thead>
          <tbody>
            {tasks.map((t) => {
              const ev = t.evidenceId ? getEvidence(t.evidenceId) : undefined
              const overdue = t.status === 'Overdue'
              const f = taskFollowUp(t)
              return (
                <tr
                  key={t.id}
                  onClick={() => navigate(`/tasks/${t.id}`)}
                  className="cursor-pointer border-b border-border/70 align-top last:border-0 hover:bg-info-soft/20"
                >
                  <td className="px-3 py-2.5"><span className="font-mono text-2xs font-semibold text-info hover:underline">{t.id}</span></td>
                  <td className="px-3 py-2.5 max-w-[260px]"><span className="text-foreground">{t.title}</span></td>
                  <td className="px-3 py-2.5">
                    {t.clauseRefs.length ? (
                      <span className="inline-flex flex-wrap gap-1">
                        {t.clauseRefs.map((c) => (
                          <button key={c} onClick={(e) => { e.stopPropagation(); navigate(`/sources/section/${c}`) }} className="rounded bg-info-soft px-1.5 py-0 font-mono text-2xs font-semibold text-info hover:underline">{c}</button>
                        ))}
                      </span>
                    ) : (
                      <span className="text-2xs text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5"><span className="inline-flex items-center gap-1.5"><Avatar id={t.maker} size={18} /><span className="text-foreground">{personName(t.maker)}</span></span></td>
                  <td className="px-3 py-2.5">
                    <span className="inline-flex items-center gap-1.5">
                      <Avatar id={t.checker} size={18} />
                      <span className="text-foreground">{personName(t.checker)}</span>
                      {t.status === 'Done' ? <CheckCircle2 className="size-3.5 text-ok" /> : <Clock className="size-3.5 text-muted-foreground" />}
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    <span className={cn('tnum', overdue ? 'font-medium text-critical' : 'text-foreground')}>{fmtDate(t.dueDate)}</span>
                    <span className="ml-1 text-2xs text-muted-foreground">· {fmtRelative(t.dueDate)}</span>
                  </td>
                  <td className="px-3 py-2.5"><StatusChip status={t.status} /></td>
                  <td className="px-3 py-2.5 max-w-[200px]">
                    {ev ? (
                      <span className="inline-flex items-center gap-1 rounded border border-ok/30 bg-ok-soft/50 px-1.5 py-0.5 text-2xs text-ok" title={ev.title}>
                        <Paperclip className="size-3 shrink-0" /> <span className="truncate">{ev.id}</span>
                      </span>
                    ) : (
                      <span className="text-2xs text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 max-w-[180px]">
                    {f ? (
                      <span className={cn('inline-flex items-center gap-1 text-2xs', f.kind === 'escalation' ? 'text-critical' : 'text-medium')}>
                        {f.kind === 'escalation' ? <AlertTriangle className="size-3 shrink-0" /> : <BellRing className="size-3 shrink-0" />}
                        {f.kind === 'escalation' ? `Escalated · ${f.intervalLabel} → ${f.targetRole}` : `Reminder · ${f.intervalLabel}`}
                      </span>
                    ) : t.status === 'Done' ? (
                      <span className="text-2xs text-muted-foreground">—</span>
                    ) : (
                      <span className="text-2xs text-muted-foreground">No reminder due yet</span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
