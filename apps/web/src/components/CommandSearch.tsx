import * as React from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Search, CornerDownLeft } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useApp } from '@/store'
import { ApiError } from '@/api/client'
import { fetchScope, search as runSearch, type SearchResponse } from '@/api/functions'
import { AsOfStamp } from './states'
import { navGroupsForRoles, navBottomForRoles } from './nav-config'

/**
 * R-006, SRCH-001, ENG-16: the palette renders `GET /search`'s own result.
 * There is no browser-side index any more: no `INDEX` constant, no `WORLD`
 * import. Pages are the one thing that never was a registered kind
 * (SRCH-002, SRCH-003) and stay a client-side concern, built from the
 * caller's own navigation over the same `s.roles` the sidebar reads
 * (SCR-081-080), never from a second visibility rule (SCR-081-081).
 *
 * Layout, typography, colour, iconography and every key binding are
 * unchanged from the prototype (`573599c`). The only additions are the
 * loading and error states, the truncation line and the scope footer.
 */

interface PaletteRow {
  id: string
  label: string
  subLabel: string
  route: string
}

interface PaletteGroup {
  group: string
  rows: PaletteRow[]
}

export function CommandSearch() {
  const open = useApp((s) => s.commandOpen)
  const setOpen = useApp((s) => s.setCommandOpen)
  const roles = useApp((s) => s.roles)
  const navigate = useNavigate()
  const [query, setQuery] = React.useState('')
  const [debounced, setDebounced] = React.useState('')
  const [active, setActive] = React.useState(0)
  const [serverResults, setServerResults] = React.useState<SearchResponse | null>(null)
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const inputRef = React.useRef<HTMLInputElement>(null)

  const { data: scope } = useQuery({ queryKey: ['scope'], queryFn: fetchScope, enabled: open })

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setOpen(!open)
      }
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, setOpen])

  React.useEffect(() => {
    if (open) {
      setQuery('')
      setDebounced('')
      setActive(0)
      setServerResults(null)
      setError(null)
      setLoading(false)
      setTimeout(() => inputRef.current?.focus(), 30)
    }
  }, [open])

  // SCR-081-040: keystrokes are debounced at 200ms.
  React.useEffect(() => {
    const t = setTimeout(() => setDebounced(query), 200)
    return () => clearTimeout(t)
  }, [query])

  // SCR-081-040: an in-flight request is cancelled when a newer one is
  // issued, so a stale result set can never arrive after the query that
  // superseded it (SRCH-025: no minimum length, a one-character query runs).
  React.useEffect(() => {
    const trimmed = debounced.trim()
    if (!trimmed) {
      setServerResults(null)
      setError(null)
      setLoading(false)
      return
    }
    const controller = new AbortController()
    setLoading(true)
    setError(null)
    runSearch(trimmed, controller.signal)
      .then((res) => {
        setServerResults(res)
        setLoading(false)
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === 'AbortError') return
        setServerResults(null)
        setError(err instanceof ApiError ? err.message : 'the search request failed')
        setLoading(false)
      })
    return () => controller.abort()
  }, [debounced])

  const trimmedQuery = query.trim()

  const pagesAll = React.useMemo(() => {
    const items = [...navGroupsForRoles(roles).flatMap((g) => g.items), ...navBottomForRoles(roles)]
    return items.map((item): PaletteRow => ({ id: item.to, label: item.label, subLabel: 'Navigate', route: item.to }))
  }, [roles])

  const pagesRows = React.useMemo(() => {
    if (!trimmedQuery) return pagesAll.slice(0, 8)
    const q = trimmedQuery.toLowerCase()
    return pagesAll.filter((p) => p.label.toLowerCase().includes(q)).slice(0, 8)
  }, [pagesAll, trimmedQuery])

  const groups: PaletteGroup[] = []
  if (pagesRows.length > 0) groups.push({ group: 'Pages', rows: pagesRows })
  if (trimmedQuery && serverResults) {
    for (const g of serverResults.groups) {
      groups.push({ group: g.group, rows: g.hits.map((h) => ({ id: h.id, label: h.label, subLabel: h.subLabel, route: h.route })) })
    }
  }
  const flat = groups.flatMap((g) => g.rows)
  const activeIdx = flat.length === 0 ? 0 : Math.min(active, flat.length - 1)

  React.useEffect(() => setActive(0), [query])

  if (!open) return null

  const go = (row: PaletteRow) => {
    navigate(row.route)
    setOpen(false)
  }

  const showSearching = trimmedQuery !== '' && loading && !serverResults && !error
  const showError = trimmedQuery !== '' && !!error
  const showEmpty = trimmedQuery !== '' && !loading && !error && flat.length === 0
  const serverShown = serverResults?.groups.reduce((n, g) => n + g.hits.length, 0) ?? 0
  const serverTotal = serverResults?.total ?? 0
  const showTruncation = !showError && !showEmpty && serverTotal > serverShown

  return (
    <div className="fixed inset-0 z-[70] flex items-start justify-center pt-[12vh]">
      <div className="absolute inset-0 bg-foreground/25 backdrop-blur-[1px] animate-fade-in" onClick={() => setOpen(false)} />
      <div className="relative z-10 w-full max-w-xl overflow-hidden rounded-xl border border-border bg-background shadow-2xl animate-slide-up">
        <div className="flex items-center gap-2 border-b border-border px-3.5">
          <Search className="size-4 text-muted-foreground" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') {
                e.preventDefault()
                setActive((a) => Math.min(a + 1, flat.length - 1))
              } else if (e.key === 'ArrowUp') {
                e.preventDefault()
                setActive((a) => Math.max(a - 1, 0))
              } else if (e.key === 'Enter' && flat[activeIdx]) {
                go(flat[activeIdx])
              }
            }}
            placeholder="Search risks, controls, incidents, obligations, pages…"
            className="h-12 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 text-2xs text-muted-foreground">ESC</kbd>
        </div>
        <div className="scrollbar-thin max-h-[52vh] overflow-y-auto py-1.5">
          {showSearching && <div className="px-4 py-6 text-center text-xs text-muted-foreground">Searching…</div>}
          {showError && <div className="px-4 py-6 text-center text-xs text-muted-foreground">Search is unavailable. {error}</div>}
          {showEmpty && (
            <div className="px-4 py-6 text-center text-xs text-muted-foreground">
              <div>
                No matches for “{trimmedQuery}”. Try an id like <span className="font-mono">OBL-0142</span>.
              </div>
              {scope && !scope.seesAll && (
                <div className="mt-1">Records outside {scope.department} stay reachable by their identifier.</div>
              )}
            </div>
          )}
          {!showSearching &&
            !showError &&
            groups.map((g) => (
              <div key={g.group} className="mb-1">
                <div className="px-3.5 py-1 text-2xs font-semibold uppercase tracking-wide text-muted-foreground">{g.group}</div>
                {g.rows.map((row) => {
                  const idx = flat.indexOf(row)
                  return (
                    <button
                      key={row.route + row.id}
                      onMouseEnter={() => setActive(idx)}
                      onClick={() => go(row)}
                      className={cn(
                        'flex w-full items-center gap-2 px-3.5 py-1.5 text-left',
                        idx === activeIdx ? 'bg-info-soft/60' : 'hover:bg-muted',
                      )}
                    >
                      <span className="min-w-0 flex-1 truncate text-sm text-foreground">{row.label}</span>
                      <span className="font-mono text-2xs text-muted-foreground">{row.subLabel}</span>
                      {idx === activeIdx && <CornerDownLeft className="size-3.5 text-muted-foreground" />}
                    </button>
                  )
                })}
              </div>
            ))}
          {showTruncation && (
            <div className="px-3.5 py-1.5 text-2xs text-muted-foreground">
              Showing {serverShown} of {serverTotal} matches. Narrow the search.
            </div>
          )}
          {/* CLK-008, CLK-009, CLK-010: one "as at" stamp for the whole surface. */}
          {serverResults && (
            <div className="px-3.5 py-1">
              <AsOfStamp instant={serverResults.asOf} timezone={serverResults.timezone} />
            </div>
          )}
        </div>
        {scope && (
          <div className="border-t border-border px-3.5 py-1.5 text-2xs text-muted-foreground">Searching {scope.label}.</div>
        )}
      </div>
    </div>
  )
}
