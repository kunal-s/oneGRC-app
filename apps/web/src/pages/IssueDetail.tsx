import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, ArrowUpRight, CheckCircle2, ShieldAlert, ClipboardCheck, Siren, CalendarClock, FileWarning } from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import { SeverityBadge } from '@/components/SeverityBadge'
import { StatusChip } from '@/components/StatusChip'
import { Avatar } from '@/components/Avatar'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'
import { getControl } from '@/data'
import { PEOPLE_BY_ID } from '@/data/people'
import { fmtDate, fmtIST, NOW_MS } from '@/lib/time'
import { useApp } from '@/store'
import { useEffectiveIssue } from '@/lib/effective'
import { useCanAct } from '@/lib/gating'
import { ExceptionPanel } from './issues/ExceptionPanel'
import { isException } from '@/lib/exceptions'
import { ComingSoon } from './ComingSoon'
import type { Issue } from '@/types'

function sourceRoute(i: Issue): { route: string; icon: React.ReactNode; label: string } {
  if (i.source === 'Exception')
    return i.sourceRef.startsWith('OBL-')
      ? { route: `/obligations/${i.sourceRef}`, icon: <FileWarning className="size-4 text-medium" />, label: 'Deviation from obligation' }
      : { route: `/controls/${i.sourceRef}`, icon: <FileWarning className="size-4 text-medium" />, label: 'Deviation from control' }
  if (i.source === 'Control failure') return { route: `/controls/${i.sourceRef}`, icon: <ShieldAlert className="size-4 text-critical" />, label: 'Failing control' }
  if (i.source === 'Incident') return { route: `/incidents/${i.sourceRef}`, icon: <Siren className="size-4 text-critical" />, label: 'Source incident' }
  // audit finding id like AUD-IS-2026-01-F1 → audit id is the first 4 dash-groups
  const auditId = i.sourceRef.split('-').slice(0, 4).join('-')
  return { route: `/audits/${auditId}`, icon: <ClipboardCheck className="size-4 text-medium" />, label: 'Source audit finding' }
}

export function IssueDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const pushToast = useApp((s) => s.pushToast)
  const resolveIssue = useApp((s) => s.resolveIssue)
  const canResolve = useCanAct({ kind: 'issue.resolve' })
  const issue = useEffectiveIssue(id ?? '')

  if (!issue) return <ComingSoon title="Issue not found" />

  const owner = PEOPLE_BY_ID[issue.owner]
  const src = sourceRoute(issue)
  const overdue = new Date(issue.dueDate).getTime() < NOW_MS && issue.status !== 'Resolved'
  const controls = issue.linkedControls.map((c) => getControl(c)).filter(Boolean)

  return (
    <div>
      <button onClick={() => navigate('/issues')} className="mb-3 inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-3.5" /> Issues & Remediation
      </button>

      <PageHeader
        eyebrow={
          <span className="inline-flex items-center gap-1.5">
            <span className="font-mono text-info">{issue.id}</span>
            <span className="text-muted-foreground">· {issue.source}</span>
          </span>
        }
        title={issue.title}
        description={`Raised from ${issue.source.toLowerCase()} ${issue.sourceRef}; owned by ${owner.name} (${owner.title}).`}
        actions={
          <div className="flex items-center gap-2">
            <SeverityBadge severity={issue.severity} />
            <StatusChip status={issue.status} />
            {issue.status !== 'Resolved' && (
              <Button
                size="sm"
                disabled={!canResolve}
                title={canResolve ? undefined : 'Resolving issues is done by the Control Owner, Auditor or Compliance Manager.'}
                onClick={() => {
                  resolveIssue(issue.id)
                  pushToast({ title: 'Issue resolved', description: `${issue.id} closed with remediation evidence.`, variant: 'success' })
                }}
              >
                <CheckCircle2 className="size-4" /> Resolve
              </Button>
            )}
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <div className="space-y-4">
          {isException(issue) && <ExceptionPanel issue={issue} />}

          <div className="card-surface p-4">
            <h3 className="mb-3 text-sm font-semibold text-foreground">Remediation</h3>
            <div className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4">
              <Attr label="Owner">
                <span className="inline-flex items-center gap-1.5"><Avatar id={issue.owner} size={20} /> <span className="text-xs">{owner.name}</span></span>
              </Attr>
              <Attr label="Severity"><SeverityBadge severity={issue.severity} dense /></Attr>
              <Attr label="Age">{issue.ageDays} days</Attr>
              <Attr label="Due">
                <span className={cn(overdue && 'font-medium text-critical')}>{fmtDate(issue.dueDate)}</span>
              </Attr>
            </div>
            <div className={cn('mt-3 flex items-center gap-2 rounded-md border px-3 py-2 text-xs', overdue ? 'border-critical/30 bg-critical-soft/40 text-critical' : 'border-border bg-muted/30 text-muted-foreground')}>
              <CalendarClock className="size-4" />
              {overdue ? `Overdue — due ${fmtIST(issue.dueDate)}` : `Target remediation by ${fmtIST(issue.dueDate)}`}
            </div>
          </div>

          {controls.length > 0 && (
            <div className="card-surface p-4">
              <h3 className="mb-2 text-sm font-semibold text-foreground">Linked controls</h3>
              <div className="space-y-1">
                {controls.map((c) => (
                  <button key={c!.id} onClick={() => navigate(`/controls/${c!.id}`)} className="group flex w-full items-center gap-2 rounded-md border border-border bg-background px-2 py-1.5 text-left hover:border-info/40 hover:bg-info-soft/40">
                    <span className="font-mono text-2xs font-semibold text-info">{c!.id}</span>
                    <span className="min-w-0 flex-1 truncate text-xs text-foreground">{c!.title}</span>
                    <StatusChip status={c!.result} />
                    <ArrowUpRight className="size-3 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="card-surface p-3.5">
            <h3 className="mb-2 text-sm font-semibold text-foreground">Source</h3>
            <button onClick={() => navigate(src.route)} className="group flex w-full items-center gap-2 rounded-md border border-border bg-background p-2.5 text-left hover:border-info/40 hover:bg-info-soft/40">
              {src.icon}
              <div className="min-w-0 flex-1">
                <div className="text-2xs font-medium uppercase tracking-wide text-muted-foreground">{src.label}</div>
                <div className="truncate font-mono text-xs font-semibold text-info">{issue.sourceRef}</div>
              </div>
              <ArrowUpRight className="size-3.5 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function Attr({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-2xs font-medium uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-0.5 text-sm text-foreground">{children}</div>
    </div>
  )
}
