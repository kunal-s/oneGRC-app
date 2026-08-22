import * as React from 'react'
import { useNavigate } from 'react-router-dom'
import { EyeOff, Lock, MessageSquareWarning, Plus, ShieldCheck } from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import { DataTable, type Column, type TableFilter } from '@/components/DataTable'
import { StatusChip } from '@/components/StatusChip'
import { SeverityBadge } from '@/components/SeverityBadge'
import { Button } from '@/components/ui/Button'
import { Drawer } from '@/components/Drawer'
import { cn } from '@/lib/utils'
import { fmtDate, fmtRelative } from '@/lib/time'
import { useApp } from '@/store'
import { useEffectiveReports } from '@/lib/effective'
import { accessTo, outcomeTone, partitionByAccess } from '@/lib/investigations'
import {
  acknowledgeState,
  byCategory,
  daysOpen,
  feedbackState,
  isOpen,
  retaliationState,
  slaTone,
  stageTone,
  wbSummary,
} from '@/lib/whistleblower'
import type { WbCategory, WbChannel, WhistleblowerReport, Severity } from '@/types'

const CATEGORIES: WbCategory[] = [
  'Financial misstatement',
  'Fraud or theft',
  'Bribery & corruption',
  'Conflict of interest',
  'Harassment or discrimination',
  'Data misuse',
  'Regulatory breach',
  'Health & safety',
  'Other',
]
const CHANNELS: WbChannel[] = ['Web portal (anonymous)', 'Ethics hotline', 'Dedicated email', 'Sealed letter', 'In person']

/**
 * The speak-up register. Access is decided per case: what a persona cannot open
 * is shown as a sealed stub with its stage and clock, and what they may not
 * even know about is counted, not listed.
 */
