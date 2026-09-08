import { useLocation } from 'react-router-dom'
import { Hammer } from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import { NAV_ITEMS } from '@/components/nav-config'

/**
 * SCR-080-020, STATE-033: the surface for a route with nothing behind it,
 * not an unknown address (that is `NotFound`, the `*` route). No route
 * renders it in that role today (DN-047's other half): the nearest real
 * condition in this build is a module with no table yet, not a deployment
 * state nothing in the data model records.
 */
export function ComingSoon({ title }: { title?: string }) {
  const { pathname } = useLocation()
  const match = NAV_ITEMS.find((n) => n.to === pathname || (n.to !== '/' && pathname.startsWith(n.to)))
  const label = title ?? match?.label ?? 'Section'

  return (
    <div>
      <PageHeader
        eyebrow="OneGRC"
        title={label}
        description="This page isn’t available."
      />
      <div className="card-surface flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
        <div className="flex size-12 items-center justify-center rounded-xl bg-muted text-muted-foreground">
          <Hammer className="size-6" />
        </div>
        <div className="text-base font-semibold text-foreground">Not built in this release</div>
        <p className="max-w-md text-sm text-muted-foreground">
          <span className="font-medium text-foreground">{label}</span> has nothing behind it yet. Use the
          left navigation or ⌘K search to find risks, controls, incidents, obligations and more.
        </p>
      </div>
    </div>
  )
}
