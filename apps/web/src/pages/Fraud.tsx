import { useNavigate } from 'react-router-dom'
import { Activity, IndianRupee, Lock, Radar, ShieldAlert } from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import { DataTable, type Column, type TableFilter } from '@/components/DataTable'
import { StatusChip } from '@/components/StatusChip'
import { SeverityBadge } from '@/components/SeverityBadge'
import { Avatar } from '@/components/Avatar'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'
import { personName } from '@/data/people'
import { fmtDate } from '@/lib/time'
import { useApp } from '@/store'
import { useEffectiveFraudCases } from '@/lib/effective'
import { outcomeTone, partitionByAccess } from '@/lib/investigations'
import {
  byDetection,
  caseAge,
  fraudStageTone,
  fraudSummary,
  inrLakh,
  isOpenCase,
  isOverdue,
  lossByScheme,
  netLossLakh,
  openTracks,
  trackState,
  trackTone,
} from '@/lib/fraud'
import type { FraudCase } from '@/types'

const STAGE_ORDER = { Reported: 0, Triage: 1, Investigation: 2, 'Recovery & action': 3, Closed: 4 } as const

/**
 * The fraud register. Where the speak-up channel protects a person, this
 * processes data: cases arrive from monitoring, controls and audit, and the
 * page leads with detection quality and exposure rather than with narrative.
 */
