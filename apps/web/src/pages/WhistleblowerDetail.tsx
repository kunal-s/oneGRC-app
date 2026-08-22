import * as React from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  ArrowUpRight,
  BellRing,
  EyeOff,
  Lock,
  MessageSquare,
  ShieldAlert,
  ShieldCheck,
  UserX,
} from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import { StatusChip } from '@/components/StatusChip'
import { SeverityBadge } from '@/components/SeverityBadge'
import { Avatar } from '@/components/Avatar'
import { Button } from '@/components/ui/Button'
import { Drawer } from '@/components/Drawer'
import { CrossRefPanel } from '@/components/CrossRefPanel'
import { EvidenceList } from '@/components/EvidenceList'
import { cn } from '@/lib/utils'
import { personName, PEOPLE_BY_ID, PEOPLE } from '@/data/people'
import { fmtDate, fmtIST, fmtRelative, NOW_MS } from '@/lib/time'
import { useApp } from '@/store'
import { useCanAct } from '@/lib/gating'
import { useEffectiveReport } from '@/lib/effective'
import { accessTo, maskedActor, outcomeTone, remediationDays } from '@/lib/investigations'
import {
  WB_STAGES,
  acknowledgeState,
  daysOpen,
  feedbackState,
  isOpen,
  retaliationState,
  slaTone,
  stageTone,
  wbLadder,
  wbStageIndex,
} from '@/lib/whistleblower'
import { WORLD } from '@/data'
import { ComingSoon } from './ComingSoon'
import type { FraudScheme, Severity, WbOutcome } from '@/types'

const SCHEMES: FraudScheme[] = [
  'Asset misappropriation',
  'Corruption',
  'Financial statement fraud',
  'Cyber-enabled fraud',
  'Payroll & expenses',
  'Procurement fraud',
  'Identity & subscriber fraud',
]

