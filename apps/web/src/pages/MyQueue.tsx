import * as React from 'react'
import { useNavigate } from 'react-router-dom'
import {
  BadgeCheck, RefreshCw, Siren, FileSearch, DatabaseZap, GitPullRequestArrow, ArrowUpRight, Inbox, BellRing,
} from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import { SeverityBadge } from '@/components/SeverityBadge'
import { Avatar } from '@/components/Avatar'
import { cn } from '@/lib/utils'
import { useApp } from '@/store'
import { WORLD } from '@/data'
import { ROLES, PEOPLE, PEOPLE_BY_ID, personName } from '@/data/people'
import { fmtDate, fmtRelative, NOW_MS } from '@/lib/time'
import { reminderEngineSummary } from '@/lib/reminders'
import { riskQueueItems } from '@/lib/riskWorkflow'
import { kriQueueItems } from '@/lib/kri'
import { vendorQueueItems } from '@/lib/vendors'
import { wbQueueItems } from '@/lib/whistleblower'
import { fraudQueueItems } from '@/lib/fraud'
import { campaignQueueItems } from '@/lib/campaigns'
import { useEffectiveRisks, useEffectiveCampaigns, useEffectiveVendors, useEffectiveReports, useEffectiveFraudCases } from '@/lib/effective'
import { MyComplianceCalendarCard } from '@/components/MyComplianceCalendar'
import type { QueueTask } from '@/types'

const ENGINE = reminderEngineSummary()

const KIND_META: Record<QueueTask['kind'], { icon: React.ComponentType<{ className?: string }>; cls: string }> = {
  Approval: { icon: BadgeCheck, cls: 'bg-ok-soft text-ok' },
  'Control re-test': { icon: RefreshCw, cls: 'bg-info-soft text-info' },
  'Incident action': { icon: Siren, cls: 'bg-critical-soft text-critical' },
  'Evidence request': { icon: FileSearch, cls: 'bg-medium-soft text-medium' },
  DSAR: { icon: DatabaseZap, cls: 'bg-medium-soft text-medium' },
  'Reg-change review': { icon: GitPullRequestArrow, cls: 'bg-info-soft text-info' },
}

const KIND_ORDER: QueueTask['kind'][] = [
  'Incident action',
  'Approval',
  'Control re-test',
  'Reg-change review',
  'Evidence request',
  'DSAR',
]

/** Deterministically derive the counterparty (maker / requester) for a task. */
function counterparty(task: QueueTask, selfId: string): string {
  const hash = [...task.id, ...task.ref].reduce((s, ch) => s + ch.charCodeAt(0), 0)
  const pool = PEOPLE.filter((p) => p.id !== selfId)
  return pool[hash % pool.length].id
}

function makerCheckerLabel(kind: QueueTask['kind']): string {
  switch (kind) {
    case 'Approval': return 'Checker'
    case 'Control re-test': return 'Tester'
    case 'Incident action': return 'Responder'
    case 'Evidence request': return 'Requested by'
    case 'DSAR': return 'Raised by'
    case 'Reg-change review': return 'Assessor'
  }
}

