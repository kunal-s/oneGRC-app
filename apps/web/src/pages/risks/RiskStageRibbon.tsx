import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { RISK_STAGES, stageIndex, stageTone } from '@/lib/riskWorkflow'
import type { RiskStage } from '@/types'

/** The eight-stage remediation spine, shown above the tabs so the sequence stays
 *  visible whichever tab is open. Each stage jumps to the tab that owns it. */
export function RiskStageRibbon({
  stage,
  onJump,
  className,
}: {
  stage: RiskStage
  onJump: (tab: string) => void
  className?: string
}) {
  const current = stageIndex(stage)
  const tone = stageTone(stage)
  const offSpine = stage === 'Accepted' || stage === 'Exception expired'

  return (
    <div className={cn('card-surface px-3.5 py-2.5', className)}>
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-2xs font-semibold uppercase tracking-wide text-muted-foreground">Remediation workflow</h3>
        <span
          className={cn(
            'rounded px-1.5 py-0.5 text-2xs font-semibold',
            tone === 'danger' && 'bg-critical-soft text-critical',
            tone === 'warn' && 'bg-medium-soft text-medium',
            tone === 'ok' && 'bg-ok-soft text-ok',
            tone === 'info' && 'bg-info-soft text-info',
          )}
        >
          {stage}
        </span>
      </div>
      <ol className="flex flex-wrap items-stretch gap-1">
        {RISK_STAGES.map((s, i) => {
          const done = i < current
          const isCurrent = i === current && !offSpine
          return (
            <li key={s} className="flex min-w-0 flex-1 basis-[110px] items-stretch">
              <button
                onClick={() => onJump(STAGE_TAB[s])}
                title={`${s} — open the ${STAGE_TAB[s]} tab`}
                className={cn(
                  'flex w-full items-center gap-1.5 rounded-md border px-2 py-1.5 text-left transition-colors',
                  isCurrent
                    ? 'border-primary bg-primary/10'
                    : done
                      ? 'border-ok/30 bg-ok-soft/40 hover:border-ok/50'
                      : 'border-dashed border-border bg-muted/30 hover:border-info/40',
                )}
              >
                <span
                  className={cn(
                    'flex size-4 shrink-0 items-center justify-center rounded-full text-[9px] font-semibold',
                    isCurrent ? 'bg-primary text-primary-foreground' : done ? 'bg-ok text-white' : 'bg-border text-muted-foreground',
                  )}
                >
                  {done ? <Check className="size-2.5" /> : i + 1}
                </span>
                <span
                  className={cn(
                    'min-w-0 truncate text-2xs font-medium',
                    isCurrent ? 'text-foreground' : done ? 'text-ok' : 'text-muted-foreground',
                  )}
                >
                  {s}
                </span>
              </button>
            </li>
          )
        })}
      </ol>
    </div>
  )
}

/** Which tab owns each stage — the ribbon is navigation, not decoration. */
const STAGE_TAB: Record<string, string> = {
  Identified: 'overview',
  Assessed: 'overview',
  'Treatment planned': 'treatment',
  'In execution': 'actions',
  Evidenced: 'evidence',
  'Under review': 'approvals',
  'Awaiting approval': 'approvals',
  Monitoring: 'timeline',
}
