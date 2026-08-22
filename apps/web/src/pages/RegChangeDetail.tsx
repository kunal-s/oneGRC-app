import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, GitPullRequestArrow, CalendarClock, ShieldCheck, BellRing, ArrowRight, ArrowUpRight, Building2 } from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import { StatusChip } from '@/components/StatusChip'
import { Avatar } from '@/components/Avatar'
import { Button } from '@/components/ui/Button'
import { RegulatorChip } from '@/lib/regulators'
import { getObligation, getControl } from '@/data'
import { personName, PEOPLE_BY_ID } from '@/data/people'
import { fmtIST, fmtRelative } from '@/lib/time'
import { useApp } from '@/store'
import { useEffectiveRegChange } from '@/lib/effective'
import { useCanAct } from '@/lib/gating'
import { ComingSoon } from './ComingSoon'

// who gets alerted, per featured change
const ALERT_TARGET: Record<string, string> = {
  'RCM-2026-118': 'Deepa Iyer (GST / Tax) alerted — obligation template & reconciliation control updated',
  'RCM-2026-117': 'Investment & Risk Committee + Arvind Patel alerted — exposure-limit control & quarterly return updated',
}

export function RegChangeDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const acknowledgeRegChange = useApp((s) => s.acknowledgeRegChange)
  const canAck = useCanAct({ kind: 'regchange.acknowledge' })
  const c = useEffectiveRegChange(id ?? '')

  if (!c) return <ComingSoon title="Regulatory change not found" />
  const acknowledged = c.status === 'Closed'

  const owner = PEOPLE_BY_ID[c.owner]
  const obligations = c.impactedObligations.map((o) => getObligation(o)).filter(Boolean)
  const controls = c.impactedControls.map((x) => getControl(x)).filter(Boolean)
  const alertText = ALERT_TARGET[c.id] ?? `${owner.name} (${owner.title}) alerted to assess impact`

  return (
    <div>
      <button onClick={() => navigate('/reg-change')} className="mb-3 inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-3.5" /> Regulatory Change
      </button>

      <PageHeader
        eyebrow={
          <span className="inline-flex items-center gap-1.5">
            <GitPullRequestArrow className="size-3.5 text-info" />
            <span className="font-mono text-info">{c.id}</span>
            <RegulatorChip regulator={c.regulator} />
            <span className="text-muted-foreground">· {c.source}</span>
          </span>
        }
        title={c.summary}
        description={`Published ${fmtIST(c.publishedAt)} · ingested via ${c.source}.`}
        actions={
          <div className="flex items-center gap-2">
            <StatusChip status={c.status} />
            <Button size="sm" disabled={acknowledged || !canAck} title={canAck ? undefined : 'Acknowledging is restricted to the Compliance Manager / Analyst / Risk Manager.'} onClick={() => acknowledgeRegChange(c.id)}>
              {acknowledged ? 'Acknowledged' : 'Acknowledge impact'}
            </Button>
          </div>
        }
      />

      {/* narrative */}
      <div className="mb-4 card-surface p-4">
        <h3 className="mb-1.5 text-sm font-semibold text-foreground">What changed</h3>
        <p className="text-sm leading-relaxed text-foreground">{c.detail}</p>
      </div>

      {/* alert banner */}
      <div className="mb-4 flex items-center gap-2 rounded-lg border border-medium/40 bg-medium-soft/40 px-3.5 py-2.5">
        <BellRing className="size-4 text-medium" />
        <span className="text-xs font-medium text-foreground">Owner alerted automatically —</span>
        <span className="text-xs text-muted-foreground">{alertText}</span>
      </div>

      {/* impact flow */}
      <div className="mb-4 card-surface p-4">
        <h3 className="mb-3 text-sm font-semibold text-foreground">Impact — change flows to obligations &amp; controls</h3>
        <div className="flex flex-col items-stretch gap-2 lg:flex-row lg:items-center">
          <div className="flex items-center gap-2 rounded-lg border border-info/30 bg-info-soft/40 px-3 py-2">
            <GitPullRequestArrow className="size-4 text-info" />
            <div className="min-w-0">
              <div className="font-mono text-2xs font-semibold text-info">{c.id}</div>
              <div className="truncate text-xs text-foreground">{c.source}</div>
            </div>
          </div>
          <ArrowRight className="mx-auto hidden size-4 shrink-0 rotate-90 text-muted-foreground lg:block lg:rotate-0" />
          <div className="grid flex-1 grid-cols-1 gap-2 sm:grid-cols-2">
            <FlowGroup title="Obligations updated" icon={<CalendarClock className="size-4 text-info" />} count={obligations.length} />
            <FlowGroup title="Controls updated" icon={<ShieldCheck className="size-4 text-ok" />} count={controls.length} />
          </div>
          <ArrowRight className="mx-auto hidden size-4 shrink-0 rotate-90 text-muted-foreground lg:block lg:rotate-0" />
          <div className="flex items-center gap-2 rounded-lg border border-medium/40 bg-medium-soft/40 px-3 py-2">
            <Avatar id={c.owner} size={24} />
            <div className="min-w-0">
              <div className="text-2xs font-medium uppercase tracking-wide text-muted-foreground">Owner alerted</div>
              <div className="truncate text-xs font-medium text-foreground">{personName(c.owner)}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* impacted obligations */}
        <div className="card-surface p-4">
          <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-foreground">
            <CalendarClock className="size-4 text-info" /> Impacted obligations
            <span className="ml-auto text-2xs text-muted-foreground">{obligations.length}</span>
          </h3>
          <div className="space-y-1">
            {obligations.map((o) => (
              <button key={o!.id} onClick={() => navigate(`/obligations/${o!.id}`)} className="group flex w-full items-center gap-2 rounded-md border border-border bg-background px-2 py-1.5 text-left hover:border-info/40 hover:bg-info-soft/40">
                <span className="font-mono text-2xs font-semibold text-info">{o!.id}</span>
                <span className="min-w-0 flex-1 truncate text-xs text-foreground">{o!.title}</span>
                <StatusChip status={o!.status} />
                <ArrowUpRight className="size-3 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
              </button>
            ))}
            {obligations.length === 0 && <p className="text-xs text-muted-foreground">No obligation directly affected.</p>}
          </div>
        </div>

        {/* impacted controls */}
        <div className="card-surface p-4">
          <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-foreground">
            <ShieldCheck className="size-4 text-ok" /> Impacted controls
            <span className="ml-auto text-2xs text-muted-foreground">{controls.length}</span>
          </h3>
          <div className="space-y-1">
            {controls.map((ctrl) => (
              <button key={ctrl!.id} onClick={() => navigate(`/controls/${ctrl!.id}`)} className="group flex w-full items-center gap-2 rounded-md border border-border bg-background px-2 py-1.5 text-left hover:border-info/40 hover:bg-info-soft/40">
                <span className="font-mono text-2xs font-semibold text-info">{ctrl!.id}</span>
                <span className="min-w-0 flex-1 truncate text-xs text-foreground">{ctrl!.title}</span>
                <StatusChip status={ctrl!.result} />
                <ArrowUpRight className="size-3 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
              </button>
            ))}
            {controls.length === 0 && <p className="text-xs text-muted-foreground">No control directly affected.</p>}
          </div>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-2 text-2xs text-muted-foreground">
        <Building2 className="size-3.5" />
        Sankalp Pension Funds · change ingested {fmtRelative(c.publishedAt)}
      </div>
    </div>
  )
}

function FlowGroup({ title, icon, count }: { title: string; icon: React.ReactNode; count: number }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2">
      {icon}
      <div>
        <div className="text-sm font-semibold tnum text-foreground">{count}</div>
        <div className="text-2xs text-muted-foreground">{title}</div>
      </div>
    </div>
  )
}
