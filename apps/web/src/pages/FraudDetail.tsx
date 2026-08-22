import * as React from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  ArrowUpRight,
  BellRing,
  EyeOff,
  Gavel,
  IndianRupee,
  Landmark,
  Lock,
  Radar,
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
import { personName, PEOPLE } from '@/data/people'
import { fmtDate, fmtIST, fmtRelative } from '@/lib/time'
import { useApp } from '@/store'
import { useCanAct } from '@/lib/gating'
import { useEffectiveFraudCase } from '@/lib/effective'
import { accessTo, outcomeTone, remediationDays } from '@/lib/investigations'
import {
  FRAUD_STAGES,
  caseAge,
  fraudLadder,
  fraudStageIndex,
  fraudStageTone,
  inrLakh,
  investigationDueBy,
  isOpenCase,
  isOverdue,
  netLossLakh,
  recoveryRate,
  trackState,
  trackTone,
} from '@/lib/fraud'
import { WORLD } from '@/data'
import { ComingSoon } from './ComingSoon'
import type { FraudOutcome, FraudStage, Severity } from '@/types'

export function FraudDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const role = useApp((s) => s.role)
  const selfId = useApp((s) => s.personId)
  const auditLog = useApp((s) => s.auditLog)
  const pushToast = useApp((s) => s.pushToast)
  const advanceFraudCase = useApp((s) => s.advanceFraudCase)
  const fileFraudTrack = useApp((s) => s.fileFraudTrack)
  const recordFraudLoss = useApp((s) => s.recordFraudLoss)
  const closeFraudCase = useApp((s) => s.closeFraudCase)
  const raiseCaseRemediation = useApp((s) => s.raiseCaseRemediation)
  const linkCaseToRisk = useApp((s) => s.linkCaseToRisk)

  const c = useEffectiveFraudCase(id ?? '')
  const [loss, setLoss] = React.useState(false)
  const [remediate, setRemediate] = React.useState(false)
  const [closing, setClosing] = React.useState(false)

  const canInvestigate = useCanAct({ kind: 'fraud.investigate' })
  const canFile = useCanAct({ kind: 'fraud.fileTrack', makerId: c?.investigator })
  const canClose = useCanAct({ kind: 'fraud.close', makerId: c?.investigator })

  if (!c) return <ComingSoon title="Case not found" />

  const verdict = accessTo(c, selfId, role)
  if (!verdict.canOpen) {
    return (
      <div>
        <button onClick={() => navigate('/fraud')} className="mb-3 inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-3.5" /> Fraud cases
        </button>
        <div className="card-surface flex flex-col items-center gap-2 px-4 py-16 text-center">
          <Lock className="size-7 text-muted-foreground" />
          <div className="text-sm font-medium text-foreground">{verdict.canList ? `${c.id} is sealed to you` : 'This case is not available to you'}</div>
          <p className="max-w-md text-xs text-muted-foreground">{verdict.reason}</p>
        </div>
      </div>
    )
  }

  const ladder = fraudLadder(c)
  const fired = ladder.filter((e) => e.fired)
  const trail = auditLog.filter((e) => e.entityId === c.id)
  const stageIdx = fraudStageIndex(c.stage)
  const nextStage = FRAUD_STAGES[Math.min(FRAUD_STAGES.length - 2, stageIdx + 1)] as FraudStage

  return (
    <div>
      <button onClick={() => navigate('/fraud')} className="mb-3 inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-3.5" /> Fraud cases
      </button>

      <PageHeader
        eyebrow={
          <span className="inline-flex items-center gap-1.5">
            <span className="font-mono text-info">{c.id}</span>
            <span className="text-muted-foreground">· {c.scheme}</span>
          </span>
        }
        title={c.title}
        description={`Detected ${fmtDate(c.detectedOn)} by ${c.detection.toLowerCase()} · ${caseAge(c)} days ${isOpenCase(c) ? 'open' : 'to close'} · investigation target ${fmtDate(investigationDueBy(c))}`}
        actions={
          <div className="flex items-center gap-2">
            <SeverityBadge severity={c.severity} />
            <StatusChip status={c.stage} tone={fraudStageTone(c.stage)} />
            {c.outcome && <StatusChip status={c.outcome} tone={outcomeTone(c.outcome)} />}
          </div>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 rounded-lg border border-border bg-muted/40 px-3 py-2">
        {c.restricted ? (
          <span className="inline-flex items-center gap-1.5 text-2xs font-medium text-info">
            <Lock className="size-3.5" /> Restricted to the case team
          </span>
        ) : (
          <span className="text-2xs text-muted-foreground">Unrestricted — closed with no internal subject named.</span>
        )}
        {c.whistleblowerRef && (
          <span className="inline-flex items-center gap-1 rounded bg-background px-1.5 py-0.5 text-2xs text-foreground">
            <EyeOff className="size-3 text-muted-foreground" />
            Opened from speak-up <span className="font-mono font-semibold">{c.whistleblowerRef}</span> — the reporter is not
            reachable from this case
          </span>
        )}
        {c.recusals.length > 0 && (
          <span className="inline-flex items-center gap-1 rounded bg-medium-soft px-1.5 py-0.5 text-2xs text-medium">
            <UserX className="size-3" /> Recused: {c.recusals.map(personName).join(', ')}
          </span>
        )}
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-1">
        {FRAUD_STAGES.map((st, i) => (
          <span
            key={st}
            className={cn(
              'rounded-md border px-2 py-1 text-2xs font-medium',
              c.stage === st ? 'border-primary bg-primary text-primary-foreground' : i < stageIdx ? 'border-ok/40 bg-ok-soft/40 text-ok' : 'border-dashed border-border text-muted-foreground',
            )}
          >
            {st}
          </span>
        ))}
        {isOverdue(c) && <StatusChip status="Past investigation target" tone="danger" />}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
        <div className="space-y-4">
          {/* indicators — what a fraud intake ingests instead of a narrative */}
          <div className="card-surface p-4">
            <div className="mb-2 flex items-center gap-1.5">
              <Radar className="size-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold text-foreground">Red flags</h2>
              <span className="ml-auto text-2xs tnum text-muted-foreground">{c.indicators.length}</span>
            </div>
            {c.indicators.length > 0 ? (
              <div className="space-y-1">
                {c.indicators.map((ind) => (
                  <div key={ind.label} className="flex flex-wrap items-center gap-2 rounded-md border border-border px-2.5 py-1.5">
                    <span className="min-w-0 flex-1 text-xs text-foreground">{ind.label}</span>
                    {ind.value && <span className="shrink-0 rounded bg-critical-soft px-1.5 py-0 text-2xs font-semibold tnum text-critical">{ind.value}</span>}
                    <span className="shrink-0 text-2xs text-muted-foreground">{ind.source}</span>
                    <span className="shrink-0 text-2xs tnum text-muted-foreground">{fmtDate(ind.observedOn)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="rounded-md border border-dashed border-border px-2.5 py-2 text-xs text-muted-foreground">
                No indicators captured yet — the case was opened from an allegation rather than from the data.
              </p>
            )}
          </div>

          {/* subjects, held by reference */}
          <div className="card-surface p-4">
            <h2 className="mb-2 text-sm font-semibold text-foreground">Subjects</h2>
            <div className="space-y-1">
              {c.subjects.map((sub) => (
                <div key={sub.ref} className="flex items-center gap-2 rounded-md border border-border px-2.5 py-1.5">
                  <span className="min-w-0 flex-1 truncate text-xs text-foreground">{sub.ref}</span>
                  <StatusChip status={sub.internal ? 'Internal' : 'External'} tone={sub.internal ? 'warn' : 'neutral'} />
                  {sub.suspended && <StatusChip status="Suspended from the workflow" tone="danger" />}
                </div>
              ))}
            </div>
            <p className="mt-2 text-2xs text-muted-foreground">
              Held by reference. A name enters the record only once an allegation is substantiated and the disciplinary process
              has run.
            </p>
          </div>

          {/* regulator tracks */}
          <div className="card-surface p-4">
            <h2 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-foreground">
              <Landmark className="size-4 text-muted-foreground" /> Regulatory notification
            </h2>
            <div className="space-y-1.5">
              {c.regulatoryTracks.map((t) => {
                const st = trackState(t)
                return (
                  <div key={t.regulator} className={cn('rounded-md border px-2.5 py-2', st === 'Breached' ? 'border-critical/40 bg-critical-soft/20' : st === 'Due' ? 'border-medium/40 bg-medium-soft/20' : 'border-border')}>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-medium text-foreground">{t.regulator}</span>
                      <StatusChip status={st} tone={trackTone(st)} />
                      {t.reference && <span className="font-mono text-2xs text-muted-foreground">{t.reference}</span>}
                      <span className="ml-auto text-2xs tnum text-muted-foreground">
                        {t.reportedOn ? `filed ${fmtDate(t.reportedOn)}` : t.dueBy ? `due ${fmtDate(t.dueBy)}` : ''}
                      </span>
                    </div>
                    <p className="mt-0.5 text-2xs text-muted-foreground">{t.basis}</p>
                    {st === 'Due' || st === 'Breached' ? (
                      <Button
                        size="sm"
                        variant="outline"
                        className="mt-1.5"
                        disabled={!canFile}
                        title={canFile ? undefined : 'Filing a notification is a sign-off; the investigator cannot file their own.'}
                        onClick={() => {
                          const ref = `${t.regulator.replace(/[^A-Z]/g, '') || 'REG'}/SPF/${c.id.replace(/\D/g, '')}/S1`
                          fileFraudTrack(c.id, t.regulator, ref)
                          pushToast({ title: `${t.regulator} notification filed`, description: ref, variant: 'success' })
                        }}
                      >
                        File the {t.regulator} notification
                      </Button>
                    ) : null}
                  </div>
                )
              })}
            </div>
          </div>

          {/* the shared action plan */}
          <div className="card-surface p-4">
            <div className="mb-2 flex items-center gap-1.5">
              <h2 className="text-sm font-semibold text-foreground">Action plan</h2>
              <span className="text-2xs text-muted-foreground">tracked in Issues &amp; Remediation</span>
              {isOpenCase(c) && canInvestigate && (
                <Button size="sm" variant="outline" className="ml-auto" onClick={() => setRemediate(true)}>
                  Raise remediation
                </Button>
              )}
            </div>
            {c.linkedIssueIds.length > 0 ? (
              <div className="space-y-1">
                {c.linkedIssueIds.map((iid) => (
                  <button
                    key={iid}
                    onClick={() => navigate(`/issues/${iid}`)}
                    className="group flex w-full items-center gap-2 rounded-md border border-border bg-background px-2.5 py-1.5 text-left hover:border-info/40"
                  >
                    <span className="font-mono text-2xs font-semibold text-info">{iid}</span>
                    <span className="min-w-0 flex-1 truncate text-xs text-foreground">Control action from this case</span>
                    <ArrowUpRight className="size-3 shrink-0 text-muted-foreground opacity-0 group-hover:opacity-100" />
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">No control action raised yet.</p>
            )}
          </div>

          {/* the investigation trail */}
          <div className="card-surface p-4">
            <h2 className="mb-2 text-sm font-semibold text-foreground">Investigation</h2>
            <ol className="space-y-0">
              {c.timeline.map((st, i) => (
                <li key={i} className="relative flex gap-3 pb-3 last:pb-0">
                  {i < c.timeline.length - 1 && <span className="absolute left-[9px] top-6 h-full w-px bg-border" />}
                  <Avatar id={st.actor} size={20} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs text-foreground">{st.action}</span>
                      <span className="text-2xs tnum text-muted-foreground" title={fmtIST(st.at)}>
                        {fmtDate(st.at)}
                      </span>
                    </div>
                    {st.note && <p className="mt-0.5 text-2xs text-muted-foreground">{st.note}</p>}
                  </div>
                </li>
              ))}
            </ol>
          </div>

          {c.evidenceIds.length > 0 && (
            <div className="card-surface p-4">
              <h2 className="mb-2 text-sm font-semibold text-foreground">Investigation file</h2>
              <EvidenceList ids={c.evidenceIds} />
            </div>
          )}

          {ladder.length > 0 && (
            <div className="card-surface p-4">
              <div className="mb-2 flex items-center justify-between">
                <h2 className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                  <BellRing className="size-4 text-info" /> Case chasing
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
                      {e.kind === 'reminder' ? `Reminder to ${personName(e.target)}` : `Escalate to ${e.targetRole}`} · {e.intervalLabel}
                    </span>
                    <span className="shrink-0 tnum text-muted-foreground">{fmtDate(e.at)}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {(c.closureNote || c.disciplinaryAction || c.recoveryAction) && (
            <div className="card-surface p-4">
              <h2 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-foreground">
                <Gavel className="size-4 text-muted-foreground" /> Outcome and action
              </h2>
              {c.closureNote && <p className="rounded-md border border-border bg-muted/30 px-3 py-2 text-xs leading-relaxed text-foreground">{c.closureNote}</p>}
              {c.disciplinaryAction && (
                <p className="mt-1.5 text-2xs text-foreground">
                  <span className="text-muted-foreground">Disciplinary · </span>
                  {c.disciplinaryAction}
                </p>
              )}
              {c.recoveryAction && (
                <p className="mt-1 text-2xs text-foreground">
                  <span className="text-muted-foreground">Recovery · </span>
                  {c.recoveryAction}
                </p>
              )}
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
          <div className="card-surface p-4">
            <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-foreground">
              <IndianRupee className="size-4 text-muted-foreground" /> Financial impact
            </h3>
            <div className="flex items-baseline gap-1.5">
              <span className={cn('text-2xl font-semibold tnum', netLossLakh(c) > 0 ? 'text-critical' : 'text-ok')}>{inrLakh(netLossLakh(c))}</span>
              <span className="text-2xs text-muted-foreground">net exposure</span>
            </div>
            <div className="mt-2 space-y-1 text-2xs">
              <Row label={c.confirmedLossLakh !== undefined ? 'Confirmed loss' : 'Estimated loss'} value={inrLakh(c.confirmedLossLakh ?? c.estimatedLossLakh)} />
              <Row label="Recovered" value={`${inrLakh(c.recoveredLakh ?? 0)} · ${recoveryRate(c)}%`} />
              <Row label="Basel category" value={c.lossCategory} />
              {c.accountingRef && <Row label="Accounting reference" value={c.accountingRef} />}
            </div>
            {isOpenCase(c) && canInvestigate && (
              <Button size="sm" variant="outline" className="mt-2 w-full" onClick={() => setLoss(true)}>
                Record confirmed loss and recovery
              </Button>
            )}
          </div>

          <div className="card-surface p-4">
            <h3 className="mb-2 text-sm font-semibold text-foreground">Case team</h3>
            <div className="space-y-2">
              <Person label="Investigator" id={c.investigator} />
              <Person label="Sponsor" id={c.sponsor} />
              <Row label="Detected by" value={c.detection} />
              {c.sourceRef && <Row label="Source record" value={c.sourceRef} />}
            </div>
            {isOpenCase(c) && (
              <div className="mt-3 space-y-1.5">
                {c.stage !== 'Recovery & action' && (
                  <Button
                    size="sm"
                    className="w-full"
                    disabled={!canInvestigate}
                    onClick={() => {
                      advanceFraudCase(c.id, nextStage)
                      pushToast({ title: `Case moved to ${nextStage}`, description: c.id, variant: 'success' })
                    }}
                  >
                    Advance to {nextStage}
                  </Button>
                )}
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
              </div>
            )}
          </div>

          <CrossRefPanel
            groups={[
              { label: 'Risks this realised', ids: c.linkedRiskIds },
              { label: 'Controls that failed', ids: c.linkedControls },
              { label: 'Remediation raised', ids: c.linkedIssueIds },
            ]}
          />
        </div>
      </div>

      <Drawer open={loss} onClose={() => setLoss(false)} title="Record the loss" subtitle="Feeds the same loss engine as an operational incident" width="max-w-lg">
        <LossForm
          initialGross={c.confirmedLossLakh ?? c.estimatedLossLakh}
          initialRecovered={c.recoveredLakh ?? 0}
          onSubmit={(args) => {
            recordFraudLoss(c.id, args)
            setLoss(false)
            pushToast({ title: 'Loss recorded', description: `Net ${inrLakh(args.confirmedLossLakh - args.recoveredLakh)} · ${c.lossCategory}.`, variant: 'success' })
          }}
        />
      </Drawer>

      <Drawer open={remediate} onClose={() => setRemediate(false)} title="Raise remediation" subtitle="Tracked in the one Issues register" width="max-w-lg">
        <FraudRemediationForm
          controls={c.linkedControls}
          onSubmit={(args) => {
            const issueId = raiseCaseRemediation(c.id, args)
            setRemediate(false)
            if (issueId) pushToast({ title: 'Remediation raised', description: `${issueId} — due in ${remediationDays(args.severity)} days.`, variant: 'success' })
          }}
        />
      </Drawer>

      <Drawer open={closing} onClose={() => setClosing(false)} title="Close the case" subtitle="Outcome, action taken, and the push into the risk register" width="max-w-xl">
        <FraudCloseForm
          suggestedRisks={c.linkedRiskIds}
          onSubmit={(args) => {
            if (args.riskId) linkCaseToRisk(c.id, args.riskId)
            closeFraudCase(c.id, { outcome: args.outcome, note: args.note, disciplinaryAction: args.disciplinary, recoveryAction: args.recovery })
            setClosing(false)
            pushToast({ title: 'Case closed', description: `${c.id} — ${args.outcome}.`, variant: 'success' })
          }}
        />
      </Drawer>
    </div>
  )
}

// ── forms ────────────────────────────────────────────────────────────────────

function LossForm({
  initialGross,
  initialRecovered,
  onSubmit,
}: {
  initialGross: number
  initialRecovered: number
  onSubmit: (args: { confirmedLossLakh: number; recoveredLakh: number; accountingRef?: string }) => void
}) {
  const [gross, setGross] = React.useState(initialGross)
  const [recovered, setRecovered] = React.useState(initialRecovered)
  const [ref, setRef] = React.useState('')
  const net = Math.max(0, gross - recovered)
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <Num label="Confirmed gross loss (₹ lakh)" value={gross} onChange={setGross} />
        <Num label="Recovered (₹ lakh)" value={recovered} onChange={setRecovered} />
      </div>
      <label className="block">
        <span className="mb-1 block text-2xs font-medium uppercase tracking-wide text-muted-foreground">Accounting reference</span>
        <input value={ref} onChange={(e) => setRef(e.target.value)} placeholder="JV-FY27-…" className="w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-xs outline-none focus:ring-2 focus:ring-ring" />
      </label>
      <div className="rounded-md border border-info/30 bg-info-soft/25 px-2.5 py-2 text-2xs text-foreground">
        Net loss <span className="font-semibold tnum">{inrLakh(net)}</span> — derived, never entered, so the case and the loss
        report cannot disagree.
      </div>
      <Button className="w-full" disabled={recovered > gross} title={recovered > gross ? 'Recovery cannot exceed the loss.' : undefined} onClick={() => onSubmit({ confirmedLossLakh: gross, recoveredLakh: recovered, accountingRef: ref.trim() || undefined })}>
        Record
      </Button>
    </div>
  )
}

function FraudRemediationForm({ controls, onSubmit }: { controls: string[]; onSubmit: (args: { title: string; owner: string; severity: Severity; linkedControls?: string[] }) => void }) {
  const [title, setTitle] = React.useState('')
  const [owner, setOwner] = React.useState('rohan')
  const [severity, setSeverity] = React.useState<Severity>('Critical')
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
      {controls.length > 0 && (
        <p className="text-2xs text-muted-foreground">
          Will be linked to {controls.slice(0, 3).join(', ')} — the controls this case says did not hold.
        </p>
      )}
      <Button className="w-full" disabled={!title.trim()} onClick={() => onSubmit({ title: title.trim(), owner, severity, linkedControls: controls })}>
        Raise the action
      </Button>
    </div>
  )
}

function FraudCloseForm({
  suggestedRisks,
  onSubmit,
}: {
  suggestedRisks: string[]
  onSubmit: (args: { outcome: FraudOutcome; note: string; disciplinary?: string; recovery?: string; riskId?: string }) => void
}) {
  const [outcome, setOutcome] = React.useState<FraudOutcome>('Substantiated')
  const [note, setNote] = React.useState('')
  const [disciplinary, setDisciplinary] = React.useState('')
  const [recovery, setRecovery] = React.useState('')
  const [riskId, setRiskId] = React.useState(suggestedRisks[0] ?? '')
  const candidates = WORLD.risks.filter((r) => r.domain === 'Operational' || r.domain === 'Cyber' || r.domain === 'Compliance').slice(0, 30)
  return (
    <div className="space-y-3">
      <div>
        <span className="mb-1 block text-2xs font-medium uppercase tracking-wide text-muted-foreground">Outcome</span>
        <div className="flex flex-wrap gap-1.5">
          {(['Substantiated', 'Partially substantiated', 'Unsubstantiated', 'Inconclusive'] as FraudOutcome[]).map((o) => (
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
      </label>
      <label className="block">
        <span className="mb-1 block text-2xs font-medium uppercase tracking-wide text-muted-foreground">Findings</span>
        <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} placeholder="What was found, what failed, and what has changed." className="w-full resize-none rounded-md border border-border bg-background px-2.5 py-1.5 text-xs outline-none focus:ring-2 focus:ring-ring" />
      </label>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-2xs font-medium uppercase tracking-wide text-muted-foreground">Disciplinary action</span>
          <input value={disciplinary} onChange={(e) => setDisciplinary(e.target.value)} className="w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-xs outline-none focus:ring-2 focus:ring-ring" />
        </label>
        <label className="block">
          <span className="mb-1 block text-2xs font-medium uppercase tracking-wide text-muted-foreground">Recovery</span>
          <input value={recovery} onChange={(e) => setRecovery(e.target.value)} className="w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-xs outline-none focus:ring-2 focus:ring-ring" />
        </label>
      </div>
      <Button className="w-full" disabled={note.trim().length < 20} onClick={() => onSubmit({ outcome, note: note.trim(), disciplinary: disciplinary.trim() || undefined, recovery: recovery.trim() || undefined, riskId: riskId || undefined })}>
        Close the case
      </Button>
    </div>
  )
}

// ── bits ─────────────────────────────────────────────────────────────────────

function Num({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <label className="block">
      <span className="mb-1 block text-2xs font-medium uppercase tracking-wide text-muted-foreground">{label}</span>
      <input
        type="number"
        min={0}
        step={0.1}
        value={value}
        onChange={(e) => onChange(Math.max(0, Number(e.target.value)))}
        className="w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-xs tnum outline-none focus:ring-2 focus:ring-ring"
      />
    </label>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="min-w-0 flex-1 truncate text-muted-foreground">{label}</span>
      <span className="shrink-0 tnum text-foreground">{value}</span>
    </div>
  )
}

function Person({ label, id }: { label: string; id: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-20 shrink-0 text-2xs uppercase tracking-wide text-muted-foreground">{label}</span>
      <Avatar id={id} size={20} />
      <span className="min-w-0 flex-1 truncate text-xs text-foreground">{personName(id)}</span>
    </div>
  )
}
