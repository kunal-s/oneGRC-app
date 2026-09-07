import * as React from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Download, FileCheck2, Send, ShieldAlert, ScrollText, ExternalLink, Paperclip, Upload, History, ArrowUpRight } from 'lucide-react'
import { useApp } from '@/store'
import { Drawer } from '../Drawer'
import { Button } from '../ui/Button'
import { MARQUEE, getSource, getInstrument } from '@/data'
import { fmtDate, fmtIST } from '@/lib/time'
import { maskPran } from '@/lib/format'
import {
  attachTaskEvidence,
  controlLibraryExportUrl,
  evidenceDocumentUrl,
  getEvidence,
  getHealth,
  previewControlLibraryExport,
  previewSourceLibraryExport,
  sourceLibraryExportUrl,
  type EvidenceDetailResponse,
} from '@/api/functions'
import { ErrorNote } from '../../pages/live/SourceLibrary'

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[170px_1fr] gap-2 border-b border-border py-1.5 last:border-0">
      <div className="text-xs font-medium text-muted-foreground">{label}</div>
      <div className="text-xs text-foreground">{value}</div>
    </div>
  )
}

export function DrawerHost() {
  const navigate = useNavigate()
  const drawer = useApp((s) => s.drawer)
  const close = useApp((s) => s.closeDrawer)
  const pushToast = useApp((s) => s.pushToast)

  const inc = MARQUEE

  // ── SCR-100, SCR-101, SCR-102 (real). Each renders its own Drawer and
  // returns early, so every other kind below is untouched (SCR-102-010,
  // SCR-102-011): a descriptor-free export-pdf, and every other kind, falls
  // through to the generic map/onPrimary toast exactly as it did before.
  if (drawer.open && drawer.kind === 'evidence-upload') {
    return <AttachEvidenceDrawer payload={drawer.payload as AttachEvidencePayload} onClose={close} />
  }
  if (drawer.open && drawer.kind === 'evidence-view') {
    return <ViewEvidenceDrawer payload={drawer.payload as ViewEvidencePayload} onClose={close} />
  }
  const exportPayload = drawer.payload as ExportDescriptor | undefined
  if (drawer.open && drawer.kind === 'export-pdf' && exportPayload?.register) {
    return <RealExportDrawer payload={exportPayload} onClose={close} />
  }

  // ── Source viewer (Epic 1; normalized Epic 15): provision + parent instrument
  const sourceId = (drawer.payload as { sourceId?: string })?.sourceId
  const src = sourceId ? getSource(sourceId) : undefined
  const inst = src ? getInstrument(src.instrumentId) : undefined
  const supersedes = inst?.supersedesId ? getInstrument(inst.supersedesId) : undefined
  const supersededBy = inst?.supersededById ? getInstrument(inst.supersededById) : undefined
  // "Open full source" deep-links into the full-page Source Library section
  // detail (Epic 15); the Epic 1 drawer is retained as the quick view.
  const openInLibrary = () => {
    if (!src) return
    close()
    navigate(`/sources/section/${src.id}`)
  }
  const sourceBody = src && inst && (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1 rounded bg-muted px-2 py-0.5 text-2xs font-semibold text-foreground">
          {inst.authority}
        </span>
        <span className="rounded bg-info-soft px-2 py-0.5 text-2xs font-medium text-info">{inst.instrumentType}</span>
        <span className="rounded bg-muted px-2 py-0.5 text-2xs font-medium text-muted-foreground">{inst.sourceChannel}</span>
        <span className="text-2xs text-muted-foreground">{inst.status}</span>
      </div>

      {supersededBy && (
        <div className="flex w-full items-center gap-2 rounded-md border border-medium/40 bg-medium-soft/40 px-3 py-2 text-xs text-foreground">
          <History className="size-3.5 shrink-0 text-medium" />
          <span className="min-w-0 flex-1">
            Superseded by a newer version ({fmtDate(supersededBy.dateOfIssue)}), {supersededBy.version ?? 'current'}
          </span>
        </div>
      )}

      <div className="rounded-lg border border-border p-3">
        <Field label="Instrument" value={inst.title} />
        <Field label="Provision" value={src.provision} />
        {inst.referenceNumber && <Field label="Reference number" value={inst.referenceNumber} />}
        <Field label="Date of issue" value={fmtDate(inst.dateOfIssue)} />
        {inst.effectiveDate && <Field label="Effective date" value={fmtDate(inst.effectiveDate)} />}
        {inst.version && (
          <Field
            label="Version"
            value={
              supersedes ? (
                <span className="inline-flex flex-wrap items-center gap-1.5">
                  <span className="font-medium text-foreground">{inst.version}</span>
                  <span className="text-muted-foreground">· supersedes</span>
                  <span className="inline-flex items-center gap-1 rounded bg-muted px-1.5 py-0.5 text-2xs font-medium text-foreground">
                    {supersedes.version ?? 'prior'} ({fmtDate(supersedes.dateOfIssue)})
                  </span>
                </span>
              ) : (
                inst.version
              )
            }
          />
        )}
      </div>

      <div>
        <div className="mb-1 text-2xs font-semibold uppercase tracking-wide text-muted-foreground">Citation</div>
        <div className="text-sm font-medium text-foreground">{src.citation}</div>
      </div>
      <div>
        <div className="mb-1 text-2xs font-semibold uppercase tracking-wide text-muted-foreground">Extract</div>
        <blockquote className="border-l-2 border-info/50 bg-muted/40 px-3 py-2 text-xs italic leading-relaxed text-foreground">
          “{src.sourceExtract}”
        </blockquote>
      </div>

      {inst.attachedDocument && (
        <div>
          <div className="mb-1.5 text-2xs font-semibold uppercase tracking-wide text-muted-foreground">
            Attached document
          </div>
          <div className="flex items-center gap-2 rounded-md border border-border bg-background px-2.5 py-2">
            <Paperclip className="size-4 shrink-0 text-muted-foreground" />
            <div className="min-w-0 flex-1">
              <div className="truncate text-xs font-medium text-foreground">{inst.attachedDocument.filename}</div>
              <div className="text-2xs text-muted-foreground">
                {inst.attachedDocument.label} · {inst.attachedDocument.sizeLabel} · attached{' '}
                {fmtDate(inst.attachedDocument.capturedAt)}
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                pushToast({
                  title: 'Upload newer version',
                  description: 'Replace the attached instrument with an updated artifact.',
                  variant: 'success',
                })
              }
            >
              <Upload className="size-3.5" /> Replace
            </Button>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-4">
        <button
          onClick={openInLibrary}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-info hover:underline"
        >
          <ScrollText className="size-3.5" /> Open full source
        </button>
        <a
          href={inst.sourceLink}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-info hover:underline"
        >
          <ExternalLink className="size-3.5" /> {inst.sourceChannel}
        </a>
      </div>
    </div>
  )

  const certInBody = (
    <div className="space-y-4">
      <div className="rounded-md border border-info/30 bg-info-soft/50 p-3 text-xs text-foreground">
        Draft auto-populated from the single incident record. Review and sign off to submit to
        CERT-In.
      </div>
      <div>
        <div className="mb-1.5 text-2xs font-semibold uppercase tracking-wide text-muted-foreground">
          CERT-In Incident Report, Annexure I (Direction 20(3)/2022)
        </div>
        <div className="rounded-lg border border-border p-3">
          <Field label="Reporting entity" value="Sankalp Pension Funds Pvt. Ltd. (PFRDA NPS PFM)" />
          <Field label="Incident reference" value={inc.id} />
          <Field label="Type of incident" value="Ransomware / malicious code (file-encryption)" />
          <Field label="Date & time of detection" value={`${fmtIST(inc.detectedAt)} (NTP-synced)`} />
          <Field label="Affected systems" value={inc.assets.join(', ')} />
          <Field label="Detection source" value={inc.source} />
          <Field label="Subscriber impact" value={inc.subscriberImpacting ? 'Yes, fund-accounting impacted' : 'No'} />
          <Field label="Personal data involved" value={inc.personalDataInvolved ? 'Yes, PRAN / KYC in scope' : 'No'} />
          <Field label="Sample affected PRAN" value={maskPran('110078451293')} />
          <Field label="Containment status" value="Contained: 2 hosts isolated, 4 accounts disabled, C2 blocked" />
          <Field label="Logs available" value="Yes, 180-day in-India retention (Splunk SIEM, EDR)" />
          <Field label="Prepared by" value="Rajesh Iyer (CISO) · pending sign-off" />
        </div>
      </div>
    </div>
  )

  const pfrdaBody = (
    <div className="space-y-4">
      <div className="rounded-md border border-info/30 bg-info-soft/50 p-3 text-xs">
        PFRDA ICS incident intimation (48-hour window) + quarterly Annexure, drafted from the same
        record.
      </div>
      <div className="rounded-lg border border-border p-3">
        <Field label="Regulated entity" value="Sankalp Pension Funds Pvt. Ltd." />
        <Field label="PFRDA registration" value="Category I, NPS Pension Fund Manager" />
        <Field label="Incident reference" value={inc.id} />
        <Field label="ICS classification" value="Critical (PFRDA ICS 2024 / circular PFRDA/2025/05/ICS/01)" />
        <Field label="Subscriber-impacting" value="Yes, NPS Scheme E/C/G fund accounting" />
        <Field label="Intimation window" value="48 hours from detection" />
        <Field label="Quarterly Annexure" value="Auto-linked to OBL-PFRDA quarterly return" />
      </div>
    </div>
  )

  const dpdpBody = (
    <div className="space-y-4">
      <div className="rounded-md border border-info/30 bg-info-soft/50 p-3 text-xs">
        DPDP personal-data-breach track (~72-hour intimation to the Data Protection Board and
        affected data principals).
      </div>
      <div className="rounded-lg border border-border p-3">
        <Field label="Data fiduciary" value="Sankalp Pension Funds Pvt. Ltd." />
        <Field label="Breach reference" value={inc.id} />
        <Field label="Personal data categories" value="PRAN, KYC, nominee, bank details" />
        <Field label="Est. principals affected" value="Under assessment, CRA segment" />
        <Field label="Intimation window" value="~72 hours (DPDP Rules 2025)" />
        <Field label="Consent / spoke" value="Consent & Privacy spoke, affected-principal list pending" />
      </div>
    </div>
  )

  const exportBody = (
    <div className="space-y-3">
      <div className="rounded-md border border-ok/30 bg-ok-soft/50 p-3 text-xs">
        Export prepared: the document below is ready to download as a PDF.
      </div>
      <div className="rounded-lg border border-border p-4 text-center">
        <FileCheck2 className="mx-auto size-8 text-ok" />
        <div className="mt-2 text-sm font-medium text-foreground">
          {(drawer.payload as { filename?: string })?.filename ?? 'GRC-One-export.pdf'}
        </div>
        <div className="mt-0.5 text-2xs text-muted-foreground">Generated {fmtIST(new Date().toISOString())}</div>
      </div>
    </div>
  )

  const map: Record<string, { title: string; subtitle: string; body: React.ReactNode; cta: string; icon: React.ReactNode }> = {
    'cert-in-report': { title: 'CERT-In Incident Report', subtitle: `${inc.id} · Annexure I draft`, body: certInBody, cta: 'Sign off & submit', icon: <ShieldAlert className="size-4" /> },
    'pfrda-notify': { title: 'Notify PFRDA', subtitle: `${inc.id} · ICS intimation`, body: pfrdaBody, cta: 'Send intimation', icon: <Send className="size-4" /> },
    'dpdp-track': { title: 'DPDP Breach Track', subtitle: `${inc.id} · Data Protection Board`, body: dpdpBody, cta: 'Open DPDP track', icon: <ShieldAlert className="size-4" /> },
    'export-pdf': { title: drawer.title ?? 'Export', subtitle: 'Document ready', body: exportBody, cta: 'Download', icon: <Download className="size-4" /> },
    'source-viewer': { title: inst?.title ?? 'Source', subtitle: src ? `${inst?.authority ?? ''} · ${src.provision}` : '', body: sourceBody ?? <div className="text-sm text-muted-foreground">Source not found.</div>, cta: 'Done', icon: <ScrollText className="size-4" /> },
    generic: { title: drawer.title ?? 'Details', subtitle: '', body: <div className="text-sm text-muted-foreground">Action recorded.</div>, cta: 'Done', icon: null },
  }

  const cfg = drawer.kind ? map[drawer.kind] ?? map.generic : map.generic
  // The source viewer is read-only: no mocked "action" CTA, just close.
  const readOnly = drawer.kind === 'source-viewer'
  const onPrimary = () => {
    pushToast({ title: cfg.cta, description: 'Action completed.', variant: 'success' })
    close()
  }

  return (
    <Drawer
      open={drawer.open}
      onClose={close}
      title={cfg.title}
      subtitle={cfg.subtitle}
      footer={
        <div className="flex items-center justify-end gap-2">
          <Button variant="outline" size="sm" onClick={close}>
            Close
          </Button>
          {!readOnly && (
            <Button size="sm" onClick={onPrimary}>
              {cfg.icon}
              {cfg.cta}
            </Button>
          )}
        </div>
      }
    >
      {cfg.body}
    </Drawer>
  )
}

// ── SCR-100, SCR-101, SCR-102 (real): shared button styling ───────────────
// Button.tsx exports no class list of its own, so a real top-level
// navigation (SCR-101-021, SCR-102-008), which a <button onClick> cannot be,
// is styled to match by hand from the same two variants Button.tsx defines.
const BTN_BASE =
  'inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0 h-7 px-2.5 text-xs'
const BTN_GHOST = `${BTN_BASE} hover:bg-muted text-foreground`
const BTN_PRIMARY = `${BTN_BASE} bg-primary text-primary-foreground hover:bg-primary/90`

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / (1024 * 1024)).toFixed(1)} MB`
}

const FRIENDLY_TYPE: Record<string, string> = {
  'application/pdf': 'PDF',
  'image/png': 'PNG',
  'image/jpeg': 'JPEG',
  'text/csv': 'CSV',
  'text/plain': 'plain text',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'DOCX',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'XLSX',
}

// ── SCR-100 Attach evidence ────────────────────────────────────────────────
export interface AttachEvidencePayload {
  taskId: string
  obligationId: string
  taskShortTitle: string
  obligationShortTitle: string
  expectedVersion: number
  assignee: { id: string; fullName: string } | null
}

const EVIDENCE_KINDS: Array<{ value: string; label: string }> = [
  { value: 'Screenshot', label: 'Screenshot' },
  { value: 'Log', label: 'Log' },
  { value: 'ConfigExport', label: 'Config export' },
  { value: 'Attestation', label: 'Attestation' },
  { value: 'FilingAck', label: 'Filing ack' },
  { value: 'Minute', label: 'Minute' },
  { value: 'Challan', label: 'Challan' },
  { value: 'Other', label: 'Other' },
]

/** FIL-003: the affordance. FIL-005, the bytes, is what the server enforces. */
const ACCEPT_EXTENSIONS = '.pdf,.png,.jpg,.jpeg,.csv,.txt,.docx,.xlsx'

function AttachEvidenceDrawer({ payload, onClose }: { payload: AttachEvidencePayload; onClose: () => void }) {
  const pushToast = useApp((s) => s.pushToast)
  const queryClient = useQueryClient()
  const fileInput = React.useRef<HTMLInputElement>(null)

  const [title, setTitle] = React.useState(
    payload.obligationShortTitle ? `${payload.obligationShortTitle}, proof` : '',
  )
  const [kind, setKind] = React.useState('Challan')
  const [onBehalfOf, setOnBehalfOf] = React.useState('')
  const [file, setFile] = React.useState<File | null>(null)
  const [dragOver, setDragOver] = React.useState(false)

  const scanner = useScannerStatus()

  const mutation = useMutation({
    mutationFn: () =>
      attachTaskEvidence(payload.taskId, {
        title,
        kind,
        capturedOnBehalfOfId: onBehalfOf || undefined,
        expectedVersion: payload.expectedVersion,
        file: file as File,
      }),
    onSuccess: ({ evidenceId }) => {
      queryClient.invalidateQueries({ queryKey: ['obligation', payload.obligationId] })
      pushToast({ title: 'Evidence submitted', description: evidenceId, variant: 'success' })
      onClose()
    },
    // SLICE-01D CON-015, SCR-100-060: a refusal must not clear the form.
  })

  const pick = (f: File | null | undefined) => {
    if (f) setFile(f)
  }

  return (
    <Drawer
      open
      onClose={onClose}
      title="Attach evidence"
      subtitle={`${payload.taskId} · ${payload.taskShortTitle}`}
      footer={
        <div className="flex items-center justify-end gap-2">
          <Button variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
          <Button
            size="sm"
            disabled={!title.trim() || !file || mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            <Paperclip className="size-4" />
            {mutation.isPending ? 'Uploading' : 'Submit evidence'}
          </Button>
        </div>
      }
    >
      <div className="space-y-3">
        {mutation.isError && <ErrorNote error={mutation.error} />}

        <label className="block">
          <span className="mb-1 block text-2xs font-medium uppercase tracking-wide text-muted-foreground">Title</span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. PT challan, payment acknowledgement"
            className="w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-2xs font-medium uppercase tracking-wide text-muted-foreground">Kind</span>
          <select
            value={kind}
            onChange={(e) => setKind(e.target.value)}
            className="w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring"
          >
            {EVIDENCE_KINDS.map((k) => (
              <option key={k.value} value={k.value}>{k.label}</option>
            ))}
          </select>
        </label>

        {payload.assignee && (
          <label className="block">
            <span className="mb-1 block text-2xs font-medium uppercase tracking-wide text-muted-foreground">On behalf of</span>
            <select
              value={onBehalfOf}
              onChange={(e) => setOnBehalfOf(e.target.value)}
              className="w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">(myself)</option>
              <option value={payload.assignee.id}>{payload.assignee.fullName}</option>
            </select>
          </label>
        )}

        <div
          className="mt-3 rounded-lg border border-dashed border-border p-6 text-center"
          onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault()
            setDragOver(false)
            pick(e.dataTransfer.files[0])
          }}
        >
          <Upload className={`mx-auto size-7 ${dragOver ? 'text-info' : 'text-muted-foreground'}`} />
          <div className="mt-2 text-sm text-foreground">{file ? file.name : 'Drop the artifact or choose a file'}</div>
          {file && (
            <div className="mt-1 text-2xs text-muted-foreground">
              {formatBytes(file.size)} · {file.type || 'unknown type'}
            </div>
          )}
          <button
            type="button"
            onClick={() => fileInput.current?.click()}
            className="mt-2 text-2xs font-medium text-info hover:underline"
          >
            Choose file
          </button>
          <input
            ref={fileInput}
            type="file"
            accept={ACCEPT_EXTENSIONS}
            className="hidden"
            onChange={(e) => pick(e.target.files?.[0])}
          />
        </div>
        <div className="mt-2 text-2xs text-muted-foreground">
          {scanner ? scanner.description : 'Structural checks only. No malware scanner is configured.'}
        </div>

        <p className="mt-2 text-2xs text-muted-foreground">
          On submit, the evidence is created, linked to {payload.taskId} and {payload.obligationId}, and routed to
          a checker (you cannot verify your own submission).
        </p>
      </div>
    </Drawer>
  )
}

/** SCR-100-035: which scanner is live, read once, not part of the form's own state. */
function useScannerStatus(): { name: string; description: string } | null {
  const { data } = useQuery({ queryKey: ['health'], queryFn: getHealth, staleTime: 60_000 })
  return data?.fileScanner ?? null
}

// ── SCR-101 View evidence ──────────────────────────────────────────────────
export interface ViewEvidencePayload {
  evidenceId: string
}

function ViewEvidenceDrawer({ payload, onClose }: { payload: ViewEvidencePayload; onClose: () => void }) {
  const navigate = useNavigate()
  const { data, isLoading, error } = useQuery({
    queryKey: ['evidence', payload.evidenceId],
    queryFn: () => getEvidence(payload.evidenceId),
  })

  const go = (route: string) => { onClose(); navigate(route) }

  return (
    <Drawer
      open
      onClose={onClose}
      title={data?.title ?? payload.evidenceId}
      subtitle={data ? `${data.id} · ${data.kind} · ${data.state}` : payload.evidenceId}
      footer={
        <div className="flex items-center justify-end gap-2">
          <Button variant="outline" size="sm" onClick={onClose}>Close</Button>
        </div>
      }
    >
      {isLoading && (
        <div className="flex items-center gap-3 rounded-lg border border-border bg-background p-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
            <Paperclip className="size-5" />
          </div>
          <div className="text-sm text-muted-foreground">Loading…</div>
        </div>
      )}
      {error && <ErrorNote error={error} />}
      {data && <ViewEvidenceBody data={data} onNavigate={go} />}
    </Drawer>
  )
}

function ViewEvidenceBody({ data, onNavigate }: { data: EvidenceDetailResponse; onNavigate: (route: string) => void }) {
  const captureLine = data.capturedBySystem
    ? null
    : data.capturedOnBehalfOf
      ? `Captured by ${data.capturedBy} on behalf of ${data.capturedOnBehalfOf}`
      : `Captured by ${data.capturedBy}`

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 rounded-lg border border-border bg-background p-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
          <Paperclip className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium text-foreground">{data.title}</div>
          <div className="text-2xs text-muted-foreground">
            {data.kind}
            {data.document && <> · {FRIENDLY_TYPE[data.document.mimeType] ?? data.document.mimeType} · {formatBytes(data.document.byteSize)}</>}
            {!data.document && <> · No artifact stored</>}
            {' · '}{fmtIST(data.capturedAt)}
          </div>
        </div>
        {data.document && (
          <a href={evidenceDocumentUrl(data.id)} className={`${BTN_GHOST} ml-auto`}>
            <Download className="size-4" /> Download
          </a>
        )}
      </div>

      <div>
        {captureLine && <div className="text-xs text-foreground">{captureLine}</div>}
        {data.capturedBySystem && !data.capturedBy && (
          <div className="inline-flex items-center gap-1.5 text-xs text-foreground">
            {data.capturedBySystem}
            <span className="rounded bg-ok-soft px-1.5 py-0.5 text-2xs font-medium text-ok">CCM (auto)</span>
          </div>
        )}
      </div>

      <div>
        <div className="mb-1.5 text-2xs font-semibold uppercase tracking-wide text-muted-foreground">What this proves</div>
        <div className="space-y-1">
          {data.links.map((l) => (
            <button
              key={`${l.kind}-${l.id}`}
              onClick={() => {
                if (l.kind === 'control') return onNavigate(`/controls/${l.id}`)
                const obligationId = l.kind === 'obligation' ? l.id : data.links.find((x) => x.kind === 'obligation')?.id
                if (obligationId) onNavigate(`/obligations/${obligationId}`)
              }}
              className="group flex w-full items-center gap-2 rounded-md border border-border bg-background px-2 py-1.5 text-left hover:border-info/40 hover:bg-info-soft/40"
            >
              <span className="rounded bg-muted px-1 py-0 text-[10px] text-muted-foreground">
                {l.kind === 'task' ? 'Task' : l.kind === 'obligation' ? 'Obligation' : 'Control'}
              </span>
              <span className="font-mono text-2xs font-semibold text-info">{l.id}</span>
              <span className="min-w-0 flex-1 truncate text-2xs text-muted-foreground">{l.label}</span>
              <ArrowUpRight className="ml-auto size-3 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </button>
          ))}
          {data.links.length === 0 && <p className="text-2xs text-muted-foreground">Not yet linked to a task or a control.</p>}
        </div>
      </div>
    </div>
  )
}

// ── SCR-102 Export preview (real) ──────────────────────────────────────────
export interface ExportDescriptor {
  register: 'control-library' | 'source-library'
  department?: string
}

const EXPORT_TITLE: Record<ExportDescriptor['register'], string> = {
  'control-library': 'Control Library',
  'source-library': 'Source Library',
}

function RealExportDrawer({ payload, onClose }: { payload: ExportDescriptor; onClose: () => void }) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['export-preview', payload.register, payload.department],
    queryFn: () =>
      payload.register === 'source-library'
        ? previewSourceLibraryExport()
        : previewControlLibraryExport(payload.department),
  })

  const url = payload.register === 'source-library'
    ? sourceLibraryExportUrl()
    : controlLibraryExportUrl(payload.department)

  return (
    <Drawer
      open
      onClose={onClose}
      title={EXPORT_TITLE[payload.register]}
      subtitle="Ready to produce"
      footer={
        <div className="flex items-center justify-end gap-2">
          <Button variant="outline" size="sm" onClick={onClose}>Close</Button>
          <a
            href={data ? url : undefined}
            aria-disabled={!data}
            onClick={(e) => { if (!data) e.preventDefault(); else onClose() }}
            className={`${BTN_PRIMARY} ${!data ? 'pointer-events-none opacity-50' : ''}`}
          >
            <Download className="size-4" /> Download
          </a>
        </div>
      }
    >
      <div className="space-y-3">
        {error && <ErrorNote error={error} />}
        {!error && (
          <div className="rounded-md border border-ok/30 bg-ok-soft/50 p-3 text-xs text-foreground">
            {isLoading
              ? 'Preparing the export.'
              : data
                // The source library's own Scope line is a full sentence
                // (EXP-011) and already ends in a period; strip it here so
                // this sentence does not read as two run together.
                ? `${data.rows} rows from ${data.register}, under ${data.scope.replace(/\.$/, '')}, as ${data.format}.`
                : null}
          </div>
        )}
        {data && (
          <>
            <div className="rounded-lg border border-border p-3">
              <Field label="Register" value={data.register} />
              <Field label="Filters" value={data.filters} />
              <Field label="Scope" value={data.scope} />
              <Field label="Rows" value={data.rows} />
              <Field label="Format" value={data.format} />
            </div>
            <div className="rounded-lg border border-border p-4 text-center">
              <FileCheck2 className="mx-auto size-8 text-ok" />
              <div className="mt-2 text-sm font-medium text-foreground">{data.filename}</div>
              <div className="mt-0.5 text-2xs text-muted-foreground">
                Will be produced as at {fmtIST(new Date().toISOString())}
              </div>
            </div>
          </>
        )}
      </div>
    </Drawer>
  )
}
