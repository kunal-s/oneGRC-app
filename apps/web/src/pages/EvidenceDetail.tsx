import * as React from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Paperclip, CheckCircle2, Clock, ShieldCheck, FileText, Upload, ArrowUpRight, ListChecks, Download } from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import { StatusChip } from '@/components/StatusChip'
import { Avatar } from '@/components/Avatar'
import { Button } from '@/components/ui/Button'
import { ProofChain } from '@/components/ProofChain'
import { resolveProofChain } from '@/lib/proofChain'
import { cn } from '@/lib/utils'
import { getControl, getObligation } from '@/data'
import { personName } from '@/data/people'
import { expectedEvidence } from '@/lib/evidenceGuidance'
import { fmtIST } from '@/lib/time'
import { useApp } from '@/store'
import type { Evidence } from '@/types'
import { ComingSoon } from './ComingSoon'

export function EvidenceDetail() {
  const { id } = useParams()
  if (id === 'new') return <AttachEvidence />
  return <ExistingEvidence id={id ?? ''} />
}

// ── What good proof looks like — shown on the record and at attach time ───────
function Guidance({ controlId, type }: { controlId?: string; type?: Evidence['type'] }) {
  const pushToast = useApp((s) => s.pushToast)
  const g = expectedEvidence({ controlId, type })
  return (
    <div className="card-surface p-4">
      <h3 className="mb-1 flex items-center gap-1.5 text-sm font-semibold text-foreground">
        <ShieldCheck className="size-4 text-info" /> Expected evidence
      </h3>
      <p className="text-xs text-foreground">{g.criteria}</p>
      <div className="mt-2 text-2xs font-medium uppercase tracking-wide text-muted-foreground">Examples of acceptable proof</div>
      <ul className="mt-1 space-y-0.5">
        {g.examples.map((e, i) => (
          <li key={i} className="flex items-start gap-1.5 text-xs text-muted-foreground"><span className="mt-1.5 size-1 shrink-0 rounded-full bg-muted-foreground" /> {e}</li>
        ))}
      </ul>
      <div className="mt-3 text-2xs font-medium uppercase tracking-wide text-muted-foreground">Sample templates</div>
      <div className="mt-1 flex flex-wrap gap-1.5">
        {g.samples.map((s) => (
          <button key={s.filename} onClick={() => pushToast({ title: 'Sample downloaded', description: s.filename, variant: 'success' })} className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-2 py-1 text-2xs text-foreground hover:border-info/40 hover:bg-info-soft/40">
            <Download className="size-3" /> {s.label}
          </button>
        ))}
      </div>
    </div>
  )
}

// ── Attach (create + submit) a new piece of evidence, with expected guidance ──
function AttachEvidence() {
  const navigate = useNavigate()
  const draft = useApp((s) => s.evidenceDraft)
  const attachTaskEvidence = useApp((s) => s.attachTaskEvidence)
  const addManualEvidence = useApp((s) => s.addManualEvidence)
  const pushToast = useApp((s) => s.pushToast)
  const selfId = useApp((s) => s.personId)

  const controlId = draft?.controlId
  const control = controlId ? getControl(controlId) : undefined
  const obligation = draft?.obligationId ? getObligation(draft.obligationId) : undefined
  const [filename, setFilename] = React.useState('')
  const [title, setTitle] = React.useState(obligation ? `${obligation.title} — proof` : control ? `${control.title} — proof` : '')

  const submit = () => {
    let evId: string
    if (draft?.taskId) {
      evId = attachTaskEvidence({ taskId: draft.taskId, obligationId: draft.obligationId ?? '', controlId, title: title || filename || 'Evidence', type: 'Filing ack', onBehalfOf: draft.onBehalfOf })
    } else {
      evId = addManualEvidence({ title: title || filename || 'Manual evidence', obligationId: draft?.obligationId, controlId })
    }
    pushToast({ title: 'Evidence submitted', description: `${evId} submitted by ${personName(selfId)}; awaiting checker verification.`, variant: 'success' })
    navigate(`/evidence/${evId}`)
  }

  return (
    <div>
      <button onClick={() => navigate(-1)} className="mb-3 inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-3.5" /> Back
      </button>
      <PageHeader eyebrow="Evidence" title="Attach evidence" description={`Submit the proof${obligation ? ` for ${obligation.id}` : control ? ` for ${control.id}` : ''}. Review the expected evidence, attach the artifact, then submit for verification.`} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <div className="card-surface p-4">
          <h3 className="mb-3 text-sm font-semibold text-foreground">The artifact</h3>
          <label className="block">
            <span className="mb-1 block text-2xs font-medium uppercase tracking-wide text-muted-foreground">Title</span>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. PT challan — payment acknowledgement" className="w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring" />
          </label>
          <div className="mt-3 rounded-lg border border-dashed border-border p-6 text-center">
            <Upload className="mx-auto size-7 text-muted-foreground" />
            <div className="mt-2 text-sm text-foreground">{filename || 'Drop the artifact or choose a file'}</div>
            <button onClick={() => setFilename('evidence-upload.pdf')} className="mt-2 text-2xs font-medium text-info hover:underline">Choose file</button>
          </div>
          <div className="mt-3 flex justify-end">
            <Button size="sm" onClick={submit}>
              <Paperclip className="size-4" /> Submit evidence
            </Button>
          </div>
          <p className="mt-2 text-2xs text-muted-foreground">On submit, the evidence is created, linked{control ? ` to ${control.id}` : ''}{obligation ? ` and ${obligation.id}` : ''}, and routed to a checker (you cannot verify your own submission).</p>
        </div>
        <Guidance controlId={controlId} type="Filing ack" />
      </div>
    </div>
  )
}

