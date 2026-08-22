import * as React from 'react'
import { useNavigate } from 'react-router-dom'
import { AlarmClock, Siren, ArrowUpRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useApp } from '@/store'
import { WORLD } from '@/data'
import { nearestTrack } from '@/lib/clocks'
import { RegulatorClockInline } from '../RegulatorClock'
import { NOW_MS } from '@/lib/time'
import { riskQueueItems } from '@/lib/riskWorkflow'
import { kriQueueItems } from '@/lib/kri'
import { vendorQueueItems } from '@/lib/vendors'
import { wbQueueItems } from '@/lib/whistleblower'
import { fraudQueueItems } from '@/lib/fraud'
import { campaignQueueItems } from '@/lib/campaigns'
import { useEffectiveRisks, useEffectiveCampaigns, useEffectiveVendors, useEffectiveReports, useEffectiveFraudCases } from '@/lib/effective'
import type { RoleKey } from '@/types'

// Personas for whom a live incident clock is genuinely relevant. For everyone
// else the strip leads with their own work, not an alarm they cannot act on
// (docs/onegrc-ux-audit.md, Section 5 - the Open Incidents fix).
const INCIDENT_PERSONAS: RoleKey[] = ['EXEC', 'CTRLOWNER', 'AUDITOR']

/**
 * Contextual, role-scoped "what needs me now" strip. Replaces the global Open
 * Incidents vital that showed the same five numbers on every screen for every
 * persona. Derived from the persona's own queue + the live clock where relevant.
 */
export function NeedsMe({ className }: { className?: string }) {
  const navigate = useNavigate()
  const role = useApp((s) => s.role)
  // Subscribe to incident overrides so the nearest-clock chip updates when a
  // regulator track is filed (Epic 3.2); activeTracks reads the merged state.
  useApp((s) => s.incidentOverrides)

  const risks = useEffectiveRisks()
  const campaigns = useEffectiveCampaigns()
  const selfId = useApp((s) => s.personId)
  const vendors = useEffectiveVendors()
  const reports = useEffectiveReports()
  const fraudCases = useEffectiveFraudCases()
  const mine = React.useMemo(
    () => [...WORLD.queue.filter((q) => q.role === role), ...riskQueueItems(role, risks), ...kriQueueItems(role), ...campaignQueueItems(role, campaigns), ...vendorQueueItems(role, vendors), ...wbQueueItems(role, selfId, reports), ...fraudQueueItems(role, selfId, fraudCases)],
    [role, selfId, risks, campaigns, vendors, reports, fraudCases],
  )
  const overdue = mine.filter((t) => new Date(t.due).getTime() < NOW_MS)
  // Most urgent: earliest due among overdue, else earliest due overall.
  const top = [...mine].sort((a, b) => new Date(a.due).getTime() - new Date(b.due).getTime())[0]
  const nearest = INCIDENT_PERSONAS.includes(role) ? nearestTrack() : undefined

  return (
    <div className={cn('flex h-9 shrink-0 items-center gap-2 border-b border-border bg-muted/50 px-3', className)}>
      {overdue.length > 0 && (
        <Chip icon={<AlarmClock className="size-3.5" />} label="Overdue" value={overdue.length} tone="warn" onClick={() => navigate('/queue')} />
      )}
      {nearest && (
        <button
            onClick={() => navigate(`/incidents/${nearest.incidentId}`)}
            className="flex items-center gap-2 rounded-md px-2.5 py-1 transition-colors hover:bg-background"
          >
            <span className="text-muted-foreground"><Siren className="size-3.5" /></span>
            <span className="text-2xs font-medium uppercase tracking-wide text-muted-foreground">
              Nearest clock · {nearest.track.regulator}
            </span>
            <span className="text-sm font-semibold tnum text-critical">
              <RegulatorClockInline track={nearest.track} />
            </span>
          </button>
      )}
      {top && (
        <button
          onClick={() => navigate(top.route)}
          className="ml-auto flex min-w-0 items-center gap-1.5 rounded-md px-2 py-1 text-2xs text-muted-foreground transition-colors hover:bg-background"
        >
          <span className="hidden truncate md:inline">Next: {top.title}</span>
          <span className="font-mono font-semibold text-info">{top.ref}</span>
          <ArrowUpRight className="size-3 shrink-0" />
        </button>
      )}
    </div>
  )
}

function Chip({
  icon,
  label,
  value,
  tone,
  onClick,
}: {
  icon: React.ReactNode
  label: string
  value: React.ReactNode
  tone: 'neutral' | 'warn' | 'danger' | 'ok'
  onClick?: () => void
}) {
  const toneCls = tone === 'danger' ? 'text-critical' : tone === 'warn' ? 'text-medium' : tone === 'ok' ? 'text-ok' : 'text-foreground'
  return (
    <button onClick={onClick} className={cn('flex items-center gap-2 rounded-md px-2.5 py-1 transition-colors', onClick && 'hover:bg-background')}>
      <span className="text-muted-foreground">{icon}</span>
      <span className="text-2xs font-medium uppercase tracking-wide text-muted-foreground">{label}</span>
      <span className={cn('text-sm font-semibold tnum', toneCls)}>{value}</span>
    </button>
  )
}
