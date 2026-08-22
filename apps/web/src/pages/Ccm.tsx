import { useNavigate } from 'react-router-dom'
import { Activity, Bot, CheckCircle2, XCircle, AlertTriangle, ArrowUpRight } from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import { FrameworkPills } from '@/components/FrameworkPill'
import { cn } from '@/lib/utils'
import { ccmRules, ccmStats } from '@/lib/ccm'
import { fmtRelative, fmtIST } from '@/lib/time'
import { inGroup } from '@/lib/format'
import type { CcmRule } from '@/lib/ccm'

const STATUS_META = {
  Passing: { icon: CheckCircle2, cls: 'text-ok', dot: 'bg-ok' },
  Failing: { icon: XCircle, cls: 'text-critical', dot: 'bg-critical' },
  Degraded: { icon: AlertTriangle, cls: 'text-medium', dot: 'bg-medium' },
}

export function Ccm() {
  const navigate = useNavigate()
  const rules = ccmRules()
  const stats = ccmStats()

  return (
    <div>
      <PageHeader
        eyebrow="Risk & Control"
        title="Continuous Control Monitoring"
        description="Controls tested continuously against the full population. Evidence is captured on every run; failures escalate to an Issue and the linked incident."
      />

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <SummaryTile label="Automated rules" value={stats.total} icon={<Bot className="size-4 text-info" />} />
        <SummaryTile label="Passing" value={stats.passing} tone="ok" />
        <SummaryTile label="Degraded" value={stats.degraded} tone="warn" />
        <SummaryTile label="Failing" value={stats.failing} tone="danger" />
      </div>

      <div className="card-surface overflow-hidden">
        <div className="flex items-center justify-between border-b border-border bg-muted/40 px-4 py-2">
          <span className="text-xs font-semibold text-foreground">{rules.length} CCM rules</span>
          <span className="inline-flex items-center gap-1 text-2xs text-muted-foreground">
            <Activity className="size-3.5" /> live
          </span>
        </div>
        <div className="scrollbar-thin max-h-none divide-y divide-border/70">
          {rules.map((rule) => (
            <RuleRow key={rule.ruleId} rule={rule} onClick={() => navigate(`/ccm/${rule.ruleId}`)} />
          ))}
        </div>
      </div>
    </div>
  )
}

function RuleRow({ rule, onClick }: { rule: CcmRule; onClick: () => void }) {
  const meta = STATUS_META[rule.status]
  const Icon = meta.icon
  const passPct = ((rule.passed / rule.population) * 100).toFixed(rule.failed ? 1 : 0)
  return (
    <button onClick={onClick} className="group flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-info-soft/30">
      <span className={cn('flex size-8 shrink-0 items-center justify-center rounded-md', rule.status === 'Failing' ? 'bg-critical-soft' : rule.status === 'Degraded' ? 'bg-medium-soft' : 'bg-ok-soft')}>
        <Icon className={cn('size-4', meta.cls)} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-medium text-foreground">{rule.name}</span>
          {rule.spawnedIssueId && (
            <span className="shrink-0 rounded bg-critical-soft px-1.5 py-0 text-2xs font-semibold text-critical">auto-escalated</span>
          )}
        </div>
        <div className="mt-0.5 flex items-center gap-2 text-2xs text-muted-foreground">
          <span className="font-mono font-semibold text-info">{rule.ruleId}</span>
          <span>·</span>
          <span>{rule.feed}</span>
          <span>·</span>
          <span title={fmtIST(rule.lastRunIso)}>last run {fmtRelative(rule.lastRunIso)}</span>
          <span>·</span>
          <span>{rule.frequency}</span>
        </div>
      </div>
      <FrameworkPills frameworks={rule.frameworks} max={4} className="hidden shrink-0 xl:flex" />
      <div className="hidden w-40 shrink-0 text-right md:block">
        <div className="text-xs font-medium tnum text-foreground">
          {inGroup(rule.passed)} / {inGroup(rule.population)} pass
        </div>
        <div className={cn('text-2xs tnum', rule.failed ? 'text-critical' : 'text-muted-foreground')}>
          {rule.failed ? `${rule.failed} failing · ` : ''}{passPct}%
        </div>
      </div>
      <ArrowUpRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
    </button>
  )
}

function SummaryTile({ label, value, icon, tone }: { label: string; value: number; icon?: React.ReactNode; tone?: 'ok' | 'warn' | 'danger' }) {
  return (
    <div className="card-surface p-3">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className={cn('mt-1 text-2xl font-semibold tnum', tone === 'ok' ? 'text-ok' : tone === 'warn' ? 'text-medium' : tone === 'danger' ? 'text-critical' : 'text-foreground')}>
        {value}
      </div>
    </div>
  )
}