// ── An existing evidence record: artifact, what it proves, lifecycle ──────────
function ExistingEvidence({ id }: { id: string }) {
  const navigate = useNavigate()
  const getAnyEvidence = useApp((s) => s.getAnyEvidence)
  const wf = useApp((s) => s.evidenceWorkflow[id])
  const getEvidenceStatus = useApp((s) => s.getEvidenceStatus)
  const verifyEvidence = useApp((s) => s.verifyEvidence)
  const taskWorkflow = useApp((s) => s.taskWorkflow)
  const pushToast = useApp((s) => s.pushToast)
  const selfId = useApp((s) => s.personId)

  const ev = getAnyEvidence(id)
  if (!ev) return <ComingSoon title="Evidence not found" />

  const status = getEvidenceStatus(id)
  const verified = status === 'Verified'
  const submittedBy = wf?.submittedBy ?? (ev.auto ? undefined : ev.capturedBy)
  const canVerify = !verified && !!wf && selfId !== wf.submittedBy
  const controlId = ev.linkedControls[0]
  const taskId = Object.keys(taskWorkflow).find((k) => taskWorkflow[k].evidenceId === id)
  const chain = resolveProofChain(
    { kind: 'evidence', evidence: ev, control: controlId ? getControl(controlId) : undefined, obligation: ev.linkedObligations[0] ? getObligation(ev.linkedObligations[0]) : undefined },
    { taskWorkflow },
  )

  const onVerify = () => {
    verifyEvidence(id)
    pushToast({ title: 'Evidence verified', description: `${id} accepted by ${personName(selfId)}.`, variant: 'success' })
  }

  return (
    <div>
      <button onClick={() => navigate('/evidence')} className="mb-3 inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-3.5" /> Evidence Vault
      </button>

      <PageHeader
        eyebrow={
          <span className="inline-flex items-center gap-1.5">
            <span className="font-mono text-info">{ev.id}</span>
            <span className="rounded bg-muted px-1.5 py-0.5 text-2xs font-medium text-muted-foreground">{ev.type}</span>
            {ev.auto && <span className="rounded bg-ok-soft px-1.5 py-0.5 text-2xs font-medium text-ok">CCM (auto)</span>}
          </span>
        }
        title={ev.title}
        description={`Captured by ${ev.auto ? 'CCM (auto)' : personName(ev.capturedBy)} · ${fmtIST(ev.capturedAt)} · ${ev.source}`}
        actions={
          <div className="flex items-center gap-2">
            <StatusChip status={status} />
            {!verified && (
              <Button size="sm" disabled={!canVerify} title={canVerify ? undefined : 'Verification is the checker’s step and cannot be done by whoever submitted the evidence.'} onClick={onVerify}>
                <CheckCircle2 className="size-4" /> Verify
              </Button>
            )}
          </div>
        }
      />

      <ProofChain nodes={chain} className="mb-4" />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <div className="space-y-4">
          {/* the artifact */}
          <div className="card-surface p-4">
            <h3 className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-foreground"><FileText className="size-4 text-info" /> The artifact</h3>
            <div className="flex items-center gap-3 rounded-lg border border-border bg-background p-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground"><Paperclip className="size-5" /></div>
              <div className="min-w-0">
                <div className="text-sm font-medium text-foreground">{ev.title}</div>
                <div className="text-2xs text-muted-foreground">{ev.type} · {ev.source} · {fmtIST(ev.capturedAt)}</div>
              </div>
              <Button variant="ghost" size="sm" className="ml-auto" onClick={() => pushToast({ title: 'Download started', description: `${ev.id}.pdf`, variant: 'success' })}><Download className="size-4" /> Download</Button>
            </div>
          </div>

          {/* maker -> checker lifecycle */}
          <div className="card-surface p-4">
            <h3 className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-foreground"><ListChecks className="size-4 text-info" /> Submit &rarr; verify</h3>
            <Step done role="Submitted by maker" personId={submittedBy ?? ev.capturedBy} at={wf?.submittedAt ?? ev.capturedAt} note="Submitted" />
            <div className="ml-3.5 h-4 border-l border-dashed border-border" />
            <Step done={verified} role="Verified by checker" personId={wf?.verifiedBy ?? ''} at={wf?.verifiedAt} note={verified ? 'Verified' : 'Awaiting verification'} />
          </div>
        </div>

        <div className="space-y-4">
          {/* what this proves */}
          <div className="card-surface p-4">
            <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-foreground"><ArrowUpRight className="size-4 text-info" /> What this proves</h3>
            <div className="space-y-1">
              {taskId && <LinkRow label="Task" id={taskId} onClick={() => navigate(`/tasks/${taskId}`)} />}
              {ev.linkedObligations.map((oid) => <LinkRow key={oid} label="Obligation" id={oid} sub={getObligation(oid)?.title} onClick={() => navigate(`/obligations/${oid}`)} />)}
              {ev.linkedControls.map((cid) => <LinkRow key={cid} label="Control" id={cid} sub={getControl(cid)?.title} onClick={() => navigate(`/controls/${cid}`)} />)}
              {ev.linkedObligations.length === 0 && ev.linkedControls.length === 0 && !taskId && (
                <p className="text-2xs text-muted-foreground">Not yet linked to a control or obligation.</p>
              )}
            </div>
          </div>

          <Guidance controlId={controlId} type={ev.type} />
        </div>
      </div>
    </div>
  )
}

