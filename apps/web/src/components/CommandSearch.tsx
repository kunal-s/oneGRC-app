import * as React from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, CornerDownLeft } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useApp } from '@/store'
import { WORLD } from '@/data'
import { NAV_ITEMS } from './nav-config'

interface SearchEntry {
  id: string
  label: string
  sub: string
  group: string
  route: string
}

// Build a flat search index once.
const INDEX: SearchEntry[] = (() => {
  const out: SearchEntry[] = []
  for (const n of NAV_ITEMS) out.push({ id: n.to, label: n.label, sub: 'Navigate', group: 'Pages', route: n.to })
  for (const r of WORLD.risks) out.push({ id: r.id, label: r.title, sub: r.id, group: 'Risks', route: `/risks/${r.id}` })
  for (const c of WORLD.controls) out.push({ id: c.id, label: c.title, sub: c.id, group: 'Controls', route: `/controls/${c.id}` })
  for (const i of WORLD.incidents) out.push({ id: i.id, label: i.title, sub: i.id, group: 'Incidents', route: `/incidents/${i.id}` })
  for (const o of WORLD.obligations) out.push({ id: o.id, label: o.title, sub: `${o.id} · ${o.regulator}`, group: 'Obligations', route: `/obligations/${o.id}` })
  for (const p of WORLD.policies) out.push({ id: p.id, label: p.title, sub: `${p.id} · ${p.version}`, group: 'Policies', route: `/policies/${p.id}` })
  for (const a of WORLD.audits) out.push({ id: a.id, label: a.title, sub: a.id, group: 'Audits', route: `/audits/${a.id}` })
  for (const rc of WORLD.regChanges) out.push({ id: rc.id, label: rc.summary, sub: `${rc.id} · ${rc.source}`, group: 'Reg-change', route: `/reg-change/${rc.id}` })
  return out
})()

export function CommandSearch() {
  const open = useApp((s) => s.commandOpen)
  const setOpen = useApp((s) => s.setCommandOpen)
  const navigate = useNavigate()
  const [query, setQuery] = React.useState('')
  const [active, setActive] = React.useState(0)
  const inputRef = React.useRef<HTMLInputElement>(null)

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
      setActive(0)
      setTimeout(() => inputRef.current?.focus(), 30)
    }
  }, [open])

  const results = React.useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return INDEX.filter((e) => e.group === 'Pages').slice(0, 8)
    const scored = INDEX.filter((e) => e.label.toLowerCase().includes(q) || e.id.toLowerCase().includes(q))
    return scored.slice(0, 24)
  }, [query])

  React.useEffect(() => setActive(0), [query])

  if (!open) return null

  const go = (e: SearchEntry) => {
    navigate(e.route)
    setOpen(false)
  }

  const grouped: Record<string, SearchEntry[]> = {}
  for (const r of results) (grouped[r.group] ??= []).push(r)
  const flat = results

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
              } else if (e.key === 'Enter' && flat[active]) {
                go(flat[active])
              }
            }}
            placeholder="Search risks, controls, incidents, obligations, pages…"
            className="h-12 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 text-2xs text-muted-foreground">ESC</kbd>
        </div>
        <div className="scrollbar-thin max-h-[52vh] overflow-y-auto py-1.5">
          {flat.length === 0 && (
            <div className="px-4 py-6 text-center text-xs text-muted-foreground">
              No matches for “{query}”. Try an id like <span className="font-mono">INC-2026-0411</span>.
            </div>
          )}
          {Object.entries(grouped).map(([group, entries]) => (
            <div key={group} className="mb-1">
              <div className="px-3.5 py-1 text-2xs font-semibold uppercase tracking-wide text-muted-foreground">{group}</div>
              {entries.map((e) => {
                const idx = flat.indexOf(e)
                return (
                  <button
                    key={e.route + e.id}
                    onMouseEnter={() => setActive(idx)}
                    onClick={() => go(e)}
                    className={cn(
                      'flex w-full items-center gap-2 px-3.5 py-1.5 text-left',
                      idx === active ? 'bg-info-soft/60' : 'hover:bg-muted',
                    )}
                  >
                    <span className="min-w-0 flex-1 truncate text-sm text-foreground">{e.label}</span>
                    <span className="font-mono text-2xs text-muted-foreground">{e.sub}</span>
                    {idx === active && <CornerDownLeft className="size-3.5 text-muted-foreground" />}
                  </button>
                )
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