export function Whistleblower() {
  const navigate = useNavigate()
  const role = useApp((s) => s.role)
  const selfId = useApp((s) => s.personId)
  const reports = useEffectiveReports()
  const [intake, setIntake] = React.useState(false)

  const { open: visible, sealed, hidden } = partitionByAccess(reports, selfId, role)
  const s = wbSummary(reports, selfId, role)
  const cats = byCategory(visible)

  const columns: Column<WhistleblowerReport>[] = [
    {
      key: 'reference',
      header: 'Reference',
      className: 'w-32',
      sortValue: (r) => r.reference,
      render: (r) => (
        <span className="inline-flex items-center gap-1.5">
          {r.anonymous && <EyeOff className="size-3 shrink-0 text-muted-foreground" />}
          <span className="font-mono text-xs font-semibold text-info">{r.reference}</span>
        </span>
      ),
    },
    {
      key: 'category',
      header: 'Category',
      className: 'max-w-[220px]',
      sortValue: (r) => r.category,
      render: (r) => <span className="block truncate text-xs text-foreground">{r.category}</span>,
    },
    {
      key: 'severity',
      header: 'Severity',
      className: 'w-24',
      sortValue: (r) => r.severity,
      render: (r) => <SeverityBadge severity={r.severity} dense />,
    },
    {
      key: 'stage',
      header: 'Stage',
      className: 'w-32',
      sortValue: (r) => r.stage,
      render: (r) => <StatusChip status={r.stage} tone={stageTone(r.stage)} />,
    },
    {
      key: 'received',
      header: 'Received',
      className: 'w-28',
      sortValue: (r) => new Date(r.receivedAt).getTime(),
      render: (r) => (
        <span className="text-xs tnum text-muted-foreground" title={fmtDate(r.receivedAt)}>
          {daysOpen(r)}d {isOpen(r) ? 'open' : 'to close'}
        </span>
      ),
    },
    {
      key: 'clocks',
      header: 'Acknowledge · respond',
      className: 'w-44',
      sortValue: (r) => new Date(r.feedbackBy).getTime(),
      render: (r) => {
        const a = acknowledgeState(r)
        const f = feedbackState(r)
        return (
          <span className="inline-flex items-center gap-1" title={`Acknowledgement due ${fmtDate(r.acknowledgeBy)} · substantive response due ${fmtDate(r.feedbackBy)}`}>
            <StatusChip status={a} tone={slaTone(a)} />
            <StatusChip status={f} tone={slaTone(f)} />
          </span>
        )
      },
    },
    {
      key: 'outcome',
      header: 'Outcome',
      className: 'w-40',
      sortValue: (r) => r.outcome ?? 'zz',
      render: (r) => (r.outcome ? <StatusChip status={r.outcome} tone={outcomeTone(r.outcome)} /> : <span className="text-2xs text-muted-foreground">—</span>),
    },
    {
      key: 'onward',
      header: 'Onward',
      className: 'w-28',
      sortValue: (r) => (r.linkedFraudCaseId ? 0 : 1),
      render: (r) =>
        r.linkedFraudCaseId ? (
          <button
            onClick={(e) => {
              e.stopPropagation()
              navigate(`/fraud/${r.linkedFraudCaseId}`)
            }}
            className="font-mono text-2xs font-semibold text-info hover:underline"
          >
            {r.linkedFraudCaseId}
          </button>
        ) : r.linkedIssueIds.length ? (
          <span className="text-2xs tnum text-muted-foreground">{r.linkedIssueIds.length} action{r.linkedIssueIds.length === 1 ? '' : 's'}</span>
        ) : (
          <span className="text-2xs text-muted-foreground">—</span>
        ),
    },
  ]

  const filters: TableFilter<WhistleblowerReport>[] = [
    { key: 'category', label: 'Category', options: CATEGORIES, predicate: (r, v) => r.category === v },
    { key: 'stage', label: 'Stage', options: ['Received', 'Acknowledged', 'Under triage', 'Investigation', 'Awaiting outcome', 'Remediation', 'Closed', 'Rejected'], predicate: (r, v) => r.stage === v },
    { key: 'channel', label: 'Channel', options: CHANNELS, predicate: (r, v) => r.channel === v },
    {
      key: 'attention',
      label: 'Needs attention',
      options: ['Not acknowledged', 'Response overdue', 'Retaliation review due', 'Converted to fraud'],
      predicate: (r, v) =>
        v === 'Not acknowledged'
          ? !r.acknowledgedOn
          : v === 'Response overdue'
            ? isOpen(r) && feedbackState(r) === 'Breached'
            : v === 'Retaliation review due'
              ? retaliationState(r) === 'Review due' || retaliationState(r) === 'Watch active'
              : !!r.linkedFraudCaseId,
    },
  ]

  return (
    <div>
      <PageHeader
        eyebrow="Incidents"
        title="Speak-up"
        description={`${s.total} reports · ${s.open} open · ${s.anonymousShare}% anonymous · median ${s.medianDaysToClose} days to a substantive response`}
        actions={
          <Button size="sm" onClick={() => setIntake(true)}>
            <Plus className="size-4" /> File a report
          </Button>
        }
      />

      <div className="mb-3 rounded-lg border border-info/30 bg-info-soft/25 px-3 py-2">
        <div className="flex items-start gap-2">
          <Lock className="mt-0.5 size-3.5 shrink-0 text-info" />
          <p className="text-2xs text-foreground">
            Reports are restricted to the ethics office — the Head of Compliance, the Head of Internal Audit and the Data
            Protection Officer — plus the assigned investigator. The Audit Committee has direct access under the vigil
            mechanism. A reporter&apos;s identity is not a field on the record: where someone chose to identify, custody is
            noted and unsealing needs two named people.
          </p>
        </div>
      </div>

      <div className="mb-3 grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.2fr)]">
        <div className="card-surface p-4">
          <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-foreground">
            <MessageSquareWarning className="size-4 text-muted-foreground" /> Response duty
          </h3>
          <div className="space-y-1.5">
            <Line label="Acknowledgement breached" value={s.acknowledgementBreached} tone={s.acknowledgementBreached ? 'danger' : 'ok'} />
            <Line label="Substantive response overdue" value={s.feedbackBreached} tone={s.feedbackBreached ? 'danger' : 'ok'} />
            <Line label="Median days to close" value={s.medianDaysToClose} tone="neutral" />
          </div>
        </div>

        <div className="card-surface p-4">
          <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-foreground">
            <ShieldCheck className="size-4 text-muted-foreground" /> Outcomes
          </h3>
          <div className="space-y-1.5">
            <Line label="Substantiated in whole or part" value={`${s.substantiated} · ${s.substantiationRate}%`} tone="warn" />
            <Line label="Referred to the fraud module" value={s.convertedToFraud} tone="neutral" />
            <Line label="Active retaliation watches" value={s.retaliationWatches} tone={s.retaliationWatches ? 'warn' : 'ok'} />
          </div>
        </div>

        <div className="card-surface p-4">
          <h3 className="mb-2 text-sm font-semibold text-foreground">By category</h3>
          {cats.length > 0 ? (
            <div className="space-y-1">
              {cats.slice(0, 5).map((c) => (
                <div key={c.category} className="flex items-center gap-2">
                  <span className="min-w-0 flex-1 truncate text-2xs text-foreground">{c.category}</span>
                  <span className="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
                    <span className="block h-full bg-info" style={{ width: `${(c.count / Math.max(...cats.map((x) => x.count))) * 100}%` }} />
                  </span>
                  <span className="w-12 shrink-0 text-right text-2xs tnum text-muted-foreground">
                    {c.substantiated}/{c.count}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">No case in this register is open to you.</p>
          )}
        </div>
      </div>

      {visible.length > 0 ? (
        <DataTable
          data={visible}
          columns={columns}
          searchKeys={['reference', 'category', 'allegationAgainst']}
          searchPlaceholder="Search reference or category…"
          filters={filters}
          initialSort={{ key: 'received', dir: 'desc' }}
          onRowClick={(r) => navigate(`/whistleblower/${r.id}`)}
          rightSlot={<span className="text-2xs tnum text-muted-foreground">{visible.length} open to you</span>}
        />
      ) : (
        <div className="card-surface flex flex-col items-center gap-2 px-4 py-12 text-center">
          <Lock className="size-6 text-muted-foreground" />
          <div className="text-sm font-medium text-foreground">No report is open to this persona</div>
          <div className="max-w-md text-xs text-muted-foreground">
            {reports.length} report{reports.length === 1 ? ' exists' : 's exist'} in the register. Switch to the Compliance
            Manager, the Auditor or the Audit Committee to work them.
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
              {sealed.map((r) => (
                <div key={r.id} className="flex items-center gap-2 rounded-md border border-dashed border-border px-2.5 py-1.5">
                  <span className="font-mono text-2xs font-semibold text-muted-foreground">{r.reference}</span>
                  <StatusChip status={r.stage} tone={stageTone(r.stage)} />
                  <span className="ml-auto text-2xs tnum text-muted-foreground">received {fmtRelative(r.receivedAt)}</span>
                  <span className="shrink-0 text-2xs text-muted-foreground">{accessTo(r, selfId, role).reason.split('.')[0]}</span>
                </div>
              ))}
            </div>
          )}
          {hidden > 0 && (
            <p className={cn('text-2xs text-muted-foreground', sealed.length > 0 && 'mt-2')}>
              {hidden} further report{hidden === 1 ? ' is' : 's are'} not visible to this persona at all.
            </p>
          )}
        </div>
      )}

      <IntakeDrawer open={intake} onClose={() => setIntake(false)} />
    </div>
  )
}

/**
 * Intake. Deliberately spare: a category, a severity, what happened, and who it
 * concerns by role. There is no name field, no contact field and no upload that
 * would carry metadata — the reporter leaves with a reference code.
 */
function IntakeDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate()
  const fileReport = useApp((s) => s.fileReport)
  const pushToast = useApp((s) => s.pushToast)
  const reports = useEffectiveReports()

  const [channel, setChannel] = React.useState<WbChannel>('Web portal (anonymous)')
  const [category, setCategory] = React.useState<WbCategory>('Fraud or theft')
  const [severity, setSeverity] = React.useState<Severity>('High')
  const [summary, setSummary] = React.useState('')
  const [against, setAgainst] = React.useState('')
  const [anonymous, setAnonymous] = React.useState(true)
  const [identityHeld, setIdentityHeld] = React.useState(false)
  const [issued, setIssued] = React.useState<string | null>(null)

  const namesSomeone = /\b(mr|ms|mrs|shri|smt)\b/i.test(against) || reportsAName(against, reports)
  const gaps = [
    summary.trim().length < 40 ? 'Describe what happened in a little more detail — at least a couple of sentences.' : undefined,
    !against.trim() ? 'Say which team or role the concern is about.' : undefined,
    namesSomeone ? 'Describe the person by role or team, not by name. A name enters the record only if an allegation is substantiated.' : undefined,
  ].filter(Boolean) as string[]

  const reset = () => {
    setSummary('')
    setAgainst('')
    setIssued(null)
    setAnonymous(true)
    setIdentityHeld(false)
  }

  return (
    <Drawer
      open={open}
      onClose={() => {
        reset()
        onClose()
      }}
      width="max-w-2xl"
      title="File a speak-up report"
      subtitle={issued ? 'Keep the reference below — it is how you follow this up' : 'Nothing you enter here identifies you'}
      footer={
        issued ? (
          <div className="flex w-full items-center justify-between gap-2">
            <span className="text-2xs text-muted-foreground">The ethics office has been notified. No identifying metadata was captured.</span>
            <Button
              size="sm"
              onClick={() => {
                reset()
                onClose()
                navigate('/whistleblower')
              }}
            >
              Done
            </Button>
          </div>
        ) : (
          <div className="flex w-full items-center justify-between gap-2">
            <span className="text-2xs text-muted-foreground">
              {gaps.length > 0 ? gaps[0] : 'You will be given a reference code and a response date.'}
            </span>
            <Button
              size="sm"
              disabled={gaps.length > 0}
              onClick={() => {
                const ref = fileReport({ channel, category, severity, summary, allegationAgainst: against, anonymous, identityHeld, retaliationWatch: true })
                setIssued(ref)
                pushToast({ title: 'Report filed', description: `Your reference is ${ref}.`, variant: 'success' })
              }}
            >
              Submit anonymously
            </Button>
          </div>
        )
      }
    >
      {issued ? (
        <div className="space-y-3">
          <div className="rounded-lg border border-ok/40 bg-ok-soft/30 px-4 py-6 text-center">
            <div className="text-2xs uppercase tracking-wide text-muted-foreground">Your reference</div>
            <div className="mt-1 font-mono text-2xl font-semibold tnum text-foreground">{issued}</div>
            <p className="mx-auto mt-2 max-w-sm text-2xs text-muted-foreground">
              This is the only handle you need, and the only one we hold. Use it to check progress or add detail. We cannot
              recover it for you, and we cannot work backwards from it to you.
            </p>
          </div>
          <ul className="space-y-1 rounded-md border border-border bg-muted/30 px-3 py-2 text-2xs text-foreground">
            <li>· You will be acknowledged within 7 days.</li>
            <li>· You will get a substantive response within 90 days, whatever the outcome.</li>
            <li>· You are protected against detriment for having raised this. A retaliation watch is open on your report.</li>
          </ul>
        </div>
      ) : (
        <div className="space-y-4">
          <Field label="How you are reporting">
            <div className="flex flex-wrap gap-1.5">
              {CHANNELS.map((c) => (
                <Chip key={c} active={channel === c} onClick={() => setChannel(c)}>
                  {c}
                </Chip>
              ))}
            </div>
          </Field>

          <Field label="What kind of concern">
            <div className="flex flex-wrap gap-1.5">
              {CATEGORIES.map((c) => (
                <Chip key={c} active={category === c} onClick={() => setCategory(c)}>
                  {c}
                </Chip>
              ))}
            </div>
          </Field>

          <Field label="How serious do you believe it is">
            <div className="flex flex-wrap gap-1.5">
              {(['Critical', 'High', 'Medium', 'Low'] as Severity[]).map((sv) => (
                <Chip key={sv} active={severity === sv} onClick={() => setSeverity(sv)}>
                  {sv}
                </Chip>
              ))}
            </div>
          </Field>

          <Field label="What happened">
            <textarea
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              rows={5}
              placeholder="What you saw, when, and how you know. Dates, references and amounts help; your own name does not."
              className="w-full resize-none rounded-md border border-border bg-background px-2.5 py-1.5 text-xs outline-none focus:ring-2 focus:ring-ring"
            />
          </Field>

          <Field label="Who it concerns">
            <input
              value={against}
              onChange={(e) => setAgainst(e.target.value)}
              placeholder="A team or a role — for example, “two members of the payments team”"
              className={cn(
                'w-full rounded-md border bg-background px-2.5 py-1.5 text-xs outline-none focus:ring-2 focus:ring-ring',
                namesSomeone ? 'border-medium' : 'border-border',
              )}
            />
          </Field>

          <Field label="Your identity">
            <div className="space-y-1.5">
              <Radio
                active={anonymous}
                onClick={() => {
                  setAnonymous(true)
                  setIdentityHeld(false)
                }}
                title="Report anonymously"
                detail="Nothing about you is captured. We can only reach you through the reference code."
              />
              <Radio
                active={!anonymous}
                onClick={() => {
                  setAnonymous(false)
                  setIdentityHeld(true)
                }}
                title="Identify myself to the ethics office"
                detail="Your identity is sealed with the Head of Compliance and can only be unsealed jointly with the Audit Committee chair. It is never shown on the case."
              />
            </div>
          </Field>

          {gaps.length > 0 && (
            <ul className="space-y-0.5 rounded-md border border-medium/40 bg-medium-soft/30 px-2.5 py-2">
              {gaps.map((g) => (
                <li key={g} className="text-2xs text-foreground">
                  {g}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </Drawer>
  )
}

/** A crude guard against a reporter typing a colleague's name into the intake —
 *  enough to prompt, not enough to block a legitimate description. */
function reportsAName(text: string, _reports: WhistleblowerReport[]): boolean {
  const words = text.trim().split(/\s+/)
  return words.length >= 2 && words.slice(0, 2).every((w) => /^[A-Z][a-z]{2,}$/.test(w))
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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-1 text-2xs font-medium uppercase tracking-wide text-muted-foreground">{label}</div>
      {children}
    </div>
  )
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'rounded-md border px-2.5 py-1 text-2xs font-medium transition-colors',
        active ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-background text-muted-foreground hover:text-foreground',
      )}
    >
      {children}
    </button>
  )
}

function Radio({ active, onClick, title, detail }: { active: boolean; onClick: () => void; title: string; detail: string }) {
  return (
    <button
      onClick={onClick}
      className={cn('flex w-full items-start gap-2 rounded-md border px-2.5 py-2 text-left', active ? 'border-primary bg-info-soft/30' : 'border-border')}
    >
      <span className={cn('mt-0.5 size-3 shrink-0 rounded-full border-2', active ? 'border-primary bg-primary' : 'border-border')} />
      <span className="min-w-0">
        <span className="block text-xs font-medium text-foreground">{title}</span>
        <span className="block text-2xs text-muted-foreground">{detail}</span>
      </span>
    </button>
  )
}
