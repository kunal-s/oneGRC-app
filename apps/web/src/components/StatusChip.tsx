import { cn } from '@/lib/utils'

type Tone = 'ok' | 'warn' | 'danger' | 'info' | 'neutral' | 'progress'

const TONE: Record<Tone, string> = {
  ok: 'bg-ok-soft text-ok border-ok/30',
  warn: 'bg-medium-soft text-medium border-medium/40',
  danger: 'bg-critical-soft text-critical border-critical/30',
  info: 'bg-info-soft text-info border-info/30',
  neutral: 'bg-muted text-muted-foreground border-border',
  progress: 'bg-info-soft text-info border-info/30',
}

// Map common status strings to a tone so chips are consistent everywhere.
const STATUS_TONE: Record<string, Tone> = {
  // generic
  Open: 'warn',
  'In progress': 'progress',
  'In review': 'info',
  Overdue: 'danger',
  Resolved: 'ok',
  Closed: 'ok',
  Filed: 'ok',
  Due: 'warn',
  Published: 'ok',
  Draft: 'neutral',
  // risk
  Monitoring: 'info',
  Mitigated: 'ok',
  Accepted: 'neutral',
  // control
  Pass: 'ok',
  Fail: 'danger',
  Partial: 'warn',
  // incident
  Contained: 'info',
  Eradicated: 'progress',
  // tracks
  'On track': 'ok',
  'At risk': 'warn',
  Breached: 'danger',
  // audit
  Planned: 'neutral',
  Fieldwork: 'progress',
  Reporting: 'info',
  Remediation: 'warn',
  // reg-change
  Assessed: 'info',
  // maker-checker
  Approved: 'ok',
  Submitted: 'info',
  Drafted: 'neutral',
  Pending: 'warn',
  // consent
  Captured: 'ok',
  Legacy: 'warn',
  // dsar
  Fulfilled: 'ok',
  'On hold': 'warn',
}

export function StatusChip({
  status,
  tone,
  className,
}: {
  status: string
  tone?: Tone
  className?: string
}) {
  const t = tone ?? STATUS_TONE[status] ?? 'neutral'
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium',
        TONE[t],
        className,
      )}
    >
      {status}
    </span>
  )
}
