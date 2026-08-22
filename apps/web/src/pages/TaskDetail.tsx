import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, ListChecks, FileCheck, Paperclip, BellRing, AlertTriangle, CheckCircle2, Clock, ClipboardCheck } from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import { StatusChip } from '@/components/StatusChip'
import { Avatar } from '@/components/Avatar'
import { ProofChain } from '@/components/ProofChain'
import { resolveProofChain } from '@/lib/proofChain'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'
import { PEOPLE_BY_ID, personName, departmentOfPerson, departmentHeadOf } from '@/data/people'
import { useApp } from '@/store'
import { useEffectiveObligations } from '@/lib/effective'
import { useScope } from '@/lib/access'
import { tasksForObligation, controlIdsForTask, type Task } from '@/lib/tasks'
import { ladderFor } from '@/lib/reminders'
import { fmtIST, fmtDate } from '@/lib/time'
import type { Obligation } from '@/types'
import { ComingSoon } from './ComingSoon'

export function TaskDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const scope = useScope()
  const selfId = useApp((s) => s.personId)
  const taskWorkflow = useApp((s) => s.taskWorkflow)
  const getAnyEvidence = useApp((s) => s.getAnyEvidence)
  const setEvidenceDraft = useApp((s) => s.setEvidenceDraft)
  const verifyTask = useApp((s) => s.verifyTask)
  const pushToast = useApp((s) => s.pushToast)
  const obligations = useEffectiveObligations()

  // Resolve the task by its TSK id across the (effective) obligations.
  let task: Task | undefined
  let obligation: Obligation | undefined
  for (const o of obligations) {
    const t = tasksForObligation(o, taskWorkflow).find((x) => x.id === id)
    if (t) {
      task = t
      obligation = o
      break
    }
  }

  if (!task || !obligation) return <ComingSoon title="Task not found" />

  const maker = PEOPLE_BY_ID[task.maker]
  const checker = PEOPLE_BY_ID[task.checker]
  const controlId = controlIdsForTask(task)[0]
  const evidence = task.evidenceId ? getAnyEvidence(task.evidenceId) : undefined
  const chain = resolveProofChain({ kind: 'task', task, obligation }, { taskWorkflow })
  const verified = task.status === 'Done'
  // The department head may step into the maker step on the owner's behalf (1.5).
  const head = departmentHeadOf(departmentOfPerson(task.maker))
  const isDeptHead = !!head && selfId === head && selfId !== task.maker
  // Maker may attach when assigned; the department head (or Compliance/admin) may
  // step in for the owner. Checker may verify only after evidence exists, and never
  // the person who attached it (separation of duties).
  const canAttach = !evidence && (selfId === task.maker || isDeptHead || scope.seesAll)
  const actingOnBehalf = canAttach && selfId !== task.maker
  const attachLabel = selfId === task.maker ? 'Attach evidence' : `Attach on behalf of ${maker.name}`
  const attacher = task.attachedBy ?? task.maker
  const canVerify = !!evidence && !verified && selfId !== attacher && (selfId === task.checker || scope.seesAll)
  const ladder = verified ? [] : ladderFor(task.id, task.dueDate, task.maker, task.checker)

  const openEvidence = () => task.evidenceId && navigate(`/evidence/${task.evidenceId}`)

  const onAttach = () => {
    // Go to the dedicated evidence screen with the expected guidance, then submit.
    setEvidenceDraft({ taskId: task!.id, obligationId: obligation!.id, controlId, onBehalfOf: actingOnBehalf ? task!.maker : undefined })
    navigate('/evidence/new')
  }
  const onVerify = () => {
    verifyTask({ taskId: task!.id, obligationId: obligation!.id })
    pushToast({ title: 'Task verified', description: `${task!.id} checked and accepted.`, variant: 'success' })
  }

  return (
    <div>
      <button onClick={() => navigate(`/obligations/${obligation.id}`)} className="mb-3 inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-3.5" /> {obligation.id}
      </button>

      <PageHeader
        eyebrow={
          <span className="inline-flex items-center gap-1.5">
            <span className="font-mono text-info">{task.id}</span>
            <span className="rounded bg-muted px-1.5 py-0.5 text-2xs font-medium text-muted-foreground">Task</span>
            <span className="text-muted-foreground">· satisfies {obligation.id}</span>
          </span>
        }
        title={task.title}
        description={`Maker ${maker.name} (${maker.title}) performs this; ${checker.name} verifies it. Due ${fmtDate(task.dueDate)}.`}
        actions={
          <div className="flex items-center gap-2">
            <StatusChip status={task.status} />
            {!evidence ? (
              <Button size="sm" disabled={!canAttach} title={canAttach ? undefined : `Only the maker (${maker.name}) or the department head can attach evidence.`} onClick={onAttach}>
                <Paperclip className="size-4" /> {attachLabel}
              </Button>
            ) : !verified ? (
              <Button size="sm" disabled={!canVerify} title={canVerify ? undefined : `Verification is the checker's step (${checker.name}) and cannot be done by whoever attached the evidence.`} onClick={onVerify}>
                <ClipboardCheck className="size-4" /> Verify
              </Button>
            ) : null}
          </div>
        }
      />

      <ProofChain nodes={chain} className="mb-4" />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Maker -> checker */}
        <div className="card-surface p-4">
          <h3 className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-foreground">
            <ListChecks className="size-4 text-info" /> Maker &rarr; checker
          </h3>
          <Step
            done={!!evidence || task.status === 'Done'}
            role="Maker performs &amp; attaches evidence"
            personId={task.attachedBy ?? task.maker}
            at={task.attachedAt}
            subNote={task.attachedOnBehalfOf ? `on behalf of ${personName(task.attachedOnBehalfOf)} (department head step-in)` : undefined}
            evidenceId={evidence ? task.evidenceId : undefined}
            onEvidenceClick={evidence ? openEvidence : undefined}
            note={evidence ? 'Attached' : task.status === 'Done' ? 'Completed' : 'Awaiting action'}
          />
          <div className="ml-3.5 h-4 border-l border-dashed border-border" />
          <Step
            done={verified}
            role="Checker verifies the evidence"
            personId={task.verifiedBy ?? task.checker}
            at={task.verifiedAt}
            evidenceId={verified && evidence ? task.evidenceId : undefined}
            onEvidenceClick={verified && evidence ? openEvidence : undefined}
            note={verified ? 'Verified' : evidence ? 'Pending verification' : 'Pending'}
          />
        </div>

        {/* Evidence */}
        <div id="task-evidence" className="card-surface p-4">
          <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-foreground">
            <FileCheck className="size-4 text-ok" /> Evidence
          </h3>
          {evidence ? (
            <div className="rounded-md border border-ok/30 bg-ok-soft/40 p-2.5">
              <div className="flex items-center gap-2">
                <Paperclip className="size-3.5 text-ok" />
                <span className="font-mono text-2xs font-semibold text-info">{evidence.id}</span>
                <StatusChip status={evidence.type} />
              </div>
              <div className="mt-1 text-sm text-foreground">{evidence.title}</div>
              <div className="mt-1 text-2xs text-muted-foreground">
                Captured by {personName(evidence.capturedBy)} · {fmtIST(evidence.capturedAt)} · {evidence.source}
              </div>
            </div>
          ) : (
            <div className="rounded-md border border-dashed border-border p-3 text-center">
              <p className="text-xs text-muted-foreground">No evidence attached yet.</p>
              <Button className="mt-2" size="sm" variant="outline" disabled={!canAttach} title={canAttach ? undefined : `Only the maker (${maker.name}) or the department head can attach evidence.`} onClick={onAttach}>
                <Paperclip className="size-4" /> {selfId === task.maker ? 'Attach / create evidence' : attachLabel}
              </Button>
              {isDeptHead && <p className="mt-1.5 text-2xs text-muted-foreground">You are the {departmentOfPerson(task.maker)} head — you may step in for {maker.name}.</p>}
            </div>
          )}
        </div>

        {/* Reminders & escalations */}
        <div data-tour="reminders-ladder" className="card-surface p-4">
          <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-foreground">
            <BellRing className="size-4 text-info" /> Reminders &amp; escalations
          </h3>
          {ladder.length === 0 ? (
            <p className="text-xs text-muted-foreground">Task complete — no further reminders.</p>
          ) : (
            <ol className="space-y-1.5">
              {ladder.map((e) => {
                const esc = e.kind === 'escalation'
                return (
                  <li key={`${e.kind}-${e.offsetDays}`} className="flex items-center gap-2">
                    <span className={cn('flex size-5 shrink-0 items-center justify-center rounded-full border', !e.fired ? 'border-dashed border-border text-muted-foreground' : esc ? 'border-critical/40 bg-critical-soft text-critical' : 'border-info/40 bg-info-soft text-info')}>
                      {esc ? <AlertTriangle className="size-3" /> : <BellRing className="size-3" />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className={cn('text-2xs font-medium', esc ? 'text-critical' : 'text-foreground')}>
                        {esc ? 'Escalation' : 'Reminder'} · {e.intervalLabel} <span className="text-muted-foreground">&rarr; {e.targetRole}</span>
                      </div>
                      <div className="text-2xs text-muted-foreground tnum">{fmtIST(e.at)}</div>
                    </div>
                    <span className={cn('shrink-0 rounded px-1.5 py-0.5 text-2xs font-semibold', e.fired ? 'bg-ok-soft text-ok' : 'bg-muted text-muted-foreground')}>{e.fired ? 'Fired' : 'Scheduled'}</span>
                  </li>
                )
              })}
            </ol>
          )}
        </div>
      </div>
    </div>
  )
}

