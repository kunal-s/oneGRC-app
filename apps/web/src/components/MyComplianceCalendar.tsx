import * as React from 'react'
import { Link } from 'react-router-dom'
import { CalendarDays, ArrowUpRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ObligationCalendar } from '@/pages/obligations/ObligationCalendar'
import { useEffectiveObligations } from '@/lib/effective'
import { useApp } from '@/store'
import type { Obligation } from '@/types'

/**
 * Obligations the logged-in persona is personally responsible for — owner or
 * maker-checker checker. This is the "what I have to act on" cut used by the
 * Home and My Queue calendar embeds (1.x: the calendar follows the user).
 */
export function useMyObligations(): Obligation[] {
  const selfId = useApp((s) => s.personId)
  const all = useEffectiveObligations()
  return React.useMemo(
    () => all.filter((o) => o.owner === selfId || o.makerChecker.checker === selfId),
    [all, selfId],
  )
}

/** Compact month calendar of the current user's obligations, for Home / My Queue. */
export function MyComplianceCalendarCard({ className }: { className?: string }) {
  const mine = useMyObligations()
  const pending = mine.filter((o) => o.status !== 'Filed').length

  return (
    <section className={cn('card-surface flex flex-col overflow-hidden', className)}>
      <div className="flex items-center justify-between gap-2 px-3.5 py-2.5">
        <Link to="/obligations" className="group flex min-w-0 items-center gap-2">
          <CalendarDays className="size-4 text-info" />
          <span className="text-sm font-semibold text-foreground">My compliance calendar</span>
          <ArrowUpRight className="size-3.5 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </Link>
        <span className="shrink-0 text-2xs text-muted-foreground">
          <span className="font-medium tnum text-foreground">{pending}</span> pending · {mine.length} mine
        </span>
      </div>
      <div className="border-t border-border/70 p-3.5">
        {mine.length > 0 ? (
          <ObligationCalendar obligations={mine} compact />
        ) : (
          <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
            <CalendarDays className="size-4" /> No obligations are routed to you right now.
          </div>
        )}
      </div>
    </section>
  )
}
