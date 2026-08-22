import { cn } from '@/lib/utils'
import { PEOPLE_BY_ID } from '@/data/people'

const HUES = [210, 250, 280, 160, 20, 340, 190, 120]

export function Avatar({ id, size = 24, className }: { id: string; size?: number; className?: string }) {
  const p = PEOPLE_BY_ID[id]
  const initials = p?.initials ?? id.slice(0, 2).toUpperCase()
  const hue = HUES[(id.charCodeAt(0) + (id.charCodeAt(1) || 0)) % HUES.length]
  return (
    <span
      className={cn('inline-flex items-center justify-center rounded-full font-semibold text-white shrink-0', className)}
      style={{
        width: size,
        height: size,
        fontSize: size * 0.4,
        background: `linear-gradient(135deg, hsl(${hue} 55% 48%), hsl(${hue} 55% 38%))`,
      }}
      title={p ? `${p.name} · ${p.title}` : id}
    >
      {initials}
    </span>
  )
}

export function PersonInline({ id, className, sub }: { id: string; className?: string; sub?: boolean }) {
  const p = PEOPLE_BY_ID[id]
  return (
    <span className={cn('inline-flex items-center gap-1.5', className)}>
      <Avatar id={id} size={20} />
      <span className="truncate">
        <span className="text-foreground">{p?.name ?? id}</span>
        {sub && p && <span className="ml-1 text-2xs text-muted-foreground">{p.title}</span>}
      </span>
    </span>
  )
}
