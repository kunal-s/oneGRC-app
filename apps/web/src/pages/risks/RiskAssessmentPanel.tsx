import { useNavigate } from 'react-router-dom'
import { ArrowRight, ArrowUpRight, ClipboardList } from 'lucide-react'
import { cn } from '@/lib/utils'
import { StatusChip } from '@/components/StatusChip'
import { Avatar } from '@/components/Avatar'
import { personName } from '@/data/people'
import { fmtDate, fmtRelative } from '@/lib/time'
import { useEffectiveCampaigns } from '@/lib/effective'
import {
  assessmentState,
  assessmentTone,
  assessmentsFor,
  cadenceMonths,
  effectivenessTone,
  lastAssessment,
  openAssessment,
} from '@/lib/rcsa'
import type { Risk } from '@/types'

/**
 * The self-assessment position on a risk: when it was last challenged and
 * approved, what the owner said about the controls, and whether a cycle is
 * asking for it again right now.
 */
export function RiskAssessmentPanel({ risk, className }: { risk: Risk; className?: string }) {
  const navigate = useNavigate()
  const campaigns = useEffectiveCampaigns()
  const state = assessmentState(risk, campaigns)
  const last = lastAssessment(risk.id, campaigns)
  const open = openAssessment(risk.id, campaigns)
  const history = assessmentsFor(risk.id, campaigns)

  return (
    <div className={cn('card-surface p-4', className)}>
      <div className="mb-2 flex items-center gap-1.5">
        <ClipboardList className="size-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold text-foreground">Self-assessment</h3>
        <StatusChip status={state} tone={assessmentTone(state)} />
        <span className="ml-auto text-2xs text-muted-foreground">
          {risk.lifecycle.ownership.reviewFrequency} · every {cadenceMonths(risk)} months
        </span>
      </div>

      {open && (
        <button
          onClick={() => navigate(`/campaigns/${open.campaign.id}`)}
          className="group mb-2 flex w-full items-center gap-2 rounded-md border border-info/40 bg-info-soft/30 px-2.5 py-1.5 text-left"
        >
          <span className="min-w-0 flex-1 truncate text-2xs text-foreground">
            <span className="font-mono font-semibold text-info">{open.campaign.id}</span> is asking {personName(open.task.assignee)} to
            re-assess this risk
          </span>
          <StatusChip status={open.task.status} tone={open.task.status === 'Submitted' ? 'progress' : 'neutral'} />
          <ArrowUpRight className="size-3 shrink-0 text-muted-foreground opacity-0 group-hover:opacity-100" />
        </button>
      )}

      {last ? (
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-2xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <Avatar id={last.task.assignee} size={16} />
              <span className="text-foreground">{personName(last.task.assignee)}</span> assessed
            </span>
            <span>·</span>
            <span>
              approved by <span className="text-foreground">{personName(last.task.reviewer ?? '')}</span> {fmtRelative(last.at)}
            </span>
            <button
              onClick={() => navigate(`/campaigns/${last.campaign.id}`)}
              className="ml-auto font-mono text-2xs font-semibold text-info hover:underline"
            >
              {last.campaign.id}
            </button>
          </div>

          <div className="flex items-center gap-2 rounded-md border border-border bg-muted/30 px-2.5 py-1.5">
            <span className="text-2xs text-muted-foreground">Residual</span>
            {last.response.priorResidual !== last.response.proposedResidual ? (
              <span className="inline-flex items-center gap-1 text-xs font-semibold tnum text-foreground">
                {last.response.priorResidual} <ArrowRight className="size-3 text-muted-foreground" /> {last.response.proposedResidual}
              </span>
            ) : (
              <span className="text-xs font-semibold tnum text-foreground">{last.response.proposedResidual} — re-confirmed</span>
            )}
            <span className="ml-auto text-2xs text-muted-foreground">{last.response.proposedTreatment}</span>
          </div>

          {last.response.controls.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {last.response.controls.map((c) => (
                <button
                  key={c.controlId}
                  onClick={() => navigate(`/controls/${c.controlId}`)}
                  title={c.comment ?? `${c.controlId} — ${c.effectiveness}`}
                  className="inline-flex items-center gap-1 rounded border border-border bg-background px-1.5 py-0.5 hover:border-info/40"
                >
                  <span className="font-mono text-2xs font-semibold text-info">{c.controlId}</span>
                  <StatusChip status={c.effectiveness} tone={effectivenessTone(c.effectiveness)} />
                </button>
              ))}
            </div>
          )}

          {last.response.rationale && <p className="text-2xs text-muted-foreground">{last.response.rationale}</p>}

          {history.length > 1 && (
            <div className="border-t border-border pt-1.5">
              <div className="mb-1 text-2xs font-semibold uppercase tracking-wide text-muted-foreground">Earlier cycles</div>
              {history.slice(1, 4).map((a) => (
                <button
                  key={a.task.id}
                  onClick={() => navigate(`/campaigns/${a.campaign.id}`)}
                  className="flex w-full items-center gap-2 rounded px-1 py-0.5 text-left hover:bg-info-soft/30"
                >
                  <span className="font-mono text-2xs font-semibold text-info">{a.campaign.id}</span>
                  <span className="truncate text-2xs text-muted-foreground">{a.campaign.period}</span>
                  <span className="ml-auto shrink-0 text-2xs tnum text-muted-foreground">
                    {a.response.priorResidual} → {a.response.proposedResidual}
                  </span>
                  <span className="shrink-0 text-2xs text-muted-foreground">{fmtDate(a.at)}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        <p className="rounded-md border border-dashed border-medium/50 bg-medium-soft/20 px-2.5 py-2 text-xs text-foreground">
          No self-assessment has been approved against this risk. Its score rests on the original assessment of{' '}
          {fmtDate(risk.lifecycle.identification.identifiedOn)}.
        </p>
      )}
    </div>
  )
}
