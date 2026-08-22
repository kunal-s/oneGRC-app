import * as React from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertTriangle, ArrowRight, ArrowUpRight, Lightbulb } from 'lucide-react'
import { cn } from '@/lib/utils'
import { StatusChip } from '@/components/StatusChip'
import { ScoreBadge } from '@/components/RiskScore'
import { getControl } from '@/data'
import { EFFECTIVENESS, draftRcsa, effectivenessTone, rcsaDelta, rcsaGaps } from '@/lib/rcsa'
import type { ControlEffectiveness, RcsaResponse, Risk } from '@/types'

const TREATMENTS: Risk['treatment'][] = ['Mitigate', 'Accept', 'Transfer', 'Avoid']
const SCALE = [1, 2, 3, 4, 5]

/**
 * The self-assessment an owner completes for one risk: re-score the exposure,
 * rate the controls, say why. `value`/`onChange` are lifted so the drawer owns
 * the draft and the submit button can read its completeness.
 */
export function RcsaForm({ risk, value, onChange }: { risk: Risk; value: RcsaResponse; onChange: (r: RcsaResponse) => void }) {
  const navigate = useNavigate()
  const set = (patch: Partial<RcsaResponse>) => onChange({ ...value, ...patch })
  const inherent = value.proposedLikelihood * value.proposedImpact
  const gaps = rcsaGaps(value)
  const delta = rcsaDelta(risk, value)

  const setControl = (controlId: string, patch: Partial<{ effectiveness: ControlEffectiveness; comment: string }>) =>
    set({ controls: value.controls.map((c) => (c.controlId === controlId ? { ...c, ...patch } : c)) })

  return (
    <div className="space-y-4">
      {/* 1 · is it still a risk */}
      <Step n={1} title="Is this still a live risk?">
        <div className="flex gap-1.5">
          <Choice active={value.stillRelevant} onClick={() => set({ stillRelevant: true })}>
            Yes — carry forward
          </Choice>
          <Choice active={!value.stillRelevant} onClick={() => set({ stillRelevant: false })} tone="warn">
            No — propose for retirement
          </Choice>
        </div>
        {!value.stillRelevant && (
          <p className="mt-1.5 rounded-md border border-medium/40 bg-medium-soft/40 px-2.5 py-1.5 text-2xs text-foreground">
            On approval the risk moves to <span className="font-medium">Mitigated</span> and leaves the live register. The
            record and its history stay.
          </p>
        )}
      </Step>

      {/* 2 · re-score */}
      <Step n={2} title="Re-score the exposure">
        <div className="grid grid-cols-2 gap-3">
          <Scale label="Likelihood" value={value.proposedLikelihood} onChange={(v) => set({ proposedLikelihood: v })} was={risk.likelihood} />
          <Scale label="Impact" value={value.proposedImpact} onChange={(v) => set({ proposedImpact: v })} was={risk.impact} />
        </div>
        <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-2">
          <span className="inline-flex items-center gap-1.5 text-2xs text-muted-foreground">
            Inherent <ScoreBadge score={inherent} />
            {inherent !== risk.inherent && <span className="tnum">was {risk.inherent}</span>}
          </span>
          <div className="flex items-center gap-1.5">
            <span className="text-2xs text-muted-foreground">Residual</span>
            <input
              type="range"
              min={1}
              max={Math.max(1, inherent)}
              value={Math.min(value.proposedResidual, Math.max(1, inherent))}
              onChange={(e) => set({ proposedResidual: Number(e.target.value) })}
              className="h-1 w-32 cursor-pointer accent-info"
            />
            <ScoreBadge score={value.proposedResidual} />
            {value.proposedResidual !== risk.residual && <span className="text-2xs tnum text-muted-foreground">was {risk.residual}</span>}
          </div>
        </div>
        <p className="mt-1.5 text-2xs text-muted-foreground">
          Target residual for this risk is {risk.lifecycle.treatment.targetResidual}, agreed {risk.lifecycle.treatment.decision.toLowerCase()}
          {' '}treatment.
        </p>
      </Step>

      {/* 3 · control effectiveness — the "C" in RCSA */}
      <Step n={3} title={`Rate the controls · ${value.controls.length}`}>
        {value.controls.length === 0 ? (
          <p className="rounded-md border border-dashed border-medium/50 bg-medium-soft/30 px-2.5 py-2 text-2xs text-foreground">
            No control is mapped to this risk. Say so in the rationale — an unmitigated risk is itself the finding.
          </p>
        ) : (
          <div className="space-y-1.5">
            {value.controls.map((ca) => {
              const c = getControl(ca.controlId)
              const needsComment = ca.effectiveness !== 'Effective' && !ca.comment?.trim()
              return (
                <div key={ca.controlId} className={cn('rounded-md border px-2.5 py-2', needsComment ? 'border-medium/50 bg-medium-soft/20' : 'border-border')}>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => navigate(`/controls/${ca.controlId}`)}
                      className="font-mono text-2xs font-semibold text-info hover:underline"
                    >
                      {ca.controlId}
                    </button>
                    <span className="min-w-0 flex-1 truncate text-2xs text-foreground">{c?.title ?? ''}</span>
                    {c && (
                      <span className="shrink-0 text-2xs text-muted-foreground">
                        last test <StatusChip status={c.result} />
                      </span>
                    )}
                  </div>
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {EFFECTIVENESS.map((e) => (
                      <button
                        key={e}
                        onClick={() => setControl(ca.controlId, { effectiveness: e })}
                        className={cn(
                          'rounded border px-1.5 py-0.5 text-2xs font-medium transition-colors',
                          ca.effectiveness === e
                            ? e === 'Effective'
                              ? 'border-ok bg-ok-soft text-ok'
                              : e === 'Partially effective'
                                ? 'border-medium bg-medium-soft text-medium'
                                : e === 'Ineffective'
                                  ? 'border-critical bg-critical-soft text-critical'
                                  : 'border-border bg-muted text-foreground'
                            : 'border-border bg-background text-muted-foreground hover:text-foreground',
                        )}
                      >
                        {e}
                      </button>
                    ))}
                  </div>
                  {ca.effectiveness !== 'Effective' && (
                    <input
                      value={ca.comment ?? ''}
                      onChange={(e) => setControl(ca.controlId, { comment: e.target.value })}
                      placeholder="What is not working? Required."
                      className="mt-1.5 w-full rounded border border-border bg-background px-2 py-1 text-2xs outline-none focus:ring-2 focus:ring-ring"
                    />
                  )}
                </div>
              )
            })}
          </div>
        )}
      </Step>

      {/* 4 · treatment */}
      <Step n={4} title="Treatment going forward">
        <div className="flex flex-wrap gap-1.5">
          {TREATMENTS.map((t) => (
            <Choice key={t} active={value.proposedTreatment === t} onClick={() => set({ proposedTreatment: t })}>
              {t}
            </Choice>
          ))}
        </div>
        {value.proposedTreatment === 'Accept' && value.proposedResidual > risk.lifecycle.treatment.targetResidual && (
          <p className="mt-1.5 inline-flex items-start gap-1.5 rounded-md border border-medium/40 bg-medium-soft/40 px-2.5 py-1.5 text-2xs text-foreground">
            <AlertTriangle className="mt-0.5 size-3 shrink-0 text-medium" />
            Accepting above target residual requires a time-bound acceptance signed off on the risk record.
          </p>
        )}
      </Step>

      {/* 5 · rationale + emerging */}
      <Step n={5} title="Rationale">
        <textarea
          value={value.rationale}
          onChange={(e) => set({ rationale: e.target.value })}
          rows={3}
          placeholder="What has changed since the last assessment, and what supports this score?"
          className="w-full resize-none rounded-md border border-border bg-background px-2.5 py-1.5 text-xs outline-none focus:ring-2 focus:ring-ring"
        />
        <label className="mt-2 block">
          <span className="mb-1 inline-flex items-center gap-1 text-2xs font-medium uppercase tracking-wide text-muted-foreground">
            <Lightbulb className="size-3" /> Emerging concern (optional)
          </span>
          <input
            value={value.emergingConcern ?? ''}
            onChange={(e) => set({ emergingConcern: e.target.value })}
            placeholder="Something not yet on the register that the second line should look at"
            className="w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-xs outline-none focus:ring-2 focus:ring-ring"
          />
        </label>
      </Step>

      <DeltaPanel delta={delta} />

      {gaps.length > 0 && (
        <ul className="space-y-0.5 rounded-md border border-medium/40 bg-medium-soft/30 px-2.5 py-2">
          {gaps.map((g) => (
            <li key={g} className="flex items-start gap-1.5 text-2xs text-foreground">
              <AlertTriangle className="mt-0.5 size-3 shrink-0 text-medium" /> {g}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

/** What approving this response writes back to the register — shown to the
 *  assessor before they submit and to the checker before they approve. */
export function DeltaPanel({ delta, className }: { delta: ReturnType<typeof rcsaDelta>; className?: string }) {
  return (
    <div className={cn('rounded-md border border-info/30 bg-info-soft/30 px-2.5 py-2', className)}>
      <div className="mb-1 text-2xs font-semibold uppercase tracking-wide text-info">On approval, the register changes</div>
      {delta.length === 0 ? (
        <p className="text-2xs text-foreground">Nothing — the current position is re-confirmed.</p>
      ) : (
        <ul className="space-y-0.5">
          {delta.map((c) => (
            <li key={c.field} className="flex items-center gap-1.5 text-2xs text-foreground">
              <span className="w-20 shrink-0 text-muted-foreground">{c.field}</span>
              <span className="tnum">{c.from}</span>
              <ArrowRight className="size-3 text-muted-foreground" />
              <span className="font-semibold tnum">{c.to}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

/** Read-only rendering of a submitted assessment — the checker's view. */
export function RcsaSummary({ risk, response }: { risk: Risk; response: RcsaResponse }) {
  const navigate = useNavigate()
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-4">
        <Attr label="Still relevant">{response.stillRelevant ? 'Yes' : 'Proposed for retirement'}</Attr>
        <Attr label="Likelihood × Impact">
          {response.proposedLikelihood} × {response.proposedImpact} = {response.proposedLikelihood * response.proposedImpact}
        </Attr>
        <Attr label="Residual">
          <span className="inline-flex items-center gap-1.5">
            <ScoreBadge score={response.proposedResidual} />
            {response.proposedResidual !== response.priorResidual && (
              <span className="text-2xs tnum text-muted-foreground">from {response.priorResidual}</span>
            )}
          </span>
        </Attr>
        <Attr label="Treatment">{response.proposedTreatment}</Attr>
      </div>

      {response.controls.length > 0 && (
        <div>
          <div className="mb-1 text-2xs font-semibold uppercase tracking-wide text-muted-foreground">Control effectiveness</div>
          <div className="space-y-1">
            {response.controls.map((ca) => (
              <div key={ca.controlId} className="rounded-md border border-border px-2.5 py-1.5">
                <div className="flex items-center gap-2">
                  <button onClick={() => navigate(`/controls/${ca.controlId}`)} className="font-mono text-2xs font-semibold text-info hover:underline">
                    {ca.controlId}
                  </button>
                  <span className="min-w-0 flex-1 truncate text-2xs text-foreground">{getControl(ca.controlId)?.title ?? ''}</span>
                  <StatusChip status={ca.effectiveness} tone={effectivenessTone(ca.effectiveness)} />
                  <ArrowUpRight className="size-3 shrink-0 text-muted-foreground" />
                </div>
                {ca.comment && <p className="mt-0.5 text-2xs text-muted-foreground">{ca.comment}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {response.rationale && (
        <div>
          <div className="mb-1 text-2xs font-semibold uppercase tracking-wide text-muted-foreground">Rationale</div>
          <p className="rounded-md border border-border bg-muted/30 px-2.5 py-1.5 text-xs text-foreground">{response.rationale}</p>
        </div>
      )}

      {response.emergingConcern && (
        <div>
          <div className="mb-1 inline-flex items-center gap-1 text-2xs font-semibold uppercase tracking-wide text-muted-foreground">
            <Lightbulb className="size-3" /> Emerging concern
          </div>
          <p className="rounded-md border border-info/30 bg-info-soft/30 px-2.5 py-1.5 text-xs text-foreground">{response.emergingConcern}</p>
        </div>
      )}

      <DeltaPanel delta={rcsaDelta(risk, response)} />
    </div>
  )
}

// ── bits ─────────────────────────────────────────────────────────────────────

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-1.5 flex items-center gap-1.5">
        <span className="flex size-4 items-center justify-center rounded-full bg-muted text-2xs font-semibold tnum text-muted-foreground">{n}</span>
        <h4 className="text-xs font-semibold text-foreground">{title}</h4>
      </div>
      <div className="pl-6">{children}</div>
    </div>
  )
}

function Choice({ active, onClick, children, tone }: { active: boolean; onClick: () => void; children: React.ReactNode; tone?: 'warn' }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'rounded-md border px-2.5 py-1 text-2xs font-medium transition-colors',
        active
          ? tone === 'warn'
            ? 'border-medium bg-medium-soft text-medium'
            : 'border-primary bg-primary text-primary-foreground'
          : 'border-border bg-background text-muted-foreground hover:text-foreground',
      )}
    >
      {children}
    </button>
  )
}

function Scale({ label, value, onChange, was }: { label: string; value: number; onChange: (v: number) => void; was: number }) {
  return (
    <div>
      <div className="mb-1 flex items-center gap-1.5">
        <span className="text-2xs font-medium uppercase tracking-wide text-muted-foreground">{label}</span>
        {value !== was && <span className="text-2xs tnum text-muted-foreground">was {was}</span>}
      </div>
      <div className="flex gap-1">
        {SCALE.map((n) => (
          <button
            key={n}
            onClick={() => onChange(n)}
            className={cn(
              'size-6 rounded border text-2xs font-semibold tnum transition-colors',
              value === n ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-background text-muted-foreground hover:text-foreground',
            )}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  )
}

function Attr({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-2xs font-medium uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-0.5 text-xs text-foreground">{children}</div>
    </div>
  )
}

export { draftRcsa }
