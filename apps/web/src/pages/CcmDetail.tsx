import { useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft, Bot, XCircle, CheckCircle2, AlertTriangle, Activity, FileCheck, Wrench, Siren,
  ArrowRight, Download, Library,
} from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import { FrameworkPill } from '@/components/FrameworkPill'
import { EvidenceList } from '@/components/EvidenceList'
import { SeverityBadge } from '@/components/SeverityBadge'
import { StatusChip } from '@/components/StatusChip'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'
import { getCcmRule } from '@/lib/ccm'
import { getControl, getIssue, getIncident, WORLD } from '@/data'
import { fmtRelative, fmtIST, fmtDate } from '@/lib/time'
import { inGroup } from '@/lib/format'
import { personName } from '@/data/people'
import { useApp } from '@/store'
import { ComingSoon } from './ComingSoon'

const STATUS = {
  Passing: { icon: CheckCircle2, cls: 'text-ok', ring: 'border-ok/30 bg-ok-soft' },
  Failing: { icon: XCircle, cls: 'text-critical', ring: 'border-critical/30 bg-critical-soft' },
  Degraded: { icon: AlertTriangle, cls: 'text-medium', ring: 'border-medium/40 bg-medium-soft' },
}

export function CcmDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const pushToast = useApp((s) => s.pushToast)
  const openDrawer = useApp((s) => s.openDrawer)
  const rule = id ? getCcmRule(id) : undefined

  if (!rule) return <ComingSoon title="CCM rule not found" />

  const control = getControl(rule.controlId)
  const issue = rule.spawnedIssueId ? getIssue(rule.spawnedIssueId) : undefined
  const incident = rule.incidentId ? getIncident(rule.incidentId) : undefined
  const meta = STATUS[rule.status]
  const Icon = meta.icon
  const evidence = rule.evidenceIds.map((e) => WORLD.evidence.find((x) => x.id === e)).filter(Boolean) as typeof WORLD.evidence
  const passPct = ((rule.passed / rule.population) * 100).toFixed(rule.failed ? 1 : 0)

  return (
    <div>
      <button
        onClick={() => navigate('/ccm')}
        className="mb-3 inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" /> Continuous Control Monitoring
      </button>

      <PageHeader
        eyebrow={
          <span className="inline-flex items-center gap-1.5">
            <span className="font-mono text-info">{rule.ruleId}</span>
            <span className="inline-flex items-center gap-1 rounded bg-ok-soft px-1.5 py-0.5 text-2xs font-medium text-ok">
              <Bot className="size-3" /> CCM-automated · {rule.feed} feed
            </span>
          </span>
        }
        title={rule.name}
        description={rule.description}
        actions={
          <div className="flex items-center gap-2">
            <span className={cn('inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-semibold', meta.ring, meta.cls)}>
              <Icon className="size-4" /> {rule.status}
            </span>
            {control && (
              <Button variant="outline" size="sm" onClick={() => navigate(`/controls/${control.id}`)}>
                <Library className="size-4" /> View control
              </Button>
            )}
          </div>
        }
      />

      {/* live run stats */}
      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-5">
        <RunStat label="Population" value={inGroup(rule.population)} sub="in scope" />
        <RunStat label="Passing" value={inGroup(rule.passed)} sub={`${passPct}%`} tone="ok" />
        <RunStat label="Failing" value={String(rule.failed)} sub={rule.failed ? 'past SLA' : 'none'} tone={rule.failed ? 'danger' : 'ok'} />
        <RunStat label="Last run" value={fmtRelative(rule.lastRunIso)} sub={fmtIST(rule.lastRunIso)} />
        <RunStat label="Cadence" value={rule.frequency} sub="auto-evidence" />
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-2xs font-medium uppercase tracking-wide text-muted-foreground">Satisfies</span>
        {rule.frameworks.map((f) => (
          <FrameworkPill key={f} framework={f} />
        ))}
        <span className="text-2xs tnum text-muted-foreground">{rule.frameworks.length} frameworks</span>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
        {/* The failing population and what the platform did about it, unassisted. */}
        <div data-tour="ccm-escalation" className="space-y-4">
          {/* failing population */}
          {rule.failingItems ? (
            <div className="card-surface overflow-hidden border border-critical/30">
              <div className="flex items-center justify-between border-b border-critical/20 bg-critical-soft/50 px-4 py-2.5">
                <h3 className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                  <XCircle className="size-4 text-critical" /> Failing population — {rule.failingItems.length} critical vulns past 14-day SLA
                </h3>
                <span className="text-2xs text-muted-foreground">pulled from {rule.feed}</span>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-2xs font-semibold uppercase tracking-wide text-muted-foreground">
                    <th className="px-4 py-2">CVE</th>
                    <th className="px-4 py-2">Affected asset</th>
                    <th className="px-4 py-2">Age</th>
                    <th className="px-4 py-2">SLA</th>
                    <th className="px-4 py-2">Detected</th>
                  </tr>
                </thead>
                <tbody>
                  {rule.failingItems.map((f) => (
                    <tr key={f.ref} className="border-b border-border/70 last:border-0">
                      <td className="px-4 py-2 font-mono text-xs font-semibold text-critical">{f.ref}</td>
                      <td className="px-4 py-2 text-xs text-foreground">
                        {f.asset}
                        <div className="text-2xs text-muted-foreground">{f.detail}</div>
                      </td>
                      <td className="px-4 py-2 text-xs font-semibold tnum text-critical">{f.ageDays}d</td>
                      <td className="px-4 py-2 text-xs tnum text-muted-foreground">{f.slaDays}d</td>
                      <td className="px-4 py-2 text-xs text-muted-foreground" title={fmtRelative(f.detectedAt)}>{fmtDate(f.detectedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="border-t border-border px-4 py-2 text-2xs text-muted-foreground">
                {inGroup(rule.passed)} of {inGroup(rule.population)} assets within SLA · {rule.failingItems.length} breaching → rule fails.
              </div>
            </div>
          ) : (
            <div className="card-surface p-4">
              <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-foreground">
                <Activity className="size-4 text-ok" /> Population result
              </h3>
              <div className="h-3 w-full overflow-hidden rounded-full bg-border">
                <div className="h-full rounded-full bg-ok" style={{ width: `${(rule.passed / rule.population) * 100}%` }} />
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                {inGroup(rule.passed)} of {inGroup(rule.population)} in scope passing ({passPct}%).{' '}
                {rule.failed ? `${rule.failed} exceptions tracked.` : 'No exceptions on the latest run.'}
              </p>
            </div>
          )}

          {/* auto-escalation chain */}
          {(issue || incident) && (
            <div className="card-surface p-4">
              <h3 className="mb-3 text-sm font-semibold text-foreground">Auto-escalation</h3>
              <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center">
                <ChainNode icon={<XCircle className="size-4 text-critical" />} label="CCM rule failed" sub={rule.ruleId} tone="danger" />
                <ChainArrow />
                <ChainNode icon={<FileCheck className="size-4 text-ok" />} label="Evidence captured" sub={`${evidence.length} items, auto`} tone="ok" />
                <ChainArrow />
                {issue && (
                  <>
                    <button onClick={() => navigate(`/issues/${issue.id}`)} className="flex-1">
                      <ChainNode icon={<Wrench className="size-4 text-medium" />} label="Issue spawned" sub={issue.id} tone="warn" clickable />
                    </button>
                    <ChainArrow />
                  </>
                )}
                {incident && (
                  <button onClick={() => navigate(`/incidents/${incident.id}`)} className="flex-1">
                    <ChainNode icon={<Siren className="size-4 text-critical" />} label="Incident linked" sub={incident.id} tone="danger" clickable />
                  </button>
                )}
              </div>
              <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                {issue && (
                  <div className="rounded-md border border-border p-2.5">
                    <div className="mb-1 flex items-center gap-2">
                      <span className="font-mono text-2xs font-semibold text-info">{issue.id}</span>
                      <SeverityBadge severity={issue.severity} dense />
                      <StatusChip status={issue.status} />
                    </div>
                    <div className="text-xs text-foreground">{issue.title}</div>
                    <div className="mt-0.5 text-2xs text-muted-foreground">Owner {personName(issue.owner)} · due {fmtDate(issue.dueDate)}</div>
                  </div>
                )}
                {incident && (
                  <div className="rounded-md border border-border p-2.5">
                    <div className="mb-1 flex items-center gap-2">
                      <span className="font-mono text-2xs font-semibold text-info">{incident.id}</span>
                      <SeverityBadge severity={incident.classification} dense />
                    </div>
                    <div className="text-xs text-foreground">{incident.title}</div>
                    <div className="mt-0.5 text-2xs tnum text-muted-foreground">{incident.regulatorTracks.length} regulator tracks running</div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="card-surface p-4">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground">Auto-captured evidence</h3>
              <span className="text-2xs text-muted-foreground">{evidence.length} items · {rule.feed}</span>
            </div>
            {evidence.length > 0 ? (
              <EvidenceList items={evidence} />
            ) : (
              <p className="text-xs text-muted-foreground">Evidence captured automatically on each run.</p>
            )}
          </div>

          <div className="card-surface p-4 text-xs">
            <h3 className="mb-2 text-sm font-semibold text-foreground">How this rule runs</h3>
            <dl className="space-y-1.5 text-muted-foreground">
              <Row k="Feed / source" v={rule.feed} />
              <Row k="Cadence" v={rule.frequency} />
              <Row k="Last run" v={`${fmtRelative(rule.lastRunIso)} (${fmtIST(rule.lastRunIso)})`} />
              <Row k="Underlying control" v={rule.controlId} />
              <Row k="Mode" v="Continuous · evidence auto-captured" />
            </dl>
          </div>

          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => {
              pushToast({ title: 'CCM rule re-run queued', description: `${rule.ruleId} will re-evaluate the full population.`, variant: 'info' })
              openDrawer({ kind: 'export-pdf', title: `CCM run report — ${rule.ruleId}`, payload: { filename: `${rule.ruleId}-run-report.pdf` } })
            }}
          >
            <Download className="size-4" /> Export run report
          </Button>
        </div>
      </div>
    </div>
  )
}

function RunStat({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: 'ok' | 'danger' }) {
  return (
    <div className="card-surface p-3">
      <div className="text-2xs font-medium uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={cn('mt-0.5 text-lg font-semibold tnum', tone === 'ok' ? 'text-ok' : tone === 'danger' ? 'text-critical' : 'text-foreground')}>{value}</div>
      {sub && <div className="text-2xs text-muted-foreground">{sub}</div>}
    </div>
  )
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <dt>{k}</dt>
      <dd className="font-medium text-foreground">{v}</dd>
    </div>
  )
}

function ChainNode({ icon, label, sub, tone, clickable }: { icon: React.ReactNode; label: string; sub: string; tone: 'ok' | 'warn' | 'danger'; clickable?: boolean }) {
  const ring = tone === 'danger' ? 'border-critical/30' : tone === 'warn' ? 'border-medium/40' : 'border-ok/30'
  return (
    <div className={cn('flex flex-1 items-center gap-2 rounded-lg border bg-background px-2.5 py-2', ring, clickable && 'transition-colors hover:bg-muted/50')}>
      {icon}
      <div className="min-w-0">
        <div className="text-xs font-medium text-foreground">{label}</div>
        <div className="font-mono text-2xs text-muted-foreground">{sub}</div>
      </div>
    </div>
  )
}

function ChainArrow() {
  return <ArrowRight className="hidden size-4 shrink-0 text-muted-foreground sm:block" />
}
