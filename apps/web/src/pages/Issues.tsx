import * as React from 'react'
import { useNavigate } from 'react-router-dom'
import { Download, CheckCircle2, UserCog, Wrench, ShieldAlert, ClipboardCheck, Siren, FileWarning } from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import { DataTable, type Column, type TableFilter } from '@/components/DataTable'
import { SeverityBadge } from '@/components/SeverityBadge'
import { StatusChip } from '@/components/StatusChip'
import { Avatar } from '@/components/Avatar'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'
import { personName } from '@/data/people'
import { fmtDate, NOW_MS } from '@/lib/time'
import { useApp } from '@/store'
import { useEffectiveIssues } from '@/lib/effective'
import { useCanAct } from '@/lib/gating'
import { SavedViews } from '@/components/kit/SavedViews'
import { exceptionState, exceptionSummary, isException } from '@/lib/exceptions'
import type { Issue, Severity } from '@/types'

const SEV_ORDER: Record<Severity, number> = { Critical: 4, High: 3, Medium: 2, Low: 1 }
const SOURCE_ICON: Record<Issue['source'], typeof ShieldAlert> = {
  'Control failure': ShieldAlert,
  'Audit finding': ClipboardCheck,
  Incident: Siren,
  Exception: FileWarning,
}

const SOURCES: Issue['source'][] = ['Control failure', 'Audit finding', 'Incident', 'Exception']

type ViewId = 'all' | 'exceptions' | 'overdue' | 'open'

const EXPIRY_TONE = { Active: 'ok', 'Expiring soon': 'warn', Expired: 'danger', Closed: 'neutral' } as const

