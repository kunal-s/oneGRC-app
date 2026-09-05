import * as React from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Search, Bell, ChevronsUpDown, Building2, AlertTriangle, Info, Siren } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useApp } from '@/store'
import { fmtRelative } from '@/lib/time'
import { listNotifications, markNotificationsRead } from '@/api/functions'
import { ErrorNote } from '@/pages/live/SourceLibrary'
import { RoleSwitcher } from '../RoleSwitcher'

/**
 * SCR-083: rewired to R-007 (SCR-083-020, SCR-083-021, SCR-083-023). Every
 * visual line stays the prototype's TopBar.tsx as the client approved it;
 * only the data source changes and the footer link is added (SCR-083-026).
 */
function NotificationsBell() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { data, isLoading, error } = useQuery({
    queryKey: ['notifications', 'bell'],
    // SCR-083-022: the bell asks for in-app rows only. An email or digest row
    // is a delivery record for the same firing, never a second row here.
    queryFn: () => listNotifications({ limit: 20, channel: 'inApp' }),
  })
  const [open, setOpen] = React.useState(false)
  const ref = React.useRef<HTMLDivElement>(null)
  const notifications = data?.items ?? []
  const unread = notifications.filter((n) => n.isUnread).length

  React.useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  const toggle = () => {
    setOpen((o) => {
      // SCR-083-012: opening the menu marks the rows it shows as read, the
      // prototype's own behaviour, kept unchanged. Its weakness (a glance
      // marks every row, not only the ones actually read) is an enhancement
      // recommendation, unbuilt.
      if (!o && unread > 0) {
        markNotificationsRead().then(() => queryClient.invalidateQueries({ queryKey: ['notifications'] }))
      }
      return !o
    })
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={toggle}
        className="relative rounded-md p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <Bell className="size-4.5" />
        {!isLoading && !error && unread > 0 && (
          <span className="absolute right-0.5 top-0.5 flex min-w-3.5 items-center justify-center rounded-full bg-critical px-1 text-[9px] font-semibold leading-none text-white" style={{ height: 14 }}>
            {unread}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 top-full z-50 mt-1 w-96 rounded-lg border border-border bg-background p-1 shadow-lg animate-slide-up">
          <div className="flex items-center justify-between px-2 py-1.5">
            <span className="text-2xs font-semibold uppercase tracking-wide text-muted-foreground">Notifications</span>
            <span className="text-2xs text-muted-foreground">{notifications.length} recent</span>
          </div>
          {error ? (
            <div className="px-2 pb-1.5">
              <ErrorNote error={error} />
            </div>
          ) : (
            <div className="scrollbar-thin max-h-96 space-y-0.5 overflow-y-auto">
              {notifications.map((n) => {
                const Icon = n.severity === 'critical' ? Siren : n.severity === 'warn' ? AlertTriangle : Info
                const tone = n.severity === 'critical' ? 'text-critical' : n.severity === 'warn' ? 'text-medium' : 'text-info'
                return (
                  <button
                    key={n.id}
                    onClick={() => {
                      if (n.route) navigate(n.route)
                      setOpen(false)
                    }}
                    className="flex w-full items-start gap-2.5 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-muted"
                  >
                    <Icon className={cn('mt-0.5 size-4 shrink-0', tone)} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-xs font-medium text-foreground">{n.title}</span>
                        <span className="ml-auto shrink-0 text-2xs text-muted-foreground">{fmtRelative(n.at)}</span>
                      </div>
                      {n.body && <div className="mt-0.5 text-2xs text-muted-foreground">{n.body}</div>}
                    </div>
                  </button>
                )
              })}
            </div>
          )}
          <button
            onClick={() => {
              navigate('/notifications')
              setOpen(false)
            }}
            className="mt-1 block w-full rounded-md border-t border-border px-2 pt-1.5 pb-1 text-left text-xs font-medium text-foreground transition-colors hover:bg-muted"
          >
            View all notifications
          </button>
        </div>
      )}
    </div>
  )
}

export function TopBar() {
  const setCommandOpen = useApp((s) => s.setCommandOpen)
  const navigate = useNavigate()

  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border bg-background px-4">
      {/* Org switcher */}
      <button className="flex items-center gap-2 rounded-md border border-border px-2.5 py-1.5 transition-colors hover:bg-muted">
        <div className="flex size-6 items-center justify-center rounded bg-primary/10 text-primary">
          <Building2 className="size-3.5" />
        </div>
        <div className="text-left leading-tight">
          <div className="text-xs font-semibold text-foreground">Sankalp Pension Funds</div>
          <div className="text-2xs text-muted-foreground">PFRDA NPS Pension Fund Manager</div>
        </div>
        <ChevronsUpDown className="size-3.5 text-muted-foreground" />
      </button>

      {/* Command search trigger */}
      <button
        onClick={() => setCommandOpen(true)}
        className="group flex h-9 max-w-md flex-1 items-center gap-2 rounded-md border border-border bg-muted/40 px-2.5 text-muted-foreground transition-colors hover:bg-muted"
      >
        <Search className="size-4" />
        <span className="text-sm">Search risks, controls, incidents, obligations…</span>
        <kbd className="ml-auto rounded border border-border bg-background px-1.5 py-0.5 text-2xs font-medium">⌘K</kbd>
      </button>

      <div className="ml-auto flex items-center gap-2">
        <NotificationsBell />
        <button
          onClick={() => navigate('/incidents/INC-2026-0411')}
          className="hidden items-center gap-1.5 rounded-md border border-critical/30 bg-critical-soft px-2.5 py-1.5 text-xs font-medium text-critical transition-colors hover:bg-critical-soft/70 xl:flex"
        >
          <span className="size-1.5 animate-pulse rounded-full bg-critical" />
          1 Critical incident live
        </button>
        <div className="mx-1 h-6 w-px bg-border" />
        <RoleSwitcher />
      </div>
    </header>
  )
}
