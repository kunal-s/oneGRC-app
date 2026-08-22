import { ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Avatar } from './Avatar'
import { StatusChip } from './StatusChip'
import { personName } from '@/data/people'
import { fmtDate } from '@/lib/time'

/** The maker-checker pair any record can carry. Obligation['makerChecker'] is
 *  assignable to it, so existing callers are unaffected; a risk approval (which
 *  also carries dates) reuses the same component rather than a second copy. */
export interface MakerCheckerState {
  maker: string
  checker: string
  state: 'Drafted' | 'Submitted' | 'Approved' | 'Pending'
}

/** Compact maker → checker chain with state. */
export function MakerChecker({
  mc,
  showState = true,
  className,
}: {
  mc: MakerCheckerState
  showState?: boolean
  className?: string
}) {
  return (
    <span className={cn('inline-flex items-center gap-1.5', className)}>
      <span className="inline-flex items-center gap-1" title={`Maker · ${personName(mc.maker)}`}>
        <Avatar id={mc.maker} size={18} />
      </span>
      <ArrowRight className="size-3 text-muted-foreground" />
      <span className="inline-flex items-center gap-1" title={`Checker · ${personName(mc.checker)}`}>
        <Avatar id={mc.checker} size={18} />
      </span>
      {showState && <StatusChip status={mc.state} className="ml-0.5" />}
    </span>
  )
}

/** Full maker-checker chain for detail pages. `at` stamps each completed step
 *  where the record keeps dates (a risk approval does; an obligation does not). */
export function MakerCheckerChain({
  mc,
  submittedAt,
  approvedAt,
  makerRole = 'Maker (prepares)',
  checkerRole = 'Checker (approves)',
}: {
  mc: MakerCheckerState
  submittedAt?: string
  approvedAt?: string
  makerRole?: string
  checkerRole?: string
}) {
  const approved = mc.state === 'Approved'
  const submitted = mc.state === 'Submitted' || approved
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <Step role={makerRole} person={mc.maker} done />
      <ArrowRight className="hidden size-4 shrink-0 text-muted-foreground sm:block" />
      <Step role="Submitted for check" person={mc.maker} done={submitted} at={submitted ? submittedAt : undefined} />
      <ArrowRight className="hidden size-4 shrink-0 text-muted-foreground sm:block" />
      <Step role={checkerRole} person={mc.checker} done={approved} at={approved ? approvedAt : undefined} />
    </div>
  )
}

function Step({ role, person, done, at }: { role: string; person: string; done?: boolean; at?: string }) {
  return (
    <div className={cn('flex flex-1 items-center gap-2 rounded-lg border bg-background px-2.5 py-2', done ? 'border-ok/30' : 'border-border')}>
      <Avatar id={person} size={26} />
      <div className="min-w-0">
        <div className="text-2xs font-medium uppercase tracking-wide text-muted-foreground">{role}</div>
        <div className="truncate text-xs font-medium text-foreground">{personName(person)}</div>
        {at && <div className="truncate text-2xs tnum text-muted-foreground">{fmtDate(at)}</div>}
      </div>
      <span className={cn('ml-auto size-2 shrink-0 rounded-full', done ? 'bg-ok' : 'bg-border')} />
    </div>
  )
}