export function Issues() {
  const navigate = useNavigate()
  const pushToast = useApp((s) => s.pushToast)
  const bulkSetIssueStatus = useApp((s) => s.bulkSetIssueStatus)
  const canResolve = useCanAct({ kind: 'issue.resolve' })

  const allIssues = useEffectiveIssues()
  const [view, setView] = React.useState<ViewId>('all')
  const owners = React.useMemo(() => Array.from(new Set(allIssues.map((i) => personName(i.owner)))).sort(), [allIssues])
  const openCount = allIssues.filter((i) => i.status !== 'Resolved').length
  const overdue = allIssues.filter((i) => i.status === 'Overdue').length
  const ex = React.useMemo(() => exceptionSummary(allIssues), [allIssues])
  const exceptionView = view === 'exceptions'

  const issues = React.useMemo(() => {
    switch (view) {
      case 'exceptions':
        return allIssues.filter(isException)
      case 'overdue':
        return allIssues.filter((i) => i.status === 'Overdue')
      case 'open':
        return allIssues.filter((i) => i.status !== 'Resolved')
      default:
        return allIssues
    }
  }, [allIssues, view])

  const columns: Column<Issue>[] = [
    {
      key: 'id',
      header: 'Issue ID',
      sortValue: (i) => i.id,
      render: (i) => <span className="font-mono text-xs font-semibold text-info">{i.id}</span>,
    },
    {
      key: 'title',
      header: 'Title',
      sortValue: (i) => i.title,
      className: 'max-w-[320px]',
      render: (i) => <span className="block truncate text-sm text-foreground">{i.title}</span>,
    },
    {
      key: 'source',
      header: 'Source',
      sortValue: (i) => i.source,
      render: (i) => {
        const Icon = SOURCE_ICON[i.source]
        return (
          <span className="inline-flex items-center gap-1.5 text-xs text-foreground">
            <Icon className="size-3.5 text-muted-foreground" />
            {i.source}
          </span>
        )
      },
    },
    {
      key: 'sourceRef',
      header: 'From',
      sortValue: (i) => i.sourceRef,
      render: (i) => <span className="font-mono text-2xs text-muted-foreground">{i.sourceRef}</span>,
    },
    {
      key: 'severity',
      header: 'Severity',
      sortValue: (i) => SEV_ORDER[i.severity],
      render: (i) => <SeverityBadge severity={i.severity} dense />,
    },
    {
      key: 'owner',
      header: 'Owner',
      sortValue: (i) => personName(i.owner),
      render: (i) => (
        <span className="inline-flex items-center gap-1.5">
          <Avatar id={i.owner} size={20} />
          <span className="truncate text-xs text-foreground">{personName(i.owner)}</span>
        </span>
      ),
    },
    {
      key: 'ageDays',
      header: 'Age',
      align: 'right',
      sortValue: (i) => i.ageDays,
      render: (i) => <span className={cn('text-xs tnum', i.ageDays > 90 ? 'font-medium text-critical' : 'text-muted-foreground')}>{i.ageDays}d</span>,
    },
    {
      key: 'dueDate',
      header: 'Due',
      sortValue: (i) => new Date(i.dueDate).getTime(),
      render: (i) => {
        const overdueRow = new Date(i.dueDate).getTime() < NOW_MS && i.status !== 'Resolved'
        return <span className={cn('text-xs tnum', overdueRow ? 'font-medium text-critical' : 'text-muted-foreground')}>{fmtDate(i.dueDate)}</span>
      },
    },
    {
      key: 'status',
      header: 'Status',
      sortValue: (i) => i.status,
      render: (i) => <StatusChip status={i.status} />,
    },
  ]

  // The register needs the deviation's own fields, which are meaningless on a
  // control-failure or audit issue — so they replace the generic middle columns
  // rather than widening every row with blanks.
  const exceptionColumns: Column<Issue>[] = [
    { key: 'id', header: 'Issue ID', sortValue: (i) => i.id, render: (i) => <span className="font-mono text-xs font-semibold text-info">{i.id}</span> },
    {
      key: 'ref',
      header: 'Raised against',
      sortValue: (i) => i.sourceRef,
      render: (i) => <span className="font-mono text-2xs text-muted-foreground">{i.sourceRef}</span>,
    },
    {
      key: 'reason',
      header: 'Reason',
      className: 'max-w-[300px]',
      sortValue: (i) => i.exception?.reason ?? '',
      render: (i) => <span className="block truncate text-xs text-foreground" title={i.exception?.reason}>{i.exception?.reason}</span>,
    },
    {
      key: 'compensating',
      header: 'Compensating control',
      sortValue: (i) => i.exception?.compensatingControl ?? '',
      render: (i) =>
        i.exception?.compensatingControl ? (
          <span className="font-mono text-2xs font-semibold text-info">{i.exception.compensatingControl}</span>
        ) : (
          <span className="text-2xs text-muted-foreground">none</span>
        ),
    },
    {
      key: 'approver',
      header: 'Approver',
      sortValue: (i) => personName(i.exception?.approvedBy ?? ''),
      render: (i) =>
        i.exception ? (
          <span className="inline-flex items-center gap-1.5" title={`Requested by ${personName(i.exception.requestedBy)}`}>
            <Avatar id={i.exception.approvedBy} size={20} />
            <span className="truncate text-xs text-foreground">{personName(i.exception.approvedBy)}</span>
          </span>
        ) : null,
    },
    {
      key: 'renewals',
      header: 'Renewals',
      align: 'right',
      sortValue: (i) => i.exception?.renewalCount ?? 0,
      render: (i) => {
        const n = i.exception?.renewalCount ?? 0
        return <span className={cn('text-xs tnum', n >= 2 ? 'font-medium text-medium' : 'text-muted-foreground')}>{n}</span>
      },
    },
    {
      key: 'expires',
      header: 'Expires',
      sortValue: (i) => new Date(i.exception?.expiresOn ?? 0).getTime(),
      render: (i) => {
        const st = exceptionState(i)
        return (
          <span className={cn('text-xs tnum', st === 'Expired' ? 'font-medium text-critical' : st === 'Expiring soon' ? 'font-medium text-medium' : 'text-muted-foreground')}>
            {i.exception ? fmtDate(i.exception.expiresOn) : '—'}
          </span>
        )
      },
    },
    {
      key: 'exstatus',
      header: 'Status',
      sortValue: (i) => exceptionState(i) ?? '',
      render: (i) => {
        const st = exceptionState(i)
        if (i.exception?.approvalState === 'Requested') return <StatusChip status="Awaiting approval" tone="progress" />
        return st ? <StatusChip status={st} tone={EXPIRY_TONE[st]} /> : null
      },
    },
  ]

  const filters: TableFilter<Issue>[] = [
    { key: 'source', label: 'Source', options: SOURCES, predicate: (i, v) => i.source === v },
    { key: 'severity', label: 'Severity', options: ['Critical', 'High', 'Medium', 'Low'], predicate: (i, v) => i.severity === v },
    { key: 'status', label: 'Status', options: ['Open', 'In progress', 'Overdue', 'Resolved'], predicate: (i, v) => i.status === v },
    { key: 'owner', label: 'Owner', options: owners, predicate: (i, v) => personName(i.owner) === v },
  ]

  const exceptionFilters: TableFilter<Issue>[] = [
    { key: 'exstatus', label: 'Status', options: ['Active', 'Expiring soon', 'Expired', 'Closed'], predicate: (i, v) => exceptionState(i) === v },
    { key: 'approval', label: 'Approval', options: ['Requested', 'Approved', 'Rejected'], predicate: (i, v) => i.exception?.approvalState === v },
    { key: 'against', label: 'Raised against', options: ['Control', 'Obligation'], predicate: (i, v) => (v === 'Obligation' ? i.sourceRef.startsWith('OBL-') : i.sourceRef.startsWith('CTRL-')) },
    { key: 'severity', label: 'Severity', options: ['Critical', 'High', 'Medium', 'Low'], predicate: (i, v) => i.severity === v },
    { key: 'owner', label: 'Requested by', options: owners, predicate: (i, v) => personName(i.owner) === v },
  ]

  return (
    <div>
      <PageHeader
        eyebrow="Audit & Assurance"
        title="Issues & Remediation"
        description={
          exceptionView
            ? `${ex.total} exceptions — approved, time-boxed deviations with a compensating control and an expiry.`
            : `${allIssues.length} remediation issues, each traceable to a failed control, an audit finding, an incident or an approved exception.`
        }
        actions={
          <Button variant="outline" size="sm" onClick={() => pushToast({ title: 'Issues exported', description: 'issues-remediation-jun-2026.csv.', variant: 'success' })}>
            <Download className="size-4" /> Export
          </Button>
        }
      />

      <SavedViews
        className="mb-3"
        views={[
          { id: 'all', label: 'All issues', count: allIssues.length },
          { id: 'open', label: 'Open', count: openCount },
          { id: 'overdue', label: 'Overdue', count: overdue },
          { id: 'exceptions', label: 'Exceptions', count: ex.total },
        ]}
        active={view}
        onSelect={(v) => setView(v as ViewId)}
      />

      <div className="mb-3 flex flex-wrap items-center gap-2 text-xs">
        {exceptionView ? (
          <>
            <span className="rounded-md border border-ok/30 bg-ok-soft px-2.5 py-1 text-ok">Active <span className="font-semibold tnum">{ex.active}</span></span>
            <span className="rounded-md border border-medium/40 bg-medium-soft px-2.5 py-1 text-medium">Expiring ≤7d <span className="font-semibold tnum">{ex.expiringSoon}</span></span>
            <span className="rounded-md border border-critical/30 bg-critical-soft px-2.5 py-1 text-critical">Expired <span className="font-semibold tnum">{ex.expired}</span></span>
            <span className="rounded-md border border-border bg-background px-2.5 py-1">Awaiting approval <span className="font-semibold tnum text-foreground">{ex.awaitingApproval}</span></span>
            <span className="rounded-md border border-border bg-background px-2.5 py-1">Closed <span className="font-semibold tnum text-muted-foreground">{ex.closed}</span></span>
            <span className="rounded-md border border-border bg-background px-2.5 py-1">Renewals <span className="font-semibold tnum text-muted-foreground">{ex.renewals}</span></span>
          </>
        ) : (
          <>
            <span className="rounded-md border border-border bg-background px-2.5 py-1">Open <span className="font-semibold tnum text-foreground">{openCount}</span></span>
            <span className="rounded-md border border-critical/30 bg-critical-soft px-2.5 py-1 text-critical">Overdue <span className="font-semibold tnum">{overdue}</span></span>
            {SOURCES.map((src) => (
              <span key={src} className="rounded-md border border-border bg-background px-2.5 py-1">
                {src} <span className="font-semibold tnum text-muted-foreground">{allIssues.filter((i) => i.source === src && i.status !== 'Resolved').length}</span>
              </span>
            ))}
          </>
        )}
      </div>

      <DataTable
        key={view}
        data={issues}
        columns={exceptionView ? exceptionColumns : columns}
        searchKeys={['id', 'title', 'sourceRef', (i) => personName(i.owner), (i) => i.exception?.reason ?? '']}
        searchPlaceholder={exceptionView ? 'Search exception, control, obligation or reason…' : 'Search issue id, title or source ref…'}
        filters={exceptionView ? exceptionFilters : filters}
        initialSort={exceptionView ? { key: 'expires', dir: 'asc' } : { key: 'severity', dir: 'desc' }}
        onRowClick={(i) => navigate(`/issues/${i.id}`)}
        selectable
        bulkBar={(sel, clear) => {
          const open = sel.filter((i) => i.status !== 'Resolved')
          const inProgress = open.filter((i) => i.status !== 'In progress')
          return (
            <>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  pushToast({ title: `${sel.length} issues assigned`, description: 'Bulk reassignment applied.', variant: 'success' })
                  clear()
                }}
              >
                <UserCog className="size-4" /> Assign owner
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={!canResolve || inProgress.length === 0}
                title={canResolve ? undefined : 'Issue status changes are made by the Control Owner, Auditor or Compliance Manager.'}
                onClick={() => {
                  bulkSetIssueStatus(inProgress.map((i) => i.id), 'In progress')
                  pushToast({ title: `${inProgress.length} issues set to In progress`, description: 'Bulk status update applied.', variant: 'info' })
                  clear()
                }}
              >
                <Wrench className="size-4" /> Mark in progress
              </Button>
              <Button
                size="sm"
                disabled={!canResolve || open.length === 0}
                title={canResolve ? undefined : 'Resolving issues is done by the Control Owner, Auditor or Compliance Manager.'}
                onClick={() => {
                  bulkSetIssueStatus(open.map((i) => i.id), 'Resolved')
                  pushToast({ title: `${open.length} issues resolved`, description: 'Bulk closure recorded with remediation evidence.', variant: 'success' })
                  clear()
                }}
              >
                <CheckCircle2 className="size-4" /> Resolve selected
              </Button>
            </>
          )
        }}
      />
    </div>
  )
}
