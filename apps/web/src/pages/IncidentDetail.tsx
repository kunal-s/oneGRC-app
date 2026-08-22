import { useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft, ShieldAlert, FileText, Send, DatabaseZap, Users, Database, Server,
  Network, Zap, Download, Clock, Boxes, IndianRupee,
} from 'lucide-react'
import { SeverityBadge } from '@/components/SeverityBadge'
import { StatusChip } from '@/components/StatusChip'
import { RegulatorClock } from '@/components/RegulatorClock'
import { Timeline } from '@/components/Timeline'
import { CrossRefPanel } from '@/components/CrossRefPanel'
import { EvidenceList } from '@/components/EvidenceList'
import { Avatar } from '@/components/Avatar'
import { Button } from '@/components/ui/Button'
import { CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { personName } from '@/data/people'
import { fmtIST, fmtRelative, fmtDate, fmtTime } from '@/lib/time'
import { useApp } from '@/store'
import { useEffectiveIncident } from '@/lib/effective'
import { useCanAct } from '@/lib/gating'
import { inr, netLoss } from '@/lib/lossEvents'
import { FinancialImpact } from './incidents/FinancialImpact'
import { ComingSoon } from './ComingSoon'
import type { RegulatorTrack } from '@/types'

const TRACK_ACCENT: Record<string, string> = {
  'CERT-In': 'border-critical/30',
  PFRDA: 'border-info/30',
  'DPDP Board': 'border-medium/40',
}

const TRACK_NOTE: Record<string, string> = {
  'CERT-In':
    'Pre-populated Annexure-I draft ready. CERT-In Direction 20(3)/2022 — 6-hour reporting window; logs retained 180 days in-India with NTP sync.',
  PFRDA:
    '48-hour ICS incident intimation (subscriber-impacting). Also rolls into the quarterly ICS Annexure and the annual cyber-security audit submission.',
  'DPDP Board':
    'Flagged because personal data (PRAN / KYC / nominee / bank) is involved — ~72-hour breach intimation to the Data Protection Board and affected principals.',
}

export function IncidentDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const openDrawer = useApp((s) => s.openDrawer)
  const fileIncidentTrack = useApp((s) => s.fileIncidentTrack)
  const inc = useEffectiveIncident(id ?? '')
  const canFile = useCanAct({ kind: 'incident.fileTrack', makerId: inc?.owner })

  if (!inc) return <ComingSoon title="Incident not found" />

  const hasCertIn = inc.regulatorTracks.some((t) => t.regulator === 'CERT-In')
  const hasPfrda = inc.regulatorTracks.some((t) => t.regulator === 'PFRDA')
  const hasDpdp = inc.regulatorTracks.some((t) => t.regulator === 'DPDP Board')

  const trackAction = (t: RegulatorTrack) => {
    if (t.regulator === 'CERT-In') openDrawer({ kind: 'cert-in-report' })
    else if (t.regulator === 'PFRDA') openDrawer({ kind: 'pfrda-notify' })
    else if (t.regulator === 'DPDP Board') openDrawer({ kind: 'dpdp-track' })
  }
  const trackCta = (t: RegulatorTrack) =>
    t.regulator === 'CERT-In' ? 'Generate CERT-In report' : t.regulator === 'PFRDA' ? 'Notify PFRDA' : 'Open DPDP track'

  return (
    <div>
      <button
        onClick={() => navigate('/incidents')}
        className="mb-3 inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" /> Incidents
      </button>

      {/* Critical header banner */}
      <div className="mb-4 overflow-hidden rounded-xl border border-critical/30 bg-gradient-to-br from-critical-soft to-background">
        <div className="flex flex-wrap items-start justify-between gap-4 p-4">
          <div className="min-w-0">
            <div className="mb-1.5 flex items-center gap-2">
              <SeverityBadge severity={inc.classification} />
              <span className="font-mono text-xs font-semibold text-foreground">{inc.id}</span>
              <StatusChip status={inc.status} />
              {inc.classification === 'Critical' && (
                <span className="inline-flex items-center gap-1 rounded bg-critical px-1.5 py-0.5 text-2xs font-semibold text-white">
                  <Zap className="size-3" /> AUTO-CLASSIFIED · PFRDA ICS 2024
                </span>
              )}
            </div>
            <h1 className="text-xl font-semibold tracking-tight text-foreground">{inc.title}</h1>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5" title={fmtRelative(inc.detectedAt)}>
                <Clock className="size-3.5" /> Detected {fmtIST(inc.detectedAt)}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Network className="size-3.5" /> Source: {inc.source}
                {inc.source === 'Splunk SIEM' && ' (ticketed in Sankalp ServiceDesk)'}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Avatar id={inc.owner} size={16} /> Owner: {personName(inc.owner)}
              </span>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              {inc.subscriberImpacting && (
                <span className="inline-flex items-center gap-1 rounded bg-high-soft px-2 py-0.5 text-2xs font-medium text-high">
                  <Users className="size-3" /> Subscriber-impacting
                </span>
              )}
              {inc.personalDataInvolved && (
                <span className="inline-flex items-center gap-1 rounded bg-medium-soft px-2 py-0.5 text-2xs font-medium text-medium">
                  <Database className="size-3" /> Personal data involved
                </span>
              )}
              {inc.lossEvent?.isLossEvent && (
                <span className="inline-flex items-center gap-1 rounded bg-critical-soft px-2 py-0.5 text-2xs font-medium text-critical">
                  <IndianRupee className="size-3" /> Loss event · net {inr(netLoss(inc.lossEvent))}
                </span>
              )}
            </div>
          </div>

          {(hasCertIn || hasPfrda || hasDpdp) && (
            <div className="flex shrink-0 flex-col gap-2">
              {hasCertIn && (
                <Button size="sm" variant="critical" onClick={() => openDrawer({ kind: 'cert-in-report' })}>
                  <FileText className="size-4" /> Generate CERT-In report
                </Button>
              )}
              {hasPfrda && (
                <Button size="sm" variant="outline" onClick={() => openDrawer({ kind: 'pfrda-notify' })}>
                  <Send className="size-4" /> Notify PFRDA
                </Button>
              )}
              {hasDpdp && (
                <Button size="sm" variant="outline" onClick={() => openDrawer({ kind: 'dpdp-track' })}>
                  <DatabaseZap className="size-4" /> Open DPDP track
                </Button>
              )}
            </div>
          )}
        </div>
        <div className="border-t border-critical/20 bg-background/60 px-4 py-2 text-xs leading-relaxed text-foreground">
          {inc.summary}
        </div>
      </div>

      {/* Regulator tracks — one incident, three regulator outputs, one clock */}
      {inc.regulatorTracks.length > 0 ? (
        <div className="mb-4">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
              <ShieldAlert className="size-4 text-critical" />
              {inc.regulatorTracks.length} regulator {inc.regulatorTracks.length === 1 ? 'track' : 'tracks'}
            </h2>
            <span className="text-2xs text-muted-foreground">Live regulator countdowns</span>
          </div>
          <div className={cn('grid gap-3', inc.regulatorTracks.length >= 3 ? 'lg:grid-cols-3' : 'lg:grid-cols-2')}>
            {inc.regulatorTracks.map((t, idx) => (
              <div key={t.regulator} className={cn('card-surface flex flex-col overflow-hidden border', TRACK_ACCENT[t.regulator])}>
                <RegulatorClock track={t} className="border-0 bg-transparent" />
                <div className="border-t border-border px-3.5 py-2 text-2xs leading-snug text-muted-foreground">
                  {TRACK_NOTE[t.regulator]}
                </div>
                <div className="flex items-center justify-between gap-2 border-t border-border bg-muted/40 px-3.5 py-2">
                  <div className="text-2xs text-muted-foreground">
                    <div>Started {fmtTime(t.clockStartedAt)} IST</div>
                    <div>Due {fmtIST(t.deadline)}</div>
                  </div>
                  {t.status === 'Filed' ? (
                    <span className="inline-flex items-center gap-1 rounded-md bg-ok-soft px-2 py-1 text-2xs font-medium text-ok">
                      <CheckCircle2 className="size-3.5" /> Filed
                    </span>
                  ) : (
                    <div className="flex items-center gap-1.5">
                      <Button size="sm" variant="outline" onClick={() => trackAction(t)}>
                        {trackCta(t)}
                      </Button>
                      <Button size="sm" disabled={!canFile} title={canFile ? undefined : 'Filing is signed off by the Control Owner or Executive (not the maker).'} onClick={() => fileIncidentTrack(inc.id, idx)}>
                        File now
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="mb-4 card-surface px-4 py-3 text-sm text-muted-foreground">
          No regulator clocks on this incident — assessed below the CERT-In / PFRDA / DPDP reporting thresholds.
          Retained in the log for trend analysis and lessons learned.
        </div>
      )}

      {/* Timeline + cross-references */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <div className="space-y-4">
          <div className="card-surface p-4">
            <h2 className="mb-3 text-sm font-semibold text-foreground">
              Unified timeline
            </h2>
            <Timeline events={inc.timeline} />
          </div>

          {inc.classification === 'Critical' && (
            <div className="card-surface p-4">
              <h2 className="mb-2 text-sm font-semibold text-foreground">Auto-classification rationale</h2>
              <p className="mb-2 text-xs text-muted-foreground">
                OneGRC scored this incident against the PFRDA ICS 2024 / circular PFRDA/2025/05/ICS/01 taxonomy:
              </p>
              <ul className="space-y-1.5 text-xs text-foreground">
                <Rationale>Availability impact on a core fund-accounting system (ransomware / file-encryption).</Rationale>
                <Rationale>Subscriber-impacting — NPS Scheme E/C/G fund accounting affected.</Rationale>
                <Rationale>Personal data in scope — PRAN, KYC, nominee and bank details on the affected CIs.</Rationale>
                <Rationale>Result: CRITICAL → CERT-In (6h), PFRDA (48h) and DPDP (~72h) tracks opened automatically.</Rationale>
              </ul>
            </div>
          )}
        </div>

        <div className="space-y-4">
          {/* affected assets from CMDB */}
          <div className="card-surface p-3.5">
            <div className="mb-2 flex items-center gap-1.5">
              <Boxes className="size-4 text-info" />
              <h3 className="text-sm font-semibold text-foreground">Affected assets</h3>
              <span className="ml-auto inline-flex items-center gap-1 rounded bg-muted px-1.5 py-0.5 text-2xs font-medium text-muted-foreground">
                via Sankalp ServiceDesk CMDB
              </span>
            </div>
            <div className="space-y-1">
              {inc.assets.map((a) => (
                <div key={a} className="flex items-center gap-2 rounded-md border border-border bg-background px-2 py-1.5 text-xs">
                  <Server className="size-3.5 text-muted-foreground" />
                  <span className="text-foreground">{a}</span>
                </div>
              ))}
            </div>
          </div>

          <CrossRefPanel
            groups={[
              { label: 'Control failure that spawned this', ids: inc.linkedControls },
              { label: 'Risk this realised', ids: inc.linkedRisks },
              { label: 'Issues & remediation', ids: inc.linkedIssues },
            ]}
          />

          <FinancialImpact inc={inc} />

          <div className="card-surface p-3.5">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground">Evidence trail</h3>
              <span className="text-2xs tnum text-muted-foreground">{inc.evidence.length} items</span>
            </div>
            {inc.evidence.length > 0 ? (
              <EvidenceList ids={inc.evidence} />
            ) : (
              <p className="text-xs text-muted-foreground">Evidence captured to the incident record on resolution.</p>
            )}
          </div>

          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => openDrawer({ kind: 'export-pdf', title: `Incident pack — ${inc.id}`, payload: { filename: `${inc.id}-incident-pack.pdf` } })}
          >
            <Download className="size-4" /> Export incident pack
          </Button>
          <div className="text-center text-2xs text-muted-foreground">
            Detected {fmtDate(inc.detectedAt)} · retained per CERT-In 180-day in-India log policy
          </div>
        </div>
      </div>
    </div>
  )
}

function Rationale({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex gap-2">
      <span className="mt-1 size-1.5 shrink-0 rounded-full bg-critical" />
      <span>{children}</span>
    </li>
  )
}
