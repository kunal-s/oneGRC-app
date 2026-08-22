import * as React from 'react'
import { Check, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useApp } from '@/store'
import { PERSONAS, PEOPLE_BY_ID, personaFor, type PersonaOption } from '@/data/people'
import { Avatar } from './Avatar'

export function RoleSwitcher() {
  const personId = useApp((s) => s.personId)
  const role = useApp((s) => s.role)
  const setPersona = useApp((s) => s.setPersona)
  const [open, setOpen] = React.useState(false)
  const ref = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  // One person can hold two personas (a function and a committee chair), so the
  // active entry is the (person, role) pair, not the person alone.
  const current = personaFor(personId, role)
  const person = PEOPLE_BY_ID[current.id]
  const functional = PERSONAS.filter((p) => !p.group)
  const committee = PERSONAS.filter((p) => p.group === 'Committee')

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-md border border-border bg-background py-1 pl-1 pr-2 transition-colors hover:bg-muted"
      >
        <Avatar id={current.id} size={26} />
        <span className="hidden text-left lg:block">
          <span className="block text-xs font-semibold leading-tight text-foreground">{current.label}</span>
          <span className="block text-2xs leading-tight text-muted-foreground">{person.name} · {person.department}</span>
        </span>
        <ChevronDown className="size-3.5 text-muted-foreground" />
      </button>
      {open && (
        <div className="absolute right-0 top-full z-50 mt-1 w-72 rounded-lg border border-border bg-background p-1 shadow-lg animate-slide-up">
          <div className="px-2 py-1.5 text-2xs font-semibold uppercase tracking-wide text-muted-foreground">
            Switch persona
          </div>
          {functional.map((r) => (
            <PersonaRow
              key={r.key}
              option={r}
              active={r.key === current.key}
              onSelect={() => {
                setPersona(r.id, r.role)
                setOpen(false)
              }}
            />
          ))}
          <div className="mt-1 border-t border-border px-2 pb-1 pt-2 text-2xs font-semibold uppercase tracking-wide text-muted-foreground">
            Board committees
          </div>
          {committee.map((r) => (
            <PersonaRow
              key={r.key}
              option={r}
              active={r.key === current.key}
              onSelect={() => {
                setPersona(r.id, r.role)
                setOpen(false)
              }}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function PersonaRow({ option, active, onSelect }: { option: PersonaOption; active: boolean; onSelect: () => void }) {
  const p = PEOPLE_BY_ID[option.id]
  return (
    <button
      onClick={onSelect}
      className={cn(
        'flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-muted',
        active && 'bg-info-soft/60',
      )}
    >
      <Avatar id={option.id} size={28} />
      <div className="min-w-0 flex-1">
        <div className="text-xs font-medium text-foreground">{option.label}</div>
        <div className="truncate text-2xs text-muted-foreground">
          {p.name} · {option.group === 'Committee' ? p.title : p.department}
        </div>
      </div>
      {active && <Check className="size-4 text-info" />}
    </button>
  )
}
