import * as React from 'react'
import { ArrowUpRight, ExternalLink, FileText, GitCommitVertical } from 'lucide-react'
import { StatusChip } from '@/components/StatusChip'
import { fmtDate } from '@/lib/time'
import { cn } from '@/lib/utils'
import type { SourceInstrument } from '@/types'

// The act-detail masthead: an instrument's own front-matter, read as a legal
// record. Surfaces the bibliographic fields (issued / effective / version /
// channel / reference no.) that the rest of the app keeps on the type but never
// shows, folds the supersedes ⇄ superseded-by relationship into one provenance
// chain, and offers the captured source document. Presentational only — A3:
// state-colour only, dense, light, no gradients.

const STATUS_TONE: Record<SourceInstrument['status'], 'ok' | 'warn' | 'neutral'> = {
  'In force': 'ok',
  Superseded: 'warn',
  Draft: 'neutral',
  Repealed: 'warn',
}

/** One labelled field in the metadata register. Hidden when there's no value. */
function Field({ label, value, mono = true }: { label: string; value?: React.ReactNode; mono?: boolean }) {
  if (value === undefined || value === null || value === '') return null
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
      <span className={cn('text-xs text-foreground', mono && 'font-mono')}>{value}</span>
    </div>
  )
}

export function InstrumentMasthead({
  inst,
  supersedes,
  supersededBy,
  onNavigate,
  onOpenDocument,
}: {
  inst: SourceInstrument
  supersedes?: SourceInstrument
  supersededBy?: SourceInstrument
  onNavigate: (id: string) => void
  onOpenDocument: () => void
}) {
  const doc = inst.attachedDocument
  return (
    <section className="card-surface mb-4 overflow-hidden motion-safe:animate-slide-up">
      {/* Identity row */}
      <div className="flex flex-wrap items-start justify-between gap-3 p-4 pb-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5 text-2xs">
            <span className="font-mono text-info">{inst.id}</span>
            <span className="rounded bg-muted px-1.5 py-0.5 font-semibold uppercase tracking-wide text-muted-foreground">
              {inst.instrumentType}
            </span>
            <span className="text-muted-foreground">· {inst.authority}</span>
          </div>
          <h1 className="mt-1.5 text-xl font-semibold leading-snug tracking-tight text-foreground">{inst.title}</h1>
        </div>
        <div className="shrink-0">
          <StatusChip status={inst.status} tone={STATUS_TONE[inst.status]} />
        </div>
      </div>

      {/* Metadata register — the instrument's true front-matter */}
      <div className="grid grid-cols-2 gap-x-6 gap-y-3 border-t border-border/70 px-4 py-3 sm:grid-cols-3 lg:grid-cols-4">
        <Field label="Authority" value={inst.authority} mono={false} />
        <Field label="Reference no." value={inst.referenceNumber} />
        <Field label="Issued" value={fmtDate(inst.dateOfIssue)} />
        <Field label="Effective" value={inst.effectiveDate ? fmtDate(inst.effectiveDate) : '—'} />
        <Field label="Version" value={inst.version} />
        <Field label="Source channel" value={inst.sourceChannel} mono={false} />
      </div>

      {/* Provenance chain + captured document */}
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-t border-border/70 bg-muted/30 px-4 py-2.5">
        <Lineage inst={inst} supersedes={supersedes} supersededBy={supersededBy} onNavigate={onNavigate} />
        {doc ? (
          <button
            onClick={onOpenDocument}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-border bg-background px-2.5 py-1 text-2xs text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <FileText className="size-3.5 text-info" />
            <span className="font-medium">{doc.label}</span>
            <span className="font-mono text-muted-foreground">{doc.sizeLabel}</span>
          </button>
        ) : (
          <a
            href={inst.sourceLink}
            target="_blank"
            rel="noreferrer"
            className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-border bg-background px-2.5 py-1 text-2xs text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <ExternalLink className="size-3.5 text-info" /> Open official source
          </a>
        )}
      </div>
    </section>
  )
}

/** supersedes vX  •  THIS vY (current)  •  superseded by vZ — only live arms render. */
function Lineage({
  inst,
  supersedes,
  supersededBy,
  onNavigate,
}: {
  inst: SourceInstrument
  supersedes?: SourceInstrument
  supersededBy?: SourceInstrument
  onNavigate: (id: string) => void
}) {
  const here = inst.version ?? 'this version'
  const isCurrent = inst.status === 'In force' && !supersededBy

  if (!supersedes && !supersededBy) {
    return (
      <span className="inline-flex items-center gap-1.5 text-2xs text-muted-foreground">
        <GitCommitVertical className="size-3.5" />
        <span className="font-mono text-foreground">{here}</span>
        <span>· original — no prior version on record</span>
      </span>
    )
  }

  return (
    <span className="inline-flex flex-wrap items-center gap-1.5 text-2xs text-muted-foreground">
      <GitCommitVertical className="size-3.5" />
      {supersedes && (
        <>
          <button
            onClick={() => onNavigate(supersedes.id)}
            className="inline-flex items-center gap-0.5 rounded font-mono text-foreground hover:text-info hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            title={supersedes.title}
          >
            supersedes {supersedes.version ?? supersedes.id} <ArrowUpRight className="size-3" />
          </button>
          <span className="text-border">•</span>
        </>
      )}
      <span className="font-mono font-medium text-foreground">
        {here}
        {isCurrent && <span className="ml-1 font-sans font-normal text-ok">(current)</span>}
      </span>
      {supersededBy && (
        <>
          <span className="text-border">•</span>
          <button
            onClick={() => onNavigate(supersededBy.id)}
            className="inline-flex items-center gap-0.5 rounded font-mono text-medium hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            title={supersededBy.title}
          >
            superseded by {supersededBy.version ?? supersededBy.id} <ArrowUpRight className="size-3" />
          </button>
        </>
      )}
    </span>
  )
}
