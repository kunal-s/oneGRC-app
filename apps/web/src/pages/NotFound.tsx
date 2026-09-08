import { Compass } from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'

/**
 * SCR-080-010: the address-not-found surface, the `*` route. Distinct from
 * `ComingSoon` (STATE-033, a route with nothing behind it): this is what a
 * person sees after mistyping a URL, and it says nothing about whether they
 * could have opened something at that address (SCR-080-040, REF-30's own
 * reasoning). Every visual line from the prototype's `ComingSoon` stays
 * except two named deltas: the `Compass` icon in place of `Hammer`
 * (SCR-080-011), and this one sentence in place of the broken, interpolated
 * one it replaces (SCR-080-010).
 */
export function NotFound() {
  return (
    <div>
      <PageHeader eyebrow="OneGRC" title="Not found" description="This page isn’t available." />
      <div className="card-surface flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
        <div className="flex size-12 items-center justify-center rounded-xl bg-muted text-muted-foreground">
          <Compass className="size-6" />
        </div>
        <div className="text-base font-semibold text-foreground">Page not found</div>
        <p className="max-w-md text-sm text-muted-foreground">
          This address does not exist. Use the left navigation or ⌘K search to find risks, controls,
          incidents, obligations and more.
        </p>
      </div>
    </div>
  )
}