export function MyQueue() {
  const navigate = useNavigate()
  const role = useApp((s) => s.role)
  const selfId = useApp((s) => s.personId)
  const pushToast = useApp((s) => s.pushToast)
  const [active, setActive] = React.useState<'All' | QueueTask['kind']>('All')

  // reset filter whenever the role changes so the queue feels persona-fresh
  React.useEffect(() => setActive('All'), [role])

  const persona = PEOPLE_BY_ID[selfId]
  const roleLabel = ROLES.find((r) => r.key === role)!.label

  // Seeded queue plus the risk work items derived from live remediation state.
  const risks = useEffectiveRisks()
  const campaigns = useEffectiveCampaigns()
  const vendors = useEffectiveVendors()
  const reports = useEffectiveReports()
  const fraudCases = useEffectiveFraudCases()
  const all = React.useMemo(
    () =>
      [...WORLD.queue.filter((q) => q.role === role), ...riskQueueItems(role, risks), ...kriQueueItems(role), ...campaignQueueItems(role, campaigns), ...vendorQueueItems(role, vendors), ...wbQueueItems(role, selfId, reports), ...fraudQueueItems(role, selfId, fraudCases)].sort(
        (a, b) => new Date(a.due).getTime() - new Date(b.due).getTime(),
      ),
    [role, selfId, risks, campaigns, vendors, reports, fraudCases],
  )

  const counts = React.useMemo(() => {
    const c: Record<string, number> = {}
    for (const t of all) c[t.kind] = (c[t.kind] ?? 0) + 1
    return c
  }, [all])

  const overdue = all.filter((t) => new Date(t.due).getTime() < NOW_MS).length
  const onClock = all.filter((t) => t.kind === 'Incident action').length

  const rows = active === 'All' ? all : all.filter((t) => t.kind === active)

  const act = (label: string) =>
    pushToast({ title: label, description: 'Recorded in your queue.', variant: 'success' })

  return (
    <div>
      <PageHeader
        eyebrow={`My Queue · ${persona.name} · ${roleLabel}`}
        title="My Queue"
        description="Maker-checker approvals, control re-tests, incident actions on the clock, audit evidence and DSARs routed to you."
        actions={
          <div className="flex items-center gap-2 text-xs">
            <span className="rounded-md border border-border bg-background px-2.5 py-1.5 font-medium tnum">
              {all.length} open
            </span>
            {overdue > 0 && (
              <span className="rounded-md border border-critical/30 bg-critical-soft px-2.5 py-1.5 font-medium text-critical tnum">
                {overdue} overdue
              </span>
            )}
            {onClock > 0 && (
              <span className="rounded-md border border-high/30 bg-high-soft px-2.5 py-1.5 font-medium text-high tnum">
                {onClock} on the clock
              </span>
            )}
          </div>
        }
      />

      <button
        onClick={() => navigate('/obligations')}
        className="mb-3 flex w-full items-center gap-2 rounded-md border border-border bg-muted/30 px-3 py-1.5 text-left text-xs text-muted-foreground transition-colors hover:bg-muted/60"
      >
        <BellRing className="size-3.5 shrink-0 text-info" />
        <span className="text-foreground">
          <span className="font-medium">Reminder &amp; escalation engine active.</span> {ENGINE.reminders} reminders sent and {ENGINE.escalations} escalations fired this period at the set intervals (7/3/1 before due · 1/3/7 overdue) — every event is in the audit log.
        </span>
        <ArrowUpRight className="ml-auto size-3.5 shrink-0" />
      </button>

      <MyComplianceCalendarCard className="mb-3" />

      {/* Kind segmented filter */}
      <div className="mb-3 flex flex-wrap items-center gap-1.5">
        <FilterPill label="All" count={all.length} active={active === 'All'} onClick={() => setActive('All')} />
        {KIND_ORDER.filter((k) => counts[k]).map((k) => {
          const Icon = KIND_META[k].icon
          return (
            <FilterPill
              key={k}
              label={k}
              count={counts[k]}
              active={active === k}
              icon={<Icon className="size-3.5" />}
              onClick={() => setActive(k)}
            />
          )
        })}
      </div>

      <div className="card-surface divide-y divide-border/70">
        {rows.map((t) => {
          const meta = KIND_META[t.kind]
          const Icon = meta.icon
          const isOverdue = new Date(t.due).getTime() < NOW_MS
          const cp = counterparty(t, selfId)
          return (
            <div
              key={t.id}
              role="button"
              tabIndex={0}
              onClick={() => navigate(t.route)}
              onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && navigate(t.route)}
              className="group flex cursor-pointer items-center gap-3 px-4 py-2.5 transition-colors hover:bg-info-soft/30"
            >
              <div className={cn('flex size-8 shrink-0 items-center justify-center rounded-md', meta.cls)}>
                <Icon className="size-4" />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate text-sm font-medium text-foreground">{t.title}</span>
                </div>
                <div className="mt-0.5 flex items-center gap-2 text-2xs text-muted-foreground">
                  <span className="font-mono font-semibold text-info">{t.ref}</span>
                  <span>·</span>
                  <span>{t.kind}</span>
                  <span>·</span>
                  <span className="inline-flex items-center gap-1">
                    {makerCheckerLabel(t.kind)}:
                    <Avatar id={cp} size={14} />
                    {personName(cp)}
                  </span>
                </div>
              </div>

              {/* SLA / due */}
              <div className="hidden w-36 shrink-0 text-right md:block">
                <div className={cn('text-xs font-medium tnum', isOverdue ? 'text-critical' : 'text-foreground')}>
                  {isOverdue ? 'Overdue' : 'Due'} {fmtRelative(t.due)}
                </div>
                <div className="text-2xs text-muted-foreground">{fmtDate(t.due)}</div>
              </div>

              <div className="w-20 shrink-0">
                <SeverityBadge severity={t.priority} dense />
              </div>

              {/* quick action */}
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  act(t.kind === 'Approval' ? `Approved — ${t.ref}` : `Actioned — ${t.ref}`)
                }}
                className="hidden shrink-0 items-center gap-1 rounded-md border border-border px-2 py-1 text-2xs font-medium text-foreground transition-colors hover:bg-muted lg:flex"
              >
                {t.kind === 'Approval' ? 'Approve' : t.kind === 'Control re-test' ? 'Re-test' : 'Action'}
              </button>
              <ArrowUpRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </div>
          )
        })}
        {rows.length === 0 && (
          <div className="flex flex-col items-center gap-2 px-4 py-12 text-center text-muted-foreground">
            <Inbox className="size-6" />
            <div className="text-sm">No {active === 'All' ? '' : active.toLowerCase()} tasks in this view.</div>
          </div>
        )}
      </div>

    </div>
  )
}

function FilterPill({
  label,
  count,
  active,
  icon,
  onClick,
}: {
  label: string
  count: number
  active: boolean
  icon?: React.ReactNode
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors',
        active
          ? 'border-primary bg-primary text-primary-foreground'
          : 'border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground',
      )}
    >
      {icon}
      {label}
      <span className={cn('tnum', active ? 'text-primary-foreground/80' : 'text-muted-foreground')}>{count}</span>
    </button>
  )
}
