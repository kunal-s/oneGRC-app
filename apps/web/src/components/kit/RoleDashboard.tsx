import * as React from 'react'
import { Link } from 'react-router-dom'
import { ArrowUpRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { StartTourButton } from '@/components/tour/StartTourButton'

/**
 * The persona landing-page shell: a greeting, an optional summary band, then a
 * composable grid of role-relevant cards. Each persona's Home is a RoleDashboard
 * (docs/onegrc-ux-audit.md, Section 9).
 */
export function RoleDashboard({
  eyebrow,
  title,
  description,
  actions,
  summary,
  children,
}: {
  eyebrow?: React.ReactNode
  title: React.ReactNode
  description?: React.ReactNode
  actions?: React.ReactNode
  summary?: React.ReactNode
  children?: React.ReactNode
}) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          {eyebrow && <div className="text-2xs font-semibold uppercase tracking-wide text-muted-foreground">{eyebrow}</div>}
          <h1 className="text-xl font-semibold tracking-tight text-foreground">{title}</h1>
          {description && <p className="mt-0.5 max-w-3xl text-sm text-muted-foreground">{description}</p>}
        </div>
        {/* Every persona's Home carries the same tour entry point, same copy. */}
        <div className="flex shrink-0 items-center gap-2">
          <StartTourButton />
          {actions}
        </div>
      </div>
      {summary}
      {children && <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">{children}</div>}
    </div>
  )
}

/** A single dashboard widget. `to` makes the header a deep link; `span` widens it. */
export function DashboardCard({
  title,
  icon,
  to,
  action,
  span,
  children,
  className,
}: {
  title: React.ReactNode
  icon?: React.ReactNode
  to?: string
  action?: React.ReactNode
  span?: boolean
  children: React.ReactNode
  className?: string
}) {
  const header = (
    <div className="flex items-center gap-2">
      {icon}
      <span className="text-sm font-semibold text-foreground">{title}</span>
      {to && <ArrowUpRight className="size-3.5 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />}
    </div>
  )
  return (
    <section className={cn('card-surface flex flex-col overflow-hidden', span && 'lg:col-span-2', className)}>
      <div className="flex items-center justify-between gap-2 px-3.5 py-2.5">
        {to ? (
          <Link to={to} className="group min-w-0">
            {header}
          </Link>
        ) : (
          <div className="min-w-0">{header}</div>
        )}
        {action && <div className="shrink-0">{action}</div>}
      </div>
      <div className="border-t border-border/70 p-3.5">{children}</div>
    </section>
  )
}
