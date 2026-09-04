import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import { Check, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useApp } from '@/store'
import { whoAmI } from '@/api/functions'
import type { ViewOption } from '@/api/types'
import { departmentLabel } from '@/lib/views'
import { PEOPLE } from '@/data/people'
import { Avatar } from './Avatar'

/**
 * SCR-082: the control in the top bar. Reads its entries from R-001
 * (SCR-082-050, SCR-082-051), never from the old PERSONAS list
 * (SCR-082-052). Selecting an entry changes altitude only: the person shown
 * is always the signed-in person, on every entry, in every state
 * (SCR-082-011, D-045).
 */
export function RoleSwitcher() {
  const viewKey = useApp((s) => s.viewKey)
  const setView = useApp((s) => s.setView)
  const [open, setOpen] = React.useState(false)
  const ref = React.useRef<HTMLDivElement>(null)
  const who = useQuery({ queryKey: ['whoami'], queryFn: whoAmI, retry: false })

  React.useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  // SCR-082-060: no loading state built this slice. Nothing renders while
  // whoami is in flight or absent, same treatment as GAP-SCR-011-090.
  if (!who.data) return null
  const data = who.data

  const views = data.views
  const functional = views.filter((v) => v.group !== 'Committee')
  const committee = views.filter((v) => v.group === 'Committee')
  const current = views.find((v) => v.key === viewKey) ?? views[0]
  // Transitional bridge to the roster this Avatar was built against (D-031).
  // Every row shows the SAME avatar: the signed-in person, never anyone else.
  const avatarId = PEOPLE.find((p) => p.name === data.fullName)?.id ?? data.personId

  // SCR-082-012: exactly one view, so static text, no chevron, no menu.
  if (views.length <= 1) {
    return (
      <div className="flex items-center gap-2 rounded-md border border-border bg-background py-1 pl-1 pr-2">
        <Avatar id={avatarId} size={26} />
        <span className="hidden text-left lg:block">
          <span className="block text-xs font-semibold leading-tight text-foreground">{current?.label}</span>
          <span className="block text-2xs leading-tight text-muted-foreground">
            {data.fullName} · {departmentLabel(data.department)}
          </span>
        </span>
      </div>
    )
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-md border border-border bg-background py-1 pl-1 pr-2 transition-colors hover:bg-muted"
      >
        <Avatar id={avatarId} size={26} />
        <span className="hidden text-left lg:block">
          <span className="block text-xs font-semibold leading-tight text-foreground">{current?.label}</span>
          <span className="block text-2xs leading-tight text-muted-foreground">
            {data.fullName} · {departmentLabel(data.department)}
          </span>
        </span>
        <ChevronDown className="size-3.5 text-muted-foreground" />
      </button>
      {open && (
        <div className="absolute right-0 top-full z-50 mt-1 w-72 rounded-lg border border-border bg-background p-1 shadow-lg animate-slide-up">
          <div className="px-2 py-1.5 text-2xs font-semibold uppercase tracking-wide text-muted-foreground">
            Switch persona
          </div>
          {functional.map((v) => (
            <PersonaRow
              key={v.key}
              view={v}
              avatarId={avatarId}
              fullName={data.fullName}
              sub={departmentLabel(data.department)}
              active={v.key === current?.key}
              onSelect={() => {
                setView(v)
                setOpen(false)
              }}
            />
          ))}
          <div className="mt-1 border-t border-border px-2 pb-1 pt-2 text-2xs font-semibold uppercase tracking-wide text-muted-foreground">
            Board committees
          </div>
          {committee.map((v) => (
            <PersonaRow
              key={v.key}
              view={v}
              avatarId={avatarId}
              fullName={data.fullName}
              sub={data.jobTitle}
              active={v.key === current?.key}
              onSelect={() => {
                setView(v)
                setOpen(false)
              }}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function PersonaRow({
  view,
  avatarId,
  fullName,
  sub,
  active,
  onSelect,
}: {
  view: ViewOption
  avatarId: string
  fullName: string
  sub: string
  active: boolean
  onSelect: () => void
}) {
  return (
    <button
      onClick={onSelect}
      className={cn(
        'flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-muted',
        active && 'bg-info-soft/60',
      )}
    >
      <Avatar id={avatarId} size={28} />
      <div className="min-w-0 flex-1">
        <div className="text-xs font-medium text-foreground">{view.label}</div>
        <div className="truncate text-2xs text-muted-foreground">
          {fullName} · {sub}
        </div>
      </div>
      {active && <Check className="size-4 text-info" />}
    </button>
  )
}
