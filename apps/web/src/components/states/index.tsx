import type { ReactNode } from 'react'
import { AlertTriangle, Building2, FileText, Lock, SearchX, type LucideIcon } from 'lucide-react'
import { fmtAsOf } from '@/lib/clock'

/**
 * STATE-001, ENG-17: the one vocabulary of empty, loading and error states,
 * imported by any screen that reads the server. The treatment is the
 * prototype's own (STATE-002): `EmptyState` and `ErrorNote` are moved here
 * unchanged from the middle of `pages/live/SourceLibrary.tsx`, where they
 * were a page's private helpers; `ScopeEmpty` is moved in unchanged from
 * `components/ScopeBanner.tsx`. Nothing new is drawn. What changes is that
 * there are eight states instead of three, and a screen picks the right one
 * (STATE-070): loading, then error, then not found, then no permission, then
 * the empty case, then the surface.
 */

/** STATE-010: the read is in flight and nothing is yet held. A line in the muted body treatment. */
export function LoadingState({ label }: { label: string }) {
  return <p className="text-sm text-muted-foreground">{label}</p>
}

/**
 * STATE-020: the read failed. Headed with what could not be loaded, carrying
 * the message the seam returned. Never used for a not-found (STATE-050) or
 * for a mutation's own refusal beside the control that attempted it, which
 * keeps this same treatment but no `subject` (SCR-094-011).
 */
export function ErrorNote({ error, subject }: { error: unknown; subject?: string }) {
  return (
    <div className="flex items-start gap-2 rounded-lg border border-critical/40 bg-critical-soft px-3 py-2">
      <AlertTriangle className="mt-0.5 size-4 shrink-0 text-critical" />
      <div className="text-sm">
        <p className="font-medium text-critical">{subject ? `Could not load ${subject}.` : 'Could not load from the API'}</p>
        <p className="text-xs text-muted-foreground">{(error as Error).message}</p>
      </div>
    </div>
  )
}

/**
 * STATE-030: the kind exists and the platform holds none of it, for anybody.
 * FRD §17.4's first case. `icon` defaults to the Source Library's own
 * `FileText`, the treatment's original icon; a different register names its
 * own without changing the border, spacing or type.
 */
export function EmptyState({ title, body, icon: Icon = FileText }: { title: string; body: string; icon?: LucideIcon }) {
  return (
    <div className="rounded-lg border border-dashed border-border px-6 py-10 text-center">
      <Icon className="mx-auto mb-2 size-6 text-muted-foreground" />
      <p className="text-sm font-medium text-foreground">{title}</p>
      <p className="mx-auto mt-1 max-w-md text-xs text-muted-foreground">{body}</p>
    </div>
  )
}

/**
 * STATE-031: records of this kind exist and none matches the filter in
 * force. Never shown when the filter set is empty, or it is lying about why.
 */
export function EmptyFiltered({ entity }: { entity: string }) {
  return (
    <div className="rounded-lg border border-dashed border-border px-6 py-10 text-center">
      <SearchX className="mx-auto mb-2 size-6 text-muted-foreground" />
      <p className="text-sm font-medium text-foreground">No {entity} match these filters</p>
      <p className="mx-auto mt-1 max-w-md text-xs text-muted-foreground">Clear a filter to widen the search.</p>
    </div>
  )
}

/**
 * STATE-032: records exist and none is owned in the caller's department.
 * SCR-088-040's exact wording: the boundary working, not a gap.
 */
export function ScopeEmpty({ entity, department }: { entity: string; department?: string }) {
  return (
    <div className="card-surface flex flex-col items-center gap-2 px-4 py-12 text-center">
      <Building2 className="size-6 text-muted-foreground" />
      <div className="text-sm font-medium text-foreground">No {entity} in your department</div>
      <div className="max-w-md text-xs text-muted-foreground">
        The {department ?? 'your'} department owns no {entity}.
      </div>
    </div>
  )
}

/**
 * STATE-040: the caller may not see this surface at all. Carries REF-02's or
 * REF-03's own catalogue text, rendered in this empty treatment rather than
 * the error treatment, because being refused is not a failure.
 */
export function NoPermissionState({ message }: { message: string }) {
  return (
    <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
      <Lock className="mt-0.5 size-3 shrink-0" />
      {message}
    </p>
  )
}

/**
 * STATE-050: REF-30's own message, character for character from the server,
 * in its own treatment. Not the error treatment (REFU-043): a refusal to
 * answer, not a report that the platform is broken. `message` is the exact
 * text the seam returned; the identifier at its head is rendered in
 * `font-mono` and the rest of the sentence follows it, so no wording is
 * duplicated client side. `back` is the way back STATE-050 requires.
 */
export function NotFoundState({ id, message, back }: { id: string; message: string; back: ReactNode }) {
  const rest = message.startsWith(id) ? message.slice(id.length) : ` ${message}`
  return (
    <div className="card-surface flex flex-col items-center gap-3 px-6 py-16 text-center">
      <SearchX className="size-6 text-muted-foreground" />
      <p className="text-sm text-foreground">
        <span className="font-mono">{id}</span>{rest}
      </p>
      {back}
    </div>
  )
}

/** STATE-060: a metric with no inputs reads `No data. <reason>`, never zero and never a value. */
export function MetricNoData({ reason }: { reason: string }) {
  return <p className="text-sm text-muted-foreground">No data. {reason}</p>
}

/**
 * CLK-009, CLK-010: one "As at" stamp per surface, at the foot, naming the
 * organisation's zone. `instant` and `timezone` are the server's own, never
 * one the browser invented. The treatment SLICE-04 established for the
 * scope footer at SCR-081-090 is the only precedent on an approved screen
 * for a line of provenance under a result (DN-049).
 */
export function AsOfStamp({ instant, timezone }: { instant: string; timezone: string }) {
  return <p className="text-2xs text-muted-foreground">{fmtAsOf(instant, timezone)}</p>
}
