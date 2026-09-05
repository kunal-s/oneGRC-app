import * as React from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Bell, ChevronDown, ChevronUp, ChevronsUpDown, Siren, AlertTriangle, Info } from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import { StatusChip } from '@/components/StatusChip'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'
import { fmtRelative } from '@/lib/time'
import { whoAmI } from '@/api/functions'
import { listNotifications, runLadderNow, type NotificationRow } from '@/api/functions'
import { ErrorNote } from './SourceLibrary'

const SEVERITY_OPTIONS = [
  { value: 'critical', label: 'Critical' },
  { value: 'warn', label: 'Warn' },
  { value: 'info', label: 'Info' },
]
const RUNG_OPTIONS = [
  { value: '-7', label: '7 days before due' },
  { value: '-3', label: '3 days before due' },
  { value: '-1', label: '1 day before due' },
  { value: '1', label: '1 day overdue' },
  { value: '3', label: '3 days overdue' },
  { value: '7', label: '7 days overdue' },
]
const CHANNEL_LABEL: Record<string, string> = { inApp: 'In-app', email: 'Email', digest: 'Digest' }
const CHANNEL_OPTIONS = [
  { value: 'inApp', label: 'In-app' },
  { value: 'email', label: 'Email' },
  { value: 'digest', label: 'Digest' },
]
const DELIVERY_LABEL: Record<string, string> = { delivered: 'Delivered', retrying: 'Retrying', failed: 'Failed', pending: 'Pending' }
const DELIVERY_TONE: Record<string, 'ok' | 'warn' | 'danger' | 'neutral'> = {
  delivered: 'ok', retrying: 'warn', failed: 'danger', pending: 'neutral',
}
const DELIVERY_OPTIONS = [
  { value: 'delivered', label: 'Delivered' },
  { value: 'retrying', label: 'Retrying' },
  { value: 'failed', label: 'Failed' },
  { value: 'pending', label: 'Pending' },
]
const PAGE_SIZE = 40

type SortState = { key: string; dir: 'asc' | 'desc' }

/**
 * GAP-SCR-010, the notifications screen. The prototype has no such screen
 * (FRD 8.3, screen-inventory.md). Every visual line reuses a component the
 * prototype already carries (rule 14): PageHeader, StatusChip, Button,
 * card-surface, and the empty-state shape SCR-088-040 established.
 */