function LinkRow({ label, id, sub, onClick }: { label: string; id: string; sub?: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="group flex w-full items-center gap-2 rounded-md border border-border bg-background px-2 py-1.5 text-left hover:border-info/40 hover:bg-info-soft/40">
      <span className="rounded bg-muted px-1 py-0 text-[10px] text-muted-foreground">{label}</span>
      <span className="font-mono text-2xs font-semibold text-info">{id}</span>
      {sub && <span className="min-w-0 flex-1 truncate text-2xs text-muted-foreground">{sub}</span>}
      <ArrowUpRight className="ml-auto size-3 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
    </button>
  )
}

function Step({ done, role, personId, at, note }: { done?: boolean; role: string; personId: string; at?: string; note: string }) {
  return (
    <div className="flex items-start gap-2.5">
      <span className={cn('mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full', done ? 'bg-ok-soft text-ok' : 'bg-muted text-muted-foreground')}>
        {done ? <CheckCircle2 className="size-4" /> : <Clock className="size-4" />}
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-2xs font-medium uppercase tracking-wide text-muted-foreground">{role}</div>
        <div className="mt-0.5 inline-flex items-center gap-1.5 text-sm text-foreground">
          {personId ? <><Avatar id={personId} size={18} /> {personName(personId)}</> : <span className="text-muted-foreground">—</span>}
        </div>
        {at && <div className="mt-0.5 text-2xs text-muted-foreground tnum">{fmtIST(at)}</div>}
      </div>
      <span className={cn('shrink-0 rounded px-1.5 py-0.5 text-2xs font-medium', done ? 'bg-ok-soft text-ok' : 'bg-muted text-muted-foreground')}>{note}</span>
    </div>
  )
}
