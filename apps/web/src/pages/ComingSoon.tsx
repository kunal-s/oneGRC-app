import { useLocation } from 'react-router-dom'
import { Hammer } from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import { NAV_ITEMS } from '@/components/nav-config'

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
        <div className="text-base font-semibold text-foreground">Page not found</div>
        <p className="max-w-md text-sm text-muted-foreground">
          The page <span className="font-medium text-foreground">{label}</span> couldn’t be located. Use the
          left navigation or ⌘K search to find risks, controls, incidents, obligations and more.
        </p>
      </div>
    </div>
  )
}
