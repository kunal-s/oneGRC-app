import { NavLink } from 'react-router-dom'
import { ShieldCheck } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useApp } from '@/store'
import { navGroupsForRoles, navBottomForRoles, type NavItem } from '../nav-config'

function Item({ item }: { item: NavItem }) {
  const Icon = item.icon
  return (
    <NavLink
      to={item.to}
      end={item.end}
      className={({ isActive }) =>
        cn(
          'group flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-[13px] font-medium transition-colors',
          isActive
            ? 'bg-primary text-primary-foreground'
            : 'text-muted-foreground hover:bg-muted hover:text-foreground',
        )
      }
    >
      {({ isActive }) => (
        <>
          <Icon className={cn('size-4 shrink-0', isActive ? 'text-primary-foreground' : 'text-muted-foreground group-hover:text-foreground')} />
          <span className="truncate">{item.label}</span>
        </>
      )}
    </NavLink>
  )
}

export function Sidebar() {
  const roles = useApp((s) => s.roles)
  const groups = navGroupsForRoles(roles)
  const bottom = navBottomForRoles(roles)
  return (
    <aside className="flex h-full w-60 shrink-0 flex-col border-r border-border bg-background">
      <div className="flex items-center gap-2.5 px-4 py-3.5">
        <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <ShieldCheck className="size-4.5" />
        </div>
        <div className="leading-tight">
          <div className="text-sm font-semibold tracking-tight text-foreground">OneGRC</div>
        </div>
      </div>

      <nav className="scrollbar-thin flex-1 space-y-3 overflow-y-auto px-2.5 pb-3">
        {groups.map((group, gi) => (
          <div key={gi}>
            {group.header && (
              <div className="px-2.5 pb-1 pt-1.5 text-2xs font-semibold uppercase tracking-wider text-muted-foreground/70">
                {group.header}
              </div>
            )}
            <div className="space-y-0.5">
              {group.items.map((item) => (
                <Item key={item.to} item={item} />
              ))}
            </div>
          </div>
        ))}
      </nav>

      {bottom.length > 0 && (
        <div className="space-y-0.5 border-t border-border px-2.5 py-2.5">
          {bottom.map((item) => (
            <Item key={item.to} item={item} />
          ))}
        </div>
      )}
    </aside>
  )
}