function Step({
  done,
  role,
  personId,
  note,
  at,
  subNote,
  evidenceId,
  onEvidenceClick,
}: {
  done?: boolean
  role: string
  personId: string
  note: string
  at?: string
  subNote?: string
  evidenceId?: string
  onEvidenceClick?: () => void
}) {
  return (
    <div className="flex items-start gap-2.5">
      <span className={cn('mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full', done ? 'bg-ok-soft text-ok' : 'bg-muted text-muted-foreground')}>
        {done ? <CheckCircle2 className="size-4" /> : <Clock className="size-4" />}
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-2xs font-medium uppercase tracking-wide text-muted-foreground">{role}</div>
        <div className="mt-0.5 inline-flex items-center gap-1.5 text-sm text-foreground">
          <Avatar id={personId} size={18} /> {personName(personId)}
        </div>
        {subNote && <div className="mt-0.5 text-2xs font-medium text-accent-foreground">{subNote}</div>}
        {at && <div className="mt-0.5 text-2xs text-muted-foreground tnum">{fmtIST(at)}</div>}
        {evidenceId && (
          <button onClick={onEvidenceClick} className="mt-1 inline-flex items-center gap-1 rounded border border-ok/30 bg-ok-soft/50 px-1.5 py-0.5 text-2xs text-ok hover:underline">
            <Paperclip className="size-3" /> {evidenceId}
          </button>
        )}
      </div>
      <span className={cn('shrink-0 rounded px-1.5 py-0.5 text-2xs font-medium', done ? 'bg-ok-soft text-ok' : 'bg-muted text-muted-foreground')}>{note}</span>
    </div>
  )
}
