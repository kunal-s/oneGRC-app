import * as React from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { REGULATOR_COLORS } from '@/lib/regulators'
import { NOW_MS } from '@/lib/time'
import { filingTiming } from '@/lib/cycles'
import type { Obligation } from '@/types'

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const IST_OFFSET = (5 * 60 + 30) * 60000

// IST calendar parts for a date
function istYMD(ms: number) {
  const d = new Date(ms + IST_OFFSET)
  return { y: d.getUTCFullYear(), m: d.getUTCMonth(), day: d.getUTCDate() }
}

// An obligation is "completed" once it has been Filed; everything else is still
// owed (Due / Overdue / In review) and therefore "pending".
const isCompleted = (o: Obligation) => o.status === 'Filed'

type StatusFilter = 'pending' | 'completed' | 'all'

export function ObligationCalendar({
  obligations,
  compact = false,
  controlled = false,
}: {
  obligations: Obligation[]
  /** Tighter cells + fewer chips per day, for the Home / My Queue embeds. */
  compact?: boolean
  /** Status is filtered by an external toolbar (Obligations workbench) — hide the
   *  built-in Pending/Completed/All toggle and render exactly what is passed. */
  controlled?: boolean
}) {
  const navigate = useNavigate()
  const nowParts = istYMD(NOW_MS)
  const [view, setView] = React.useState({ y: nowParts.y, m: nowParts.m })
  // Default to Pending — the actionable cut: what the user still owes (1.x calendar).
  const [status, setStatus] = React.useState<StatusFilter>(controlled ? 'all' : 'pending')

  const counts = React.useMemo(() => {
    let pending = 0
    let completed = 0
    for (const o of obligations) (isCompleted(o) ? (completed += 1) : (pending += 1))
    return { pending, completed, all: obligations.length }
  }, [obligations])

  const filtered = React.useMemo(
    () =>
      obligations.filter((o) =>
        status === 'all' ? true : status === 'completed' ? isCompleted(o) : !isCompleted(o),
      ),
    [obligations, status],
  )

  const byDay = React.useMemo(() => {
    const map = new Map<string, Obligation[]>()
    for (const o of filtered) {
      const p = istYMD(new Date(o.dueDate).getTime())
      const key = `${p.y}-${p.m}-${p.day}`
      ;(map.get(key) ?? map.set(key, []).get(key)!).push(o)
    }
    return map
  }, [filtered])

  const firstDow = new Date(Date.UTC(view.y, view.m, 1)).getUTCDay()
  const daysInMonth = new Date(Date.UTC(view.y, view.m + 1, 0)).getUTCDate()
  const cells: (number | null)[] = []
  for (let i = 0; i < firstDow; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)
  while (cells.length % 7 !== 0) cells.push(null)

  const move = (delta: number) => {
    setView((v) => {
      const m = v.m + delta
      if (m < 0) return { y: v.y - 1, m: 11 }
      if (m > 11) return { y: v.y + 1, m: 0 }
      return { y: v.y, m }
    })
  }

  const monthCount = filtered.filter((o) => {
    const p = istYMD(new Date(o.dueDate).getTime())
    return p.y === view.y && p.m === view.m
  }).length

  const cap = compact ? 2 : 3
  const minH = compact ? 'min-h-[58px]' : 'min-h-[78px]'

  return (
    <div className={cn(!compact && 'card-surface', compact ? 'p-0' : 'p-3')}>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <button onClick={() => move(-1)} className="rounded-md border border-border p-1 hover:bg-muted">
            <ChevronLeft className="size-4" />
          </button>
          <div className="w-36 text-center text-sm font-semibold text-foreground">
            {MONTHS[view.m]} {view.y}
          </div>
          <button onClick={() => move(1)} className="rounded-md border border-border p-1 hover:bg-muted">
            <ChevronRight className="size-4" />
          </button>
          <button
            onClick={() => setView({ y: nowParts.y, m: nowParts.m })}
            className="ml-1 rounded-md border border-border px-2 py-1 text-2xs font-medium text-muted-foreground hover:bg-muted"
          >
            Today
          </button>
        </div>

        {/* Pending / Completed / All — the intuitive "what's done vs owed" cut.
            Hidden when an external toolbar controls the status (workbench). */}
        {!controlled && (
          <div className="flex items-center rounded-md border border-border p-0.5">
            <StatusToggle active={status === 'pending'} onClick={() => setStatus('pending')} label="Pending" count={counts.pending} tone="pending" />
            <StatusToggle active={status === 'completed'} onClick={() => setStatus('completed')} label="Completed" count={counts.completed} tone="completed" />
            <StatusToggle active={status === 'all'} onClick={() => setStatus('all')} label="All" count={counts.all} tone="all" />
          </div>
        )}
      </div>

      {!compact && (
        <div className="mb-2 flex items-center justify-end gap-2 text-2xs text-muted-foreground">
          <span className="tnum">{monthCount} {status === 'completed' ? 'filed' : status === 'pending' ? 'due' : 'tracked'} this month</span>
          <span className="h-3 w-px bg-border" />
          {Object.entries(REGULATOR_COLORS).map(([r, c]) => (
            <span key={r} className="inline-flex items-center gap-1">
              <span className="size-1.5 rounded-full" style={{ background: c.dot }} />
              {r}
            </span>
          ))}
        </div>
      )}

      <div className="grid grid-cols-7 gap-1">
        {DOW.map((d) => (
          <div key={d} className="px-1 py-0.5 text-center text-2xs font-semibold uppercase tracking-wide text-muted-foreground">
            {compact ? d[0] : d}
          </div>
        ))}
        {cells.map((day, i) => {
          if (day === null) return <div key={i} className={cn(minH, 'rounded-md bg-muted/20')} />
          const key = `${view.y}-${view.m}-${day}`
          const items = byDay.get(key) ?? []
          const isToday = view.y === nowParts.y && view.m === nowParts.m && day === nowParts.day
          return (
            <div
              key={i}
              className={cn(
                minH,
                'rounded-md border p-1',
                isToday ? 'border-info bg-info-soft/30' : 'border-border bg-background',
              )}
            >
              <div className={cn('mb-0.5 text-2xs font-semibold tnum', isToday ? 'text-info' : 'text-muted-foreground')}>
                {day}
                {isToday && !compact && <span className="ml-1 font-normal">today</span>}
              </div>
              <div className="space-y-0.5">
                {items.slice(0, cap).map((o) => {
                  const c = REGULATOR_COLORS[o.regulator]
                  const done = isCompleted(o)
                  const late = done && filingTiming(o) === 'late'
                  const overdue = o.status === 'Overdue'
                  return (
                    <button
                      key={o.id}
                      onClick={() => navigate(`/obligations/${o.id}`)}
                      title={`${o.regulator} · ${o.title} · ${o.status}${done ? ` · filed ${late ? 'late' : 'on time'}` : ''}`}
                      className={cn(
                        'flex w-full items-center gap-1 truncate rounded px-1 py-0.5 text-left text-2xs',
                        done
                          ? late
                            ? 'bg-medium-soft/70 text-medium hover:bg-medium-soft'
                            : 'bg-ok-soft/60 text-ok hover:bg-ok-soft'
                          : overdue
                            ? 'bg-critical-soft text-critical'
                            : 'hover:bg-muted',
                      )}
                    >
                      {done ? (
                        <Check className="size-2.5 shrink-0" />
                      ) : (
                        <span className="size-1.5 shrink-0 rounded-full" style={{ background: overdue ? undefined : c.dot }} />
                      )}
                      <span className={cn('truncate', done && 'line-through opacity-80')}>{o.title}</span>
                      {late && <span className="ml-auto shrink-0 text-[9px] font-semibold uppercase">late</span>}
                    </button>
                  )
                })}
                {items.length > cap && (
                  <div className="px-1 text-2xs text-muted-foreground">+{items.length - cap} more</div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function StatusToggle({
  active,
  onClick,
  label,
  count,
  tone,
}: {
  active: boolean
  onClick: () => void
  label: string
  count: number
  tone: 'pending' | 'completed' | 'all'
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1.5 rounded px-2 py-1 text-2xs font-medium transition-colors',
        active
          ? tone === 'completed'
            ? 'bg-ok text-white'
            : tone === 'pending'
              ? 'bg-primary text-primary-foreground'
              : 'bg-foreground text-background'
          : 'text-muted-foreground hover:text-foreground',
      )}
    >
      {label}
      <span className={cn('tnum', active ? 'opacity-80' : 'text-muted-foreground')}>{count}</span>
    </button>
  )
}