export function Notifications() {
  const queryClient = useQueryClient()
  const [severity, setSeverity] = React.useState('')
  const [rung, setRung] = React.useState('')
  const [channel, setChannel] = React.useState('')
  const [delivery, setDelivery] = React.useState('')
  const [readFilter, setReadFilter] = React.useState('')
  const [search, setSearch] = React.useState('')
  const [sort, setSort] = React.useState<SortState>({ key: 'at', dir: 'desc' })
  const [page, setPage] = React.useState(1)
  const [runMessage, setRunMessage] = React.useState<string | null>(null)

  const who = useQuery({ queryKey: ['whoami'], queryFn: whoAmI, retry: false })
  // GAP-SCR-010-011: shown to the Administrator, and only the Administrator
  // (LDR-095). Hiding is presentation; the server refuses the call for
  // everyone else regardless (LDR-093, LDR-094, LDR-095).
  const isAdmin = who.data?.roles.includes('ADMIN') ?? false

  const hasFilters = Boolean(severity || rung || channel || delivery || readFilter || search.trim())

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['notifications', 'list', { severity, rung, channel, delivery, readFilter, search, sort, page }],
    queryFn: () =>
      listNotifications({
        severity: severity || undefined,
        rung: rung || undefined,
        channel: channel || undefined,
        delivery: delivery || undefined,
        read: (readFilter || undefined) as 'read' | 'unread' | undefined,
        search: search.trim() || undefined,
        sort: `${sort.key}:${sort.dir}`,
        page,
        pageSize: PAGE_SIZE,
      }),
  })

  const toggleSort = (key: string) =>
    setSort((s) => (s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' }))

  async function handleRun() {
    setRunMessage(null)
    const result = await runLadderNow()
    setRunMessage(result.fired > 0 ? `${result.fired} rung${result.fired === 1 ? '' : 's'} fired.` : 'Nothing fired this run.')
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['notifications'] }),
      queryClient.invalidateQueries({ queryKey: ['obligation'] }),
    ])
    refetch()
  }

  return (
    <div>
      <PageHeader
        eyebrow="Platform"
        title="Notifications"
        description="Every reminder and escalation sent to you, with what it was about and whether it was delivered."
        actions={
          isAdmin ? (
            <Button variant="outline" size="sm" onClick={handleRun}>
              Run the ladder now
            </Button>
          ) : undefined
        }
      />
      {runMessage && <p className="mb-3 text-xs text-muted-foreground">{runMessage}</p>}

      {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
      {error && <ErrorNote error={error} />}

      {!isLoading && !error && data && data.total === 0 && !hasFilters && <NotificationsEmpty />}

      {!isLoading && !error && data && (data.total > 0 || hasFilters) && (
        <div className="card-surface overflow-hidden">
          <div className="flex flex-wrap items-center gap-2 border-b border-border bg-muted/40 px-3 py-2">
            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(1)
              }}
              placeholder="Search title or body…"
              className="h-7 w-56 rounded-md border border-border bg-background px-2 text-xs outline-none focus:ring-2 focus:ring-ring"
            />
            <FilterSelect label="Severity" value={severity} options={SEVERITY_OPTIONS} onChange={(v) => { setSeverity(v); setPage(1) }} />
            <FilterSelect label="Rung" value={rung} options={RUNG_OPTIONS} onChange={(v) => { setRung(v); setPage(1) }} />
            <FilterSelect label="Channel" value={channel} options={CHANNEL_OPTIONS} onChange={(v) => { setChannel(v); setPage(1) }} />
            <FilterSelect label="Delivery" value={delivery} options={DELIVERY_OPTIONS} onChange={(v) => { setDelivery(v); setPage(1) }} />
            <FilterSelect
              label="Read"
              value={readFilter}
              options={[{ value: 'unread', label: 'Unread' }, { value: 'read', label: 'Read' }]}
              onChange={(v) => { setReadFilter(v); setPage(1) }}
            />
            <span className="ml-auto text-2xs tabular-nums text-muted-foreground">
              {data.total} {data.total === 1 ? 'row' : 'rows'}
            </span>
          </div>

          <div className="scrollbar-thin overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-border bg-background">
                  <Th label="When" sortKey="at" sort={sort} onSort={toggleSort} />
                  <Th label="What" sortKey="title" sort={sort} onSort={toggleSort} />
                  <Th label="About" sortKey="entityId" sort={sort} onSort={toggleSort} />
                  <Th label="Rung" sortKey="rungOffsetDays" sort={sort} onSort={toggleSort} />
                  <Th label="Sent to" />
                  <Th label="Channel" sortKey="channel" sort={sort} onSort={toggleSort} />
                  <Th label="Delivery" sortKey="delivery" sort={sort} onSort={toggleSort} align="right" />
                </tr>
              </thead>
              <tbody>
                {data.items.map((n) => (
                  <Row key={n.id} n={n} />
                ))}
              </tbody>
            </table>
          </div>

          {data.items.length === 0 && (
            <div className="px-3 py-6 text-center text-xs text-muted-foreground">No rows match the current filters.</div>
          )}

          {data.total > PAGE_SIZE && (
            <div className="flex items-center justify-between border-t border-border bg-muted/30 px-3 py-2 text-xs">
              <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="font-medium text-info disabled:opacity-40 disabled:hover:no-underline hover:underline">
                Previous
              </button>
              <span className="text-2xs text-muted-foreground">
                Page {page} of {Math.max(1, Math.ceil(data.total / PAGE_SIZE))}
              </span>
              <button
                disabled={page * PAGE_SIZE >= data.total}
                onClick={() => setPage((p) => p + 1)}
                className="font-medium text-info disabled:opacity-40 disabled:hover:no-underline hover:underline"
              >
                Next
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function Row({ n }: { n: NotificationRow }) {
  const Icon = n.severity === 'critical' ? Siren : n.severity === 'warn' ? AlertTriangle : Info
  const tone = n.severity === 'critical' ? 'text-critical' : n.severity === 'warn' ? 'text-medium' : 'text-info'
  return (
    <tr className="h-10 border-b border-border/70 last:border-0 hover:bg-info-soft/40">
      <td className="px-3 align-middle text-xs text-muted-foreground">{fmtRelative(n.at)}</td>
      <td className="max-w-[320px] px-3 align-middle">
        <div className="flex items-start gap-1.5">
          <Icon className={cn('mt-0.5 size-3.5 shrink-0', tone)} />
          <div className="min-w-0">
            <div className={cn('truncate text-xs', n.isUnread ? 'font-medium' : 'font-normal', 'text-foreground')}>{n.title}</div>
            {n.body && <div className="truncate text-2xs text-muted-foreground">{n.body}</div>}
          </div>
        </div>
      </td>
      <td className="px-3 align-middle">
        {n.route && n.entityId ? (
          <Link to={n.route} className="font-mono text-2xs text-info hover:underline">
            {n.entityId}
          </Link>
        ) : (
          <span className="font-mono text-2xs text-muted-foreground">{n.entityId ?? 'n/a'}</span>
        )}
      </td>
      <td className="px-3 align-middle text-xs text-foreground">{n.rung ?? ''}</td>
      <td className="px-3 align-middle text-xs text-muted-foreground">{n.sentTo ?? ''}</td>
      <td className="px-3 align-middle text-xs text-foreground">{CHANNEL_LABEL[n.channel] ?? n.channel}</td>
      <td className="px-3 align-middle text-right">
        <StatusChip status={DELIVERY_LABEL[n.delivery] ?? n.delivery} tone={DELIVERY_TONE[n.delivery]} />
      </td>
    </tr>
  )
}

function Th({
  label,
  sortKey,
  sort,
  onSort,
  align,
}: {
  label: string
  sortKey?: string
  sort?: SortState
  onSort?: (key: string) => void
  align?: 'right'
}) {
  const active = Boolean(sort && sortKey && sort.key === sortKey)
  return (
    <th
      className={cn(
        'sticky top-0 z-10 bg-background px-3 py-2 text-left text-2xs font-semibold uppercase tracking-wide text-muted-foreground',
        align === 'right' && 'text-right',
        sortKey && 'cursor-pointer select-none hover:text-foreground',
      )}
      onClick={() => sortKey && onSort?.(sortKey)}
    >
      <span className={cn('inline-flex items-center gap-1', align === 'right' && 'flex-row-reverse')}>
        {label}
        {sortKey &&
          (active ? (
            sort!.dir === 'asc' ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />
          ) : (
            <ChevronsUpDown className="size-3 opacity-40" />
          ))}
      </span>
    </th>
  )
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  options: Array<{ value: string; label: string }>
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-7 rounded-md border border-border bg-background px-1.5 text-xs outline-none focus:ring-2 focus:ring-ring"
    >
      <option value="">{label}: All</option>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {label}: {o.label}
        </option>
      ))}
    </select>
  )
}

function NotificationsEmpty() {
  return (
    <div className="card-surface flex flex-col items-center gap-2 px-4 py-12 text-center">
      <Bell className="size-6 text-muted-foreground" />
      <div className="text-sm font-medium text-foreground">Nothing has been sent to you</div>
      <div className="max-w-md text-xs text-muted-foreground">Reminders and escalations appear here as they fire.</div>
    </div>
  )
}
