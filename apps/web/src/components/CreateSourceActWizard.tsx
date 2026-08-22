import * as React from 'react'
import { useNavigate } from 'react-router-dom'
import { Link2, Upload, Sparkles, Check, X, Pencil, Building2, ArrowRight, FileCheck2, ScrollText } from 'lucide-react'
import { Drawer } from './Drawer'
import { Button } from './ui/Button'
import { StatusChip } from './StatusChip'
import { cn } from '@/lib/utils'
import { useApp } from '@/store'
import { DEPARTMENTS } from '@/lib/access'
import { extractAct, SAMPLE_ACT, type ExtractedAct } from '@/lib/sources/ingest'
import type { Department } from '@/types'

type Step = 'entry' | 'extracting' | 'review' | 'route' | 'done'

export function CreateSourceActWizard({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate()
  const recordAction = useApp((s) => s.recordAction)
  const createSourceAct = useApp((s) => s.createSourceAct)

  const [step, setStep] = React.useState<Step>('entry')
  const [entry, setEntry] = React.useState<'url' | 'upload'>('url')
  const [name, setName] = React.useState('')
  const [url, setUrl] = React.useState('')
  const [filename, setFilename] = React.useState('')
  const [extracted, setExtracted] = React.useState<ExtractedAct | null>(null)
  const [accepted, setAccepted] = React.useState<boolean[]>([])
  const [editing, setEditing] = React.useState<number | null>(null)
  const [depts, setDepts] = React.useState<Department[]>([])
  const [createdId, setCreatedId] = React.useState('')

  const reset = () => {
    setStep('entry'); setEntry('url'); setName(''); setUrl(''); setFilename('')
    setExtracted(null); setAccepted([]); setEditing(null); setDepts([]); setCreatedId('')
  }
  const close = () => { onClose(); setTimeout(reset, 200) }

  // Staged (deterministic) reveal of the scripted extraction.
  React.useEffect(() => {
    if (step !== 'extracting') return
    const t = setTimeout(() => {
      const ex = extractAct(name, url)
      recordAction({ action: 'AI ingestion extracted source act', detail: `${ex.title} · ${ex.clauses.length} clause(s) proposed for review` })
      setExtracted(ex)
      setAccepted(ex.clauses.map(() => true))
      setStep('review')
    }, 700)
    return () => clearTimeout(t)
  }, [step, name, url, recordAction])

  const runExtraction = () => {
    const actName = entry === 'upload' ? (name || filename.replace(/\.[a-z]+$/i, '')) : name
    setName(actName)
    recordAction({ action: 'Submitted document for AI source-act extraction', detail: entry === 'upload' ? `Upload: ${filename || 'document'}` : `${actName} · ${url || 'no URL'}` })
    setStep('extracting')
  }

  const editClause = (i: number, patch: Partial<ExtractedAct['clauses'][number]>) => {
    setExtracted((ex) => (ex ? { ...ex, clauses: ex.clauses.map((c, k) => (k === i ? { ...c, ...patch } : c)) } : ex))
  }

  const create = () => {
    if (!extracted) return
    const acceptedIdx = accepted.map((a, i) => (a ? i : -1)).filter((i) => i >= 0)
    const id = createSourceAct({ extracted, acceptedIdx, departments: depts, entry })
    setCreatedId(id)
    setStep('done')
  }

  const acceptedCount = accepted.filter(Boolean).length
  const canRunEntry = entry === 'url' ? name.trim().length > 0 : filename.length > 0

  return (
    <Drawer
      open={open}
      onClose={close}
      title="Create source act"
      subtitle="AI-assisted ingestion · Compliance / Company Secretary"
      footer={<Footer step={step} canRun={canRunEntry} acceptedCount={acceptedCount} onClose={close} onRun={runExtraction} onToRoute={() => setStep('route')} onCreate={create} onOpen={() => { close(); navigate(`/sources/${createdId}`) }} />}
    >
      {step === 'entry' && (
        <div className="space-y-4">
          <div className="flex items-center rounded-md border border-border p-0.5 text-xs">
            <Tab active={entry === 'url'} onClick={() => setEntry('url')} icon={<Link2 className="size-3.5" />} label="Name + URL" />
            <Tab active={entry === 'upload'} onClick={() => setEntry('upload')} icon={<Upload className="size-3.5" />} label="Upload document" />
          </div>
          {entry === 'url' ? (
            <div className="space-y-3">
              <Labeled label="Act / instrument name">
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Payment of Gratuity Act, 1972" className="w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring" />
              </Labeled>
              <Labeled label="Authoritative source URL">
                <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://www.indiacode.nic.in/…" className="w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring" />
              </Labeled>
              <button onClick={() => { setName(SAMPLE_ACT.name); setUrl(SAMPLE_ACT.url) }} className="text-2xs font-medium text-info hover:underline">Use a sample act</button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="rounded-lg border border-dashed border-border p-6 text-center">
                <Upload className="mx-auto size-7 text-muted-foreground" />
                <div className="mt-2 text-sm text-foreground">{filename || 'Drop a document or choose from disk'}</div>
                <button onClick={() => setFilename('Payment-of-Gratuity-Act-1972.pdf')} className="mt-2 text-2xs font-medium text-info hover:underline">Choose sample document</button>
              </div>
              <Labeled label="Act / instrument name (optional — inferred from the document)">
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Inferred from the upload" className="w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring" />
              </Labeled>
            </div>
          )}
          <p className="text-2xs text-muted-foreground">A clause-level breakdown is proposed for you to review and accept clause by clause — nothing is tracked until you accept it.</p>
        </div>
      )}

      {step === 'extracting' && (
        <div className="flex flex-col items-center gap-3 py-10 text-center">
          <Sparkles className="size-8 animate-pulse text-info" />
          <div className="text-sm font-medium text-foreground">Reading the instrument and extracting clauses…</div>
          <div className="text-2xs text-muted-foreground">Identifying provisions, requirements, penalty tiers and due dates.</div>
        </div>
      )}

      {step === 'review' && extracted && (
        <div className="space-y-3">
          <div className="rounded-md border border-info/30 bg-info-soft/40 p-2.5 text-xs">
            <span className="font-medium text-foreground">{extracted.title}</span> — {extracted.clauses.length} clause(s) proposed. Accept, edit or reject each. Figures are flagged unverified until you confirm them.
          </div>
          {extracted.clauses.map((c, i) => (
            <div key={i} className={cn('rounded-lg border p-3', accepted[i] ? 'border-border bg-background' : 'border-dashed border-border bg-muted/30 opacity-70')}>
              <div className="flex items-start gap-2">
                <span className="font-mono text-2xs font-semibold text-info">{c.provision}</span>
                <span className="min-w-0 flex-1 text-sm font-medium text-foreground">{c.nameOfCompliance}</span>
                {!c.verified && <span className="rounded bg-medium-soft px-1.5 py-0.5 text-2xs font-medium text-medium">unverified</span>}
                <button onClick={() => setEditing(editing === i ? null : i)} title="Edit" className="text-muted-foreground hover:text-foreground"><Pencil className="size-3.5" /></button>
              </div>
              {editing === i ? (
                <div className="mt-2 space-y-2">
                  <input value={c.nameOfCompliance} onChange={(e) => editClause(i, { nameOfCompliance: e.target.value })} className="w-full rounded border border-border bg-background px-2 py-1 text-xs outline-none focus:ring-2 focus:ring-ring" />
                  <textarea value={c.whatItMeans} onChange={(e) => editClause(i, { whatItMeans: e.target.value })} rows={3} className="w-full rounded border border-border bg-background px-2 py-1 text-xs outline-none focus:ring-2 focus:ring-ring" />
                </div>
              ) : (
                <p className="mt-1 text-xs text-muted-foreground">{c.whatItMeans}</p>
              )}
              <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-2xs text-muted-foreground">
                <span className="inline-flex items-center gap-1">Severity <StatusChip status={c.severity} /></span>
                <span>· {c.frequency}</span>
                <span>· {c.citation}</span>
              </div>
              <div className="mt-2 flex items-center gap-2">
                <button onClick={() => setAccepted((a) => a.map((v, k) => (k === i ? true : v)))} className={cn('inline-flex items-center gap-1 rounded border px-2 py-0.5 text-2xs font-medium', accepted[i] ? 'border-ok/40 bg-ok-soft text-ok' : 'border-border text-muted-foreground hover:bg-muted')}><Check className="size-3" /> Accept</button>
                <button onClick={() => setAccepted((a) => a.map((v, k) => (k === i ? false : v)))} className={cn('inline-flex items-center gap-1 rounded border px-2 py-0.5 text-2xs font-medium', !accepted[i] ? 'border-critical/40 bg-critical-soft text-critical' : 'border-border text-muted-foreground hover:bg-muted')}><X className="size-3" /> Reject</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {step === 'route' && extracted && (
        <div className="space-y-3">
          <div className="rounded-md border border-border bg-muted/30 p-2.5 text-xs text-foreground">
            <span className="font-medium">{acceptedCount} of {extracted.clauses.length}</span> clause(s) will be tracked. Route the act to the departments that own its duties — until routed it is visible to Compliance only.
          </div>
          <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
            {DEPARTMENTS.map((d) => {
              const on = depts.includes(d)
              return (
                <button key={d} onClick={() => setDepts((s) => (on ? s.filter((x) => x !== d) : [...s, d]))} className={cn('flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-left text-xs', on ? 'border-info/40 bg-info-soft/40 text-foreground' : 'border-border text-muted-foreground hover:bg-muted')}>
                  <Building2 className="size-3.5 shrink-0" />
                  <span className="min-w-0 flex-1 truncate">{d}</span>
                  {on && <Check className="size-3.5 text-info" />}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {step === 'done' && (
        <div className="flex flex-col items-center gap-3 py-8 text-center">
          <FileCheck2 className="size-9 text-ok" />
          <div className="text-sm font-medium text-foreground">Source act created</div>
          <div className="font-mono text-xs text-info">{createdId}</div>
          <div className="max-w-sm text-2xs text-muted-foreground">{acceptedCount} clause(s) accepted and tracked{depts.length ? `, routed to ${depts.join(', ')}` : ', visible to Compliance until routed'}. Every step is in the audit log.</div>
        </div>
      )}
    </Drawer>
  )
}

function Footer({ step, canRun, acceptedCount, onClose, onRun, onToRoute, onCreate, onOpen }: {
  step: Step; canRun: boolean; acceptedCount: number
  onClose: () => void; onRun: () => void; onToRoute: () => void; onCreate: () => void; onOpen: () => void
}) {
  return (
    <div className="flex items-center justify-end gap-2">
      <Button variant="outline" size="sm" onClick={onClose}>Close</Button>
      {step === 'entry' && <Button size="sm" disabled={!canRun} onClick={onRun}><Sparkles className="size-4" /> Run AI extraction</Button>}
      {step === 'review' && <Button size="sm" disabled={acceptedCount === 0} onClick={onToRoute}>Continue · {acceptedCount} accepted <ArrowRight className="size-4" /></Button>}
      {step === 'route' && <Button size="sm" disabled={acceptedCount === 0} onClick={onCreate}><ScrollText className="size-4" /> Create tracked act</Button>}
      {step === 'done' && <Button size="sm" onClick={onOpen}>Open the act <ArrowRight className="size-4" /></Button>}
    </div>
  )
}

function Tab({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button onClick={onClick} className={cn('inline-flex flex-1 items-center justify-center gap-1.5 rounded px-2.5 py-1 font-medium transition-colors', active ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground')}>
      {icon} {label}
    </button>
  )
}

function Labeled({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-2xs font-medium uppercase tracking-wide text-muted-foreground">{label}</span>
      {children}
    </label>
  )
}