export function WhistleblowerDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const role = useApp((s) => s.role)
  const selfId = useApp((s) => s.personId)
  const auditLog = useApp((s) => s.auditLog)
  const pushToast = useApp((s) => s.pushToast)
  const acknowledgeReport = useApp((s) => s.acknowledgeReport)
  const triageReport = useApp((s) => s.triageReport)
  const messageReporter = useApp((s) => s.messageReporter)
  const reviewRetaliation = useApp((s) => s.reviewRetaliation)
  const closeReport = useApp((s) => s.closeReport)
  const raiseCaseRemediation = useApp((s) => s.raiseCaseRemediation)
  const linkCaseToRisk = useApp((s) => s.linkCaseToRisk)

  const report = useEffectiveReport(id ?? '')
  const [convert, setConvert] = React.useState(false)
  const [closing, setClosing] = React.useState(false)
  const [remediate, setRemediate] = React.useState(false)
  const [message, setMessage] = React.useState('')

  const canTriage = useCanAct({ kind: 'wb.triage' })
  const canInvestigate = useCanAct({ kind: 'wb.investigate' })
  const canClose = useCanAct({ kind: 'wb.close', makerId: report?.investigator })
  const canUnseal = useCanAct({ kind: 'wb.unseal' })

  if (!report) return <ComingSoon title="Report not found" />

  const verdict = accessTo(report, selfId, role)
  if (!verdict.canOpen) {
    return (
      <div>
        <button onClick={() => navigate('/whistleblower')} className="mb-3 inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-3.5" /> Speak-up
        </button>
        <div className="card-surface flex flex-col items-center gap-2 px-4 py-16 text-center">
          <Lock className="size-7 text-muted-foreground" />
          <div className="text-sm font-medium text-foreground">
            {verdict.canList ? `${report.reference} is sealed to you` : 'This case is not available to you'}
          </div>
          <p className="max-w-md text-xs text-muted-foreground">{verdict.reason}</p>
          {verdict.canList && (
            <div className="mt-2 flex items-center gap-2">
              <StatusChip status={report.stage} tone={stageTone(report.stage)} />
              <span className="text-2xs tnum text-muted-foreground">received {fmtRelative(report.receivedAt)}</span>
            </div>
          )}
        </div>
      </div>
    )
  }

  const ack = acknowledgeState(report)
  const fb = feedbackState(report)
  const ret = retaliationState(report)
  const ladder = wbLadder(report)
  const fired = ladder.filter((e) => e.fired)
  const trail = auditLog.filter((e) => e.entityId === report.id)
  const stageIdx = wbStageIndex(report.stage)

  return (
    <div>
      <button onClick={() => navigate('/whistleblower')} className="mb-3 inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-3.5" /> Speak-up
      </button>

      <PageHeader
        eyebrow={
          <span className="inline-flex items-center gap-1.5">
            {report.anonymous && <EyeOff className="size-3.5 text-muted-foreground" />}
            <span className="font-mono text-info">{report.reference}</span>
            <span className="text-muted-foreground">· {report.channel}</span>
          </span>
        }
        title={report.category}
        description={`Received ${fmtDate(report.receivedAt)} · ${daysOpen(report)} days ${isOpen(report) ? 'open' : 'to close'} · concerns ${report.allegationAgainst}`}
        actions={
          <div className="flex items-center gap-2">
            <SeverityBadge severity={report.severity} />
            <StatusChip status={report.stage} tone={stageTone(report.stage)} />
            {report.outcome && <StatusChip status={report.outcome} tone={outcomeTone(report.outcome)} />}
          </div>
        }
      />

      {/* the confidentiality banner is the first thing on the page, deliberately */}
      <div className="mb-4 rounded-lg border border-info/30 bg-info-soft/25 px-3 py-2">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
          <span className="inline-flex items-center gap-1.5 text-2xs font-medium text-info">
            <Lock className="size-3.5" /> Restricted
          </span>
          <span className="text-2xs text-foreground">
            Open to {report.accessList.map((p) => personName(p)).join(', ')}
          </span>
          {report.identity ? (
            <span className="inline-flex items-center gap-1 rounded bg-background px-1.5 py-0.5 text-2xs text-foreground">
              <ShieldCheck className="size-3 text-ok" />
              Identity sealed with {personName(report.identity.heldBy)} — unsealing needs {report.identity.unsealableBy.map(personName).join(' + ')}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded bg-background px-1.5 py-0.5 text-2xs text-foreground">
              <EyeOff className="size-3 text-muted-foreground" /> Anonymous — no identity is held
            </span>
          )}
          {report.recusals.length > 0 && (
            <span className="inline-flex items-center gap-1 rounded bg-medium-soft px-1.5 py-0.5 text-2xs text-medium">
              <UserX className="size-3" /> Recused: {report.recusals.map(personName).join(', ')}
            </span>
          )}
        </div>
      </div>

      {/* stage ribbon */}
      <div className="mb-4 flex flex-wrap items-center gap-1">
        {WB_STAGES.map((st, i) => (
          <span
            key={st}
            className={cn(
              'rounded-md border px-2 py-1 text-2xs font-medium',
              report.stage === st
                ? 'border-primary bg-primary text-primary-foreground'
                : i < stageIdx
                  ? 'border-ok/40 bg-ok-soft/40 text-ok'
                  : 'border-dashed border-border text-muted-foreground',
            )}
          >
            {st}
          </span>
        ))}
        {report.stage === 'Rejected' && <StatusChip status="Rejected at triage" tone="neutral" />}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
        <div className="space-y-4">
          {/* the report */}
          <div className="card-surface p-4">
            <h2 className="mb-2 text-sm font-semibold text-foreground">The report, as received</h2>
            <p className="whitespace-pre-line rounded-md border border-border bg-muted/30 px-3 py-2 text-xs leading-relaxed text-foreground">
              {report.summary}
            </p>
            <p className="mt-2 text-2xs text-muted-foreground">
              Held as written. Metadata was stripped at intake — no IP address, no device, no timestamp beyond the date of
              receipt.
            </p>
          </div>

          {/* two-way contact */}
          <div className="card-surface p-4">
            <div className="mb-2 flex items-center gap-1.5">
              <MessageSquare className="size-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold text-foreground">Correspondence through {report.reference}</h2>
              <span className="ml-auto text-2xs tnum text-muted-foreground">{report.messages.length}</span>
            </div>
            <div className="space-y-2">
              {report.messages.length === 0 ? (
                <p className="rounded-md border border-dashed border-medium/50 bg-medium-soft/20 px-2.5 py-2 text-xs text-foreground">
                  Nothing has been sent to the reporter. An unacknowledged report is a channel nobody uses twice.
                </p>
              ) : (
                report.messages.map((m, i) => (
                  <div
                    key={i}
                    className={cn(
                      'rounded-md border px-2.5 py-2',
                      m.from === 'Reporter' ? 'border-info/30 bg-info-soft/20' : 'border-border bg-background',
                    )}
                  >
                    <div className="mb-0.5 flex items-center gap-2">
                      <span className="text-2xs font-semibold text-foreground">{m.from}</span>
                      <span className="text-2xs tnum text-muted-foreground">{fmtDate(m.at)}</span>
                    </div>
                    <p className="text-xs leading-relaxed text-foreground">{m.text}</p>
                  </div>
                ))
              )}
            </div>
            {isOpen(report) && canInvestigate && (
              <div className="mt-2 flex gap-2">
                <input
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Send an update to the reporter — they see it against the reference code"
                  className="flex-1 rounded-md border border-border bg-background px-2.5 py-1.5 text-xs outline-none focus:ring-2 focus:ring-ring"
                />
                <Button
                  size="sm"
                  variant="outline"
                  disabled={!message.trim()}
                  onClick={() => {
                    messageReporter(report.id, message.trim())
                    setMessage('')
                    pushToast({ title: 'Update sent', description: `Delivered against ${report.reference}.`, variant: 'success' })
                  }}
                >
                  Send
                </Button>
              </div>
            )}
          </div>

          {/* the action plan — the shared engine */}
          <div className="card-surface p-4">
            <div className="mb-2 flex items-center gap-1.5">
              <h2 className="text-sm font-semibold text-foreground">Action plan</h2>
              <span className="text-2xs text-muted-foreground">tracked in Issues &amp; Remediation</span>
              {isOpen(report) && canInvestigate && (
                <Button size="sm" variant="outline" className="ml-auto" onClick={() => setRemediate(true)}>
                  Raise remediation
                </Button>
              )}
            </div>
            {report.linkedIssueIds.length > 0 ? (
              <div className="space-y-1">
                {report.linkedIssueIds.map((iid) => (
                  <button
                    key={iid}
                    onClick={() => navigate(`/issues/${iid}`)}
                    className="group flex w-full items-center gap-2 rounded-md border border-border bg-background px-2.5 py-1.5 text-left hover:border-info/40"
                  >
                    <span className="font-mono text-2xs font-semibold text-info">{iid}</span>
                    <span className="min-w-0 flex-1 truncate text-xs text-foreground">Remediation from this investigation</span>
                    <ArrowUpRight className="size-3 shrink-0 text-muted-foreground opacity-0 group-hover:opacity-100" />
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                No remediation raised yet. A substantiated report that changes nothing is a report that was not acted on.
              </p>
            )}
          </div>

          {report.evidenceIds.length > 0 && (
            <div className="card-surface p-4">
              <h2 className="mb-2 text-sm font-semibold text-foreground">Investigation file</h2>
              <EvidenceList ids={report.evidenceIds} />
            </div>
          )}

          {ladder.length > 0 && (
            <div className="card-surface p-4">
              <div className="mb-2 flex items-center justify-between">
                <h2 className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                  <BellRing className="size-4 text-info" /> Response chasing
                </h2>
                <span className="text-2xs tnum text-muted-foreground">
                  {fired.length} of {ladder.length} rungs fired
                </span>
              </div>
              <ol className="grid grid-cols-1 gap-1 sm:grid-cols-2">
                {ladder.map((e, i) => (
                  <li key={i} className={cn('flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-2xs', e.fired ? 'border-border bg-muted/40' : 'border-dashed border-border')}>
                    <span className={cn('rounded px-1.5 py-0 font-semibold', e.fired ? 'bg-ok-soft text-ok' : 'bg-muted text-muted-foreground')}>
                      {e.fired ? 'Fired' : 'Scheduled'}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-foreground">
                      {e.kind === 'reminder' ? `Reminder to ${maskedActor(e.target)}` : `Escalate to ${e.targetRole}`} · {e.intervalLabel}
                    </span>
                    <span className="shrink-0 tnum text-muted-foreground" title={fmtIST(e.at)}>
                      {fmtDate(e.at)}
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {report.closureNote && (
            <div className="card-surface p-4">
              <h2 className="mb-2 text-sm font-semibold text-foreground">Closure</h2>
              <p className="rounded-md border border-border bg-muted/30 px-3 py-2 text-xs leading-relaxed text-foreground">{report.closureNote}</p>
              <p className="mt-1 text-2xs text-muted-foreground">
                Closed {report.closedOn ? fmtDate(report.closedOn) : ''} · substantive response delivered to the reporter against{' '}
                {report.reference}
              </p>
            </div>
          )}

          {trail.length > 0 && (
            <div className="card-surface p-4">
              <h2 className="mb-2 text-sm font-semibold text-foreground">Activity this session</h2>
              <div className="space-y-1">
                {trail.map((e) => (
                  <div key={e.id} className="flex items-start gap-2 rounded-md border border-border px-2.5 py-1.5">
                    <Avatar id={e.actor} size={16} />
                    <div className="min-w-0 flex-1">
                      <p className="text-2xs text-foreground">{e.action}</p>
                      {e.detail && <p className="text-2xs text-muted-foreground">{e.detail}</p>}
                    </div>
                    <span className="shrink-0 text-2xs text-muted-foreground">{fmtRelative(e.at)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-4">
          {/* the two clocks */}
          <div className="card-surface p-4">
            <h3 className="mb-2 text-sm font-semibold text-foreground">Response duty</h3>
            <div className="space-y-2">
              <Clock label="Acknowledgement" state={ack} due={report.acknowledgeBy} done={report.acknowledgedOn} />
              <Clock label="Substantive response" state={fb} due={report.feedbackBy} done={report.closedOn} />
            </div>
            <p className="mt-2 border-t border-border pt-2 text-2xs text-muted-foreground">
              Companies Act 2013 s.177 vigil mechanism — the Audit Committee chair has direct access to this case.
            </p>
          </div>

          <div className="card-surface p-4">
            <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-foreground">
              <ShieldAlert className="size-4 text-muted-foreground" /> Reporter protection
            </h3>
            <div className="flex items-center gap-2">
              <StatusChip
                status={ret}
                tone={ret === 'Reviewed' ? 'ok' : ret === 'Review due' ? 'danger' : ret === 'Watch active' ? 'warn' : 'neutral'}
              />
              {report.retaliationReviewedOn && (
                <span className="text-2xs tnum text-muted-foreground">last checked {fmtDate(report.retaliationReviewedOn)}</span>
              )}
            </div>
            {report.retaliationWatch && canInvestigate && (
              <Button
                size="sm"
                variant="outline"
                className="mt-2 w-full"
                onClick={() => {
                  reviewRetaliation(report.id)
                  pushToast({ title: 'Retaliation check recorded', description: 'The watch continues for a further 90 days.', variant: 'success' })
                }}
              >
                Record a retaliation check
              </Button>
            )}
          </div>

          {/* the actions available at this stage */}
          <div className="card-surface p-4">
            <h3 className="mb-2 text-sm font-semibold text-foreground">Handling</h3>
            <div className="space-y-2">
              <Attr label="Triaged by">{report.triagedBy ? personName(report.triagedBy) : '—'}</Attr>
              <Attr label="Investigator">{report.investigator ? personName(report.investigator) : 'Not yet assigned'}</Attr>
              <Attr label="Channel">{report.channel}</Attr>
            </div>
            <div className="mt-3 space-y-1.5">
              {!report.acknowledgedOn && (
                <Button
                  size="sm"
                  className="w-full"
                  disabled={!canTriage}
                  title={canTriage ? undefined : 'Acknowledgement is the ethics office’s act.'}
                  onClick={() => {
                    acknowledgeReport(report.id)
                    pushToast({ title: 'Reporter acknowledged', description: `Sent against ${report.reference}.`, variant: 'success' })
                  }}
                >
                  Acknowledge the reporter
                </Button>
              )}
              {(report.stage === 'Received' || report.stage === 'Acknowledged' || report.stage === 'Under triage') && (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full"
                    disabled={!canTriage}
                    title={canTriage ? undefined : 'Triage is the ethics office’s act.'}
                    onClick={() => {
                      triageReport(report.id, {
                        accept: true,
                        investigator: report.recusals.includes('sunita') ? 'anjali' : 'sunita',
                        note: 'Assessed and referred for a formal investigation, handled outside the subject’s reporting line.',
                      })
                      pushToast({ title: 'Referred for investigation', description: `${report.reference} assigned.`, variant: 'success' })
                    }}
                  >
                    Refer for investigation
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full"
                    disabled={!canTriage}
                    onClick={() => {
                      triageReport(report.id, {
                        accept: false,
                        note: 'Out of scope for the vigil mechanism and referred to the appropriate procedure. Protection against detriment continues to apply.',
                      })
                      pushToast({ title: 'Closed at triage', description: `${report.reference} — out of scope.`, variant: 'default' })
                    }}
                  >
                    Close at triage — out of scope
                  </Button>
                </>
              )}
              {isOpen(report) && !report.linkedFraudCaseId && report.stage !== 'Received' && (
                <Button size="sm" variant="outline" className="w-full" disabled={!canTriage} onClick={() => setConvert(true)}>
                  Refer to the fraud module
                </Button>
              )}
              {report.linkedFraudCaseId && (
                <Button size="sm" variant="outline" className="w-full" onClick={() => navigate(`/fraud/${report.linkedFraudCaseId}`)}>
                  Open {report.linkedFraudCaseId} <ArrowUpRight className="size-3.5" />
                </Button>
              )}
              {isOpen(report) && (
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full"
                  disabled={!canClose}
                  title={canClose ? undefined : 'Closing is a sign-off; the investigator cannot close their own case.'}
                  onClick={() => setClosing(true)}
                >
                  Close with an outcome
                </Button>
              )}
              {report.identity && (
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full"
                  disabled
                  title={
                    canUnseal
                      ? 'Unsealing needs both named custodians acting together, which this prototype does not simulate.'
                      : 'Only the Compliance Officer and the Audit Committee chair may unseal, and only jointly.'
                  }
                >
                  <Lock className="size-3.5" /> Identity sealed
                </Button>
              )}
            </div>
          </div>

          <CrossRefPanel
            groups={[
              { label: 'Risks this fed', ids: report.linkedRiskIds },
              { label: 'Remediation raised', ids: report.linkedIssueIds },
              { label: 'Fraud case', ids: report.linkedFraudCaseId ? [report.linkedFraudCaseId] : [] },
            ]}
          />
        </div>
      </div>

      {/* ── conversion ── */}
      <Drawer
        open={convert}
        onClose={() => setConvert(false)}
        title="Refer to the fraud module"
        subtitle={`${report.reference} · the reporter's identity does not travel`}
        width="max-w-xl"
      >
        <ConvertForm report={report} onDone={() => setConvert(false)} />
      </Drawer>

      {/* ── remediation ── */}
      <Drawer open={remediate} onClose={() => setRemediate(false)} title="Raise remediation" subtitle="Tracked in the one Issues register" width="max-w-lg">
        <RemediationForm
          onSubmit={(args) => {
            const issueId = raiseCaseRemediation(report.id, args)
            setRemediate(false)
            if (issueId) pushToast({ title: 'Remediation raised', description: `${issueId} — due in ${remediationDays(args.severity)} days.`, variant: 'success' })
          }}
        />
      </Drawer>

      {/* ── closure ── */}
      <Drawer open={closing} onClose={() => setClosing(false)} title="Close the report" subtitle="The reporter gets this as their substantive response" width="max-w-xl">
        <CloseForm
          report={report}
          onSubmit={(outcome, note, riskId) => {
            if (riskId) linkCaseToRisk(report.id, riskId)
            closeReport(report.id, { outcome, note })
            setClosing(false)
            pushToast({ title: 'Report closed', description: `${report.reference} — ${outcome}.`, variant: 'success' })
          }}
        />
      </Drawer>
    </div>
  )
}

// ── forms ────────────────────────────────────────────────────────────────────

function ConvertForm({ report, onDone }: { report: ReturnType<typeof useEffectiveReport> & object; onDone: () => void }) {
  const navigate = useNavigate()
  const convertReportToFraud = useApp((s) => s.convertReportToFraud)
  const pushToast = useApp((s) => s.pushToast)
  const [title, setTitle] = React.useState(`Allegation from ${report.reference} — ${report.category.toLowerCase()}`)
  const [scheme, setScheme] = React.useState<FraudScheme>('Asset misappropriation')
  const [loss, setLoss] = React.useState(0)
  const [investigator, setInvestigator] = React.useState('lakshmi')

  return (
    <div className="space-y-3">
      <div className="rounded-md border border-info/30 bg-info-soft/25 px-2.5 py-2 text-2xs text-foreground">
        The new case carries reference <span className="font-mono font-semibold">{report.reference}</span> and the allegation as
        written. It does not carry, and cannot reach, the reporter — the fraud investigator sees a code, not a person.
      </div>
      <label className="block">
        <span className="mb-1 block text-2xs font-medium uppercase tracking-wide text-muted-foreground">Case title</span>
        <input value={title} onChange={(e) => setTitle(e.target.value)} className="w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-xs outline-none focus:ring-2 focus:ring-ring" />
      </label>
      <div>
        <span className="mb-1 block text-2xs font-medium uppercase tracking-wide text-muted-foreground">Scheme</span>
        <div className="flex flex-wrap gap-1.5">
          {SCHEMES.map((s) => (
            <button
              key={s}
              onClick={() => setScheme(s)}
              className={cn(
                'rounded-md border px-2 py-1 text-2xs font-medium',
                scheme === s ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-background text-muted-foreground',
              )}
            >
              {s}
            </button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="mb-1 block text-2xs font-medium uppercase tracking-wide text-muted-foreground">Estimated exposure (₹ lakh)</span>
          <input
            type="number"
            min={0}
            step={0.1}
            value={loss}
            onChange={(e) => setLoss(Math.max(0, Number(e.target.value)))}
            className="w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-xs tnum outline-none focus:ring-2 focus:ring-ring"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-2xs font-medium uppercase tracking-wide text-muted-foreground">Investigator</span>
          <select
            value={investigator}
            onChange={(e) => setInvestigator(e.target.value)}
            className="w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-xs outline-none focus:ring-2 focus:ring-ring"
          >
            {PEOPLE.filter((p) => !report.recusals.includes(p.id) && (p.role === 'AUDITOR' || p.role === 'CCO' || p.role === 'RISK')).map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} — {p.title}
              </option>
            ))}
          </select>
        </label>
      </div>
      {report.recusals.length > 0 && (
        <p className="text-2xs text-medium">
          {report.recusals.map(personName).join(', ')} {report.recusals.length === 1 ? 'is' : 'are'} recused and cannot be
          chosen.
        </p>
      )}
      <Button
        className="w-full"
        disabled={!title.trim()}
        onClick={() => {
          const caseId = convertReportToFraud(report.id, { title: title.trim(), scheme, estimatedLossLakh: loss, investigator })
          onDone()
          if (caseId) {
            pushToast({ title: 'Fraud case opened', description: `${caseId} — the reporter's identity was not carried across.`, variant: 'success' })
            navigate(`/fraud/${caseId}`)
          }
        }}
      >
        Open the fraud case
      </Button>
    </div>
  )
}

function RemediationForm({ onSubmit }: { onSubmit: (args: { title: string; owner: string; severity: Severity; linkedControls?: string[] }) => void }) {
  const [title, setTitle] = React.useState('')
  const [owner, setOwner] = React.useState('rohan')
  const [severity, setSeverity] = React.useState<Severity>('High')
  return (
    <div className="space-y-3">
      <label className="block">
        <span className="mb-1 block text-2xs font-medium uppercase tracking-wide text-muted-foreground">What has to change</span>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Make the four-eyes check on bank-mandate changes preventive"
          className="w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-xs outline-none focus:ring-2 focus:ring-ring"
        />
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="mb-1 block text-2xs font-medium uppercase tracking-wide text-muted-foreground">Owner</span>
          <select value={owner} onChange={(e) => setOwner(e.target.value)} className="w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-xs outline-none focus:ring-2 focus:ring-ring">
            {PEOPLE.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
        <div>
          <span className="mb-1 block text-2xs font-medium uppercase tracking-wide text-muted-foreground">Severity</span>
          <div className="flex flex-wrap gap-1">
            {(['Critical', 'High', 'Medium', 'Low'] as Severity[]).map((s) => (
              <button
                key={s}
                onClick={() => setSeverity(s)}
                className={cn('rounded border px-1.5 py-1 text-2xs font-medium', severity === s ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-background text-muted-foreground')}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>
      <p className="text-2xs text-muted-foreground">Due in {remediationDays(severity)} days, tracked in Issues &amp; Remediation like any other finding.</p>
      <Button className="w-full" disabled={!title.trim()} onClick={() => onSubmit({ title: title.trim(), owner, severity })}>
        Raise the action
      </Button>
    </div>
  )
}

function CloseForm({
  report,
  onSubmit,
}: {
  report: NonNullable<ReturnType<typeof useEffectiveReport>>
  onSubmit: (outcome: WbOutcome, note: string, riskId?: string) => void
}) {
  const [outcome, setOutcome] = React.useState<WbOutcome>('Substantiated')
  const [note, setNote] = React.useState('')
  const [riskId, setRiskId] = React.useState('')
  const substantiated = outcome === 'Substantiated' || outcome === 'Partially substantiated'
  const candidates = WORLD.risks.filter((r) => r.domain === 'Operational' || r.domain === 'Compliance').slice(0, 25)

  return (
    <div className="space-y-3">
      <div>
        <span className="mb-1 block text-2xs font-medium uppercase tracking-wide text-muted-foreground">Outcome</span>
        <div className="flex flex-wrap gap-1.5">
          {(['Substantiated', 'Partially substantiated', 'Unsubstantiated', 'Out of scope', 'Withdrawn'] as WbOutcome[]).map((o) => (
            <button
              key={o}
              onClick={() => setOutcome(o)}
              className={cn('rounded-md border px-2 py-1 text-2xs font-medium', outcome === o ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-background text-muted-foreground')}
            >
              {o}
            </button>
          ))}
        </div>
      </div>
      {substantiated && (
        <label className="block">
          <span className="mb-1 block text-2xs font-medium uppercase tracking-wide text-muted-foreground">Push into the risk register</span>
          <select value={riskId} onChange={(e) => setRiskId(e.target.value)} className="w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-xs outline-none focus:ring-2 focus:ring-ring">
            <option value="">Do not link a risk</option>
            {candidates.map((r) => (
              <option key={r.id} value={r.id}>
                {r.id} — {r.title}
              </option>
            ))}
          </select>
          <span className="mt-1 block text-2xs text-muted-foreground">
            A substantiated report is a realised event. Linking it puts a dated entry on the risk&apos;s own timeline.
          </span>
        </label>
      )}
      <label className="block">
        <span className="mb-1 block text-2xs font-medium uppercase tracking-wide text-muted-foreground">
          Substantive response to the reporter
        </span>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={4}
          placeholder="What was found, what has changed as a result, and confirmation that protection continues."
          className="w-full resize-none rounded-md border border-border bg-background px-2.5 py-1.5 text-xs outline-none focus:ring-2 focus:ring-ring"
        />
      </label>
      <p className="text-2xs text-muted-foreground">
        Sent against {report.reference} · {report.messages.length} message{report.messages.length === 1 ? '' : 's'} exchanged so
        far.
      </p>
      <Button className="w-full" disabled={note.trim().length < 20} onClick={() => onSubmit(outcome, note.trim(), riskId || undefined)}>
        Close and respond
      </Button>
    </div>
  )
}

// ── bits ─────────────────────────────────────────────────────────────────────

function Clock({ label, state, due, done }: { label: string; state: ReturnType<typeof acknowledgeState>; due: string; done?: string }) {
  const days = Math.round((new Date(due).getTime() - NOW_MS) / 86400000)
  return (
    <div className="flex items-center gap-2 rounded-md border border-border px-2.5 py-1.5">
      <span className="min-w-0 flex-1 truncate text-2xs text-foreground">{label}</span>
      <StatusChip status={state} tone={slaTone(state)} />
      <span className="shrink-0 text-2xs tnum text-muted-foreground">
        {done ? fmtDate(done) : days >= 0 ? `${days}d left` : `${Math.abs(days)}d over`}
      </span>
    </div>
  )
}

function Attr({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-24 shrink-0 text-2xs uppercase tracking-wide text-muted-foreground">{label}</span>
      <span className="min-w-0 flex-1 truncate text-xs text-foreground">{children}</span>
    </div>
  )
}

export { PEOPLE_BY_ID }
