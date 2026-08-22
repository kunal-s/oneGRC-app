import { useNavigate } from 'react-router-dom'
import { Download, FileCheck2, Send, ShieldAlert, ScrollText, ExternalLink, Paperclip, Upload, History } from 'lucide-react'
import { useApp } from '@/store'
import { Drawer } from '../Drawer'
import { Button } from '../ui/Button'
import { MARQUEE, getSource, getInstrument } from '@/data'
import { fmtDate, fmtIST } from '@/lib/time'
import { maskPran } from '@/lib/format'

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

  // ── Source viewer (Epic 1; normalized Epic 15) — provision + parent instrument
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
            Superseded by a newer version ({fmtDate(supersededBy.dateOfIssue)}) — {supersededBy.version ?? 'current'}
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
          CERT-In Incident Report — Annexure I (Direction 20(3)/2022)
        </div>
        <div className="rounded-lg border border-border p-3">
          <Field label="Reporting entity" value="Sankalp Pension Funds Pvt. Ltd. (PFRDA NPS PFM)" />
          <Field label="Incident reference" value={inc.id} />
          <Field label="Type of incident" value="Ransomware / malicious code (file-encryption)" />
          <Field label="Date & time of detection" value={`${fmtIST(inc.detectedAt)} (NTP-synced)`} />
          <Field label="Affected systems" value={inc.assets.join(', ')} />
          <Field label="Detection source" value={inc.source} />
          <Field label="Subscriber impact" value={inc.subscriberImpacting ? 'Yes — fund-accounting impacted' : 'No'} />
          <Field label="Personal data involved" value={inc.personalDataInvolved ? 'Yes — PRAN / KYC in scope' : 'No'} />
          <Field label="Sample affected PRAN" value={maskPran('110078451293')} />
          <Field label="Containment status" value="Contained — 2 hosts isolated, 4 accounts disabled, C2 blocked" />
          <Field label="Logs available" value="Yes — 180-day in-India retention (Splunk SIEM, EDR)" />
          <Field label="Prepared by" value="Rajesh Iyer (CISO) · pending sign-off" />
        </div>
      </div>
    </div>
  )

  const pfrdaBody = (
    <div className="space-y-4">
      <div className="rounded-md border border-info/30 bg-info-soft/50 p-3 text-xs">
        PFRDA ICS incident intimation (48-hour window) + quarterly Annexure — drafted from the same
        record.
      </div>
      <div className="rounded-lg border border-border p-3">
        <Field label="Regulated entity" value="Sankalp Pension Funds Pvt. Ltd." />
        <Field label="PFRDA registration" value="Category I — NPS Pension Fund Manager" />
        <Field label="Incident reference" value={inc.id} />
        <Field label="ICS classification" value="Critical (PFRDA ICS 2024 / circular PFRDA/2025/05/ICS/01)" />
        <Field label="Subscriber-impacting" value="Yes — NPS Scheme E/C/G fund accounting" />
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
        <Field label="Est. principals affected" value="Under assessment — CRA segment" />
        <Field label="Intimation window" value="~72 hours (DPDP Rules 2025)" />
        <Field label="Consent / spoke" value="Consent & Privacy spoke — affected-principal list pending" />
      </div>
    </div>
  )

  const exportBody = (
    <div className="space-y-3">
      <div className="rounded-md border border-ok/30 bg-ok-soft/50 p-3 text-xs">
        Export prepared — the document below is ready to download as a PDF.
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
  // The source viewer is read-only — no mocked "action" CTA, just close.
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