export function Fraud() {
  const navigate = useNavigate()
  const role = useApp((s) => s.role)
  const selfId = useApp((s) => s.personId)
  const pushToast = useApp((s) => s.pushToast)
  const cases = useEffectiveFraudCases()

  const { open: visible, sealed, hidden } = partitionByAccess(cases, selfId, role)
  const s = fraudSummary(cases, selfId, role)
  const detection = byDetection(visible)
  const schemes = lossByScheme(visible)

  const columns: Column<FraudCase>[] = [
    {
      key: 'id',
      header: 'Case',
      className: 'max-w-[300px]',
      sortValue: (c) => c.id,
      render: (c) => (
        <div className="min-w-0">
          <div className="truncate text-xs font-medium text-foreground">{c.title}</div>
          <div className="truncate text-2xs text-muted-foreground">
            <span className="font-mono font-semibold text-info">{c.id}</span> · {c.scheme}
            {c.whistleblowerRef && <span className="ml-1 rounded bg-muted px-1 py-0 font-mono">{c.whistleblowerRef}</span>}
          </div>
        </div>
      ),
    },
    {
      key: 'detection',
      header: 'Detected by',
      className: 'max-w-[190px]',
      sortValue: (c) => c.detection,
      render: (c) => <span className="block truncate text-xs text-foreground">{c.detection}</span>,
    },
    {
      key: 'severity',
      header: 'Severity',
      className: 'w-24',
      sortValue: (c) => c.severity,
      render: (c) => <SeverityBadge severity={c.severity} dense />,
    },
    {
      key: 'stage',
      header: 'Stage',
      className: 'w-36',
      sortValue: (c) => STAGE_ORDER[c.stage],
      render: (c) => (
        <span className="inline-flex items-center gap-1.5">
          <StatusChip status={c.stage} tone={fraudStageTone(c.stage)} />
          {isOverdue(c) && <span className="rounded bg-critical-soft px-1 py-0 text-2xs font-semibold text-critical">late</span>}
        </span>
      ),
    },
    {
      key: 'exposure',
      header: 'Net exposure',
      align: 'right',
      className: 'w-32',
      sortValue: (c) => netLossLakh(c),
      render: (c) => (
        <span
          className={cn('text-xs tnum', netLossLakh(c) > 0 ? 'font-medium text-foreground' : 'text-muted-foreground')}
          title={`Gross ${inrLakh(c.confirmedLossLakh ?? c.estimatedLossLakh)} · recovered ${inrLakh(c.recoveredLakh ?? 0)}`}
        >
          {inrLakh(netLossLakh(c))}
        </span>
      ),
    },
    {
      key: 'regulator',
      header: 'Regulator',
      className: 'w-36',
      sortValue: (c) => openTracks(c).length * -1,
      render: (c) => {
        const open = openTracks(c)
        const required = c.regulatoryTracks.filter((t) => t.required)
        if (required.length === 0) return <span className="text-2xs text-muted-foreground">none engaged</span>
        if (open.length === 0) return <StatusChip status={`${required.length} filed`} tone="ok" />
        return (
          <span className="inline-flex items-center gap-1" title={open.map((t) => `${t.regulator} — ${t.basis}`).join('\n')}>
            {open.slice(0, 2).map((t) => (
              <StatusChip key={t.regulator} status={t.regulator} tone={trackTone(trackState(t))} />
            ))}
          </span>
        )
      },
    },
    {
      key: 'investigator',
      header: 'Investigator',
      sortValue: (c) => personName(c.investigator),
      render: (c) => (
        <span className="inline-flex items-center gap-1.5">
          <Avatar id={c.investigator} size={20} />
          <span className="truncate text-xs text-foreground">{personName(c.investigator)}</span>
        </span>
      ),
    },
    {
      key: 'age',
      header: 'Age',
      className: 'w-20',
      sortValue: (c) => caseAge(c),
      render: (c) => (
        <span className="text-xs tnum text-muted-foreground" title={`Opened ${fmtDate(c.openedOn)}`}>
          {caseAge(c)}d
        </span>
      ),
    },
    {
      key: 'outcome',
      header: 'Outcome',
      className: 'w-40',
      sortValue: (c) => c.outcome ?? 'zz',
      render: (c) => (c.outcome ? <StatusChip status={c.outcome} tone={outcomeTone(c.outcome)} /> : <span className="text-2xs text-muted-foreground">—</span>),
    },
  ]

  const filters: TableFilter<FraudCase>[] = [
    {
      key: 'scheme',
      label: 'Scheme',
      options: Array.from(new Set(cases.map((c) => c.scheme))).sort(),
      predicate: (c, v) => c.scheme === v,
    },
    {
      key: 'detection',
      label: 'Detected by',
      options: Array.from(new Set(cases.map((c) => c.detection))).sort(),
      predicate: (c, v) => c.detection === v,
    },
    { key: 'stage', label: 'Stage', options: ['Reported', 'Triage', 'Investigation', 'Recovery & action', 'Closed'], predicate: (c, v) => c.stage === v },
    {
      key: 'attention',
      label: 'Needs attention',
      options: ['Regulator notification due', 'Investigation late', 'From the speak-up channel', 'Loss unrecovered'],
      predicate: (c, v) =>
        v === 'Regulator notification due'
          ? openTracks(c).length > 0
          : v === 'Investigation late'
            ? isOverdue(c)
            : v === 'From the speak-up channel'
              ? !!c.whistleblowerRef
              : netLossLakh(c) > 0,
    },
  ]

  return (
    <div>
      <PageHeader
        eyebrow="Incidents"
        title="Fraud cases"
        description={`${s.total} cases · ${s.open} open · ${inrLakh(s.netLossLakh)} net exposure · ${s.recoveryRate}% recovered · median ${s.medianDaysToClose} days to close`}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate('/whistleblower')}>
              Speak-up channel
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => pushToast({ title: 'Fraud register exported', description: 'fraud-register.csv — restricted distribution.', variant: 'success' })}
            >
              Export
            </Button>
          </div>
        }
      />

      <div className="mb-3 grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)_minmax(0,1fr)]">
        <div className="card-surface p-4">
          <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-foreground">
            <IndianRupee className="size-4 text-muted-foreground" /> Exposure
          </h3>
          <div className="flex items-baseline gap-1.5">
            <span className={cn('text-2xl font-semibold tnum', s.netLossLakh > 0 ? 'text-critical' : 'text-ok')}>{inrLakh(s.netLossLakh)}</span>
            <span className="text-2xs text-muted-foreground">net, after {inrLakh(s.recoveredLakh)} recovered</span>
          </div>
          <div className="mt-2 space-y-1">
            {schemes.slice(0, 3).map((sc) => (
              <div key={sc.scheme} className="flex items-center gap-2">
                <span className="min-w-0 flex-1 truncate text-2xs text-foreground">{sc.scheme}</span>
                <span className="shrink-0 text-2xs tnum text-muted-foreground">
                  {sc.count} · {inrLakh(sc.net)}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="card-surface p-4">
          <div className="mb-2 flex items-center gap-1.5">
            <Radar className="size-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold text-foreground">How it is being found</h3>
            <span className="ml-auto text-2xs tnum text-muted-foreground">{s.proactiveDetectionPct}% proactive</span>
          </div>
          <div className="space-y-1">
            {detection.map((d) => (
              <div key={d.detection} className="flex items-center gap-2">
                <span className={cn('size-1.5 shrink-0 rounded-full', d.proactive ? 'bg-ok' : 'bg-medium')} />
                <span className="min-w-0 flex-1 truncate text-2xs text-foreground">{d.detection}</span>
                <span className="shrink-0 text-2xs tnum text-muted-foreground">{d.count}</span>
              </div>
            ))}
          </div>
          <p className="mt-2 border-t border-border pt-2 text-2xs text-muted-foreground">
            Green means a control or a review found it. Amber means somebody outside the control estate did.
          </p>
        </div>

        <div className="card-surface p-4">
          <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-foreground">
            <ShieldAlert className="size-4 text-muted-foreground" /> Case health
          </h3>
          <div className="space-y-1.5">
            <Line label="Substantiated in whole or part" value={s.substantiated} tone="warn" />
            <Line label="Investigations past target" value={s.overdueInvestigations} tone={s.overdueInvestigations ? 'danger' : 'ok'} />
            <Line label="Regulator notifications late" value={s.regulatoryBreaches} tone={s.regulatoryBreaches ? 'danger' : 'ok'} />
            <Line label="Opened from the speak-up channel" value={s.fromWhistleblower} tone="neutral" />
          </div>
        </div>
      </div>

      {visible.length > 0 ? (
        <DataTable
          data={visible}
          columns={columns}
          searchKeys={['id', 'title', 'scheme', 'detection', (c) => personName(c.investigator), (c) => c.whistleblowerRef ?? '']}
          searchPlaceholder="Search case, scheme, detection or reference…"
          filters={filters}
          initialSort={{ key: 'stage', dir: 'asc' }}
          onRowClick={(c) => navigate(`/fraud/${c.id}`)}
          rightSlot={<span className="text-2xs tnum text-muted-foreground">{visible.filter(isOpenCase).length} open to you</span>}
        />
      ) : (
        <div className="card-surface flex flex-col items-center gap-2 px-4 py-12 text-center">
          <Lock className="size-6 text-muted-foreground" />
          <div className="text-sm font-medium text-foreground">No case is open to this persona</div>
          <div className="max-w-md text-xs text-muted-foreground">
            {cases.length} case{cases.length === 1 ? ' exists' : 's exist'}. Investigations are restricted to the case team and
            the ethics office.
          </div>
        </div>
      )}

      {(sealed.length > 0 || hidden > 0) && (
        <div className="mt-3 card-surface p-4">
          <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-foreground">
            <Lock className="size-4 text-muted-foreground" /> Sealed to you
          </h3>
          {sealed.length > 0 && (
            <div className="space-y-1">
              {sealed.map((c) => (
                <div key={c.id} className="flex items-center gap-2 rounded-md border border-dashed border-border px-2.5 py-1.5">
                  <span className="font-mono text-2xs font-semibold text-muted-foreground">{c.id}</span>
                  <StatusChip status={c.stage} tone={fraudStageTone(c.stage)} />
                  <span className="ml-auto text-2xs tnum text-muted-foreground">{caseAge(c)}d open</span>
                </div>
              ))}
            </div>
          )}
          {hidden > 0 && (
            <p className={cn('text-2xs text-muted-foreground', sealed.length > 0 && 'mt-2')}>
              {hidden} further case{hidden === 1 ? ' is' : 's are'} not visible to this persona at all.
            </p>
          )}
        </div>
      )}

      <div className="mt-3 flex items-center gap-1.5 text-2xs text-muted-foreground">
        <Activity className="size-3.5" />
        Confirmed losses use the same Basel categories as operational incidents, so a fraud loss and an operational loss reconcile
        to one number.
      </div>
    </div>
  )
}

function Line({ label, value, tone }: { label: string; value: React.ReactNode; tone: 'ok' | 'warn' | 'danger' | 'neutral' }) {
  return (
    <div className="flex items-center gap-2">
      <span className="min-w-0 flex-1 truncate text-2xs text-muted-foreground">{label}</span>
      <span
        className={cn(
          'shrink-0 text-sm font-semibold tnum',
          tone === 'danger' ? 'text-critical' : tone === 'warn' ? 'text-medium' : tone === 'ok' ? 'text-ok' : 'text-foreground',
        )}
      >
        {value}
      </span>
    </div>
  )
}
