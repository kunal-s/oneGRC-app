import { Building2 } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { fetchScope } from '@/api/functions'
import { ALL_DEPARTMENTS_LABEL, DEPARTMENTS } from '@/lib/access'
import { cn } from '@/lib/utils'

/**
 * SCR-088: the department selector, reading from R-064 (`GET /scope`)
 * instead of `useScope()` in `apps/web/src/lib/access.ts`, which derived the
 * boundary in the browser from the role switcher over the seed
 * (SCR-088-014). Every visual line at SCR-088-001 to 005 is unchanged; only
 * the source of the three values is.
 *
 * `useScope()` and the rest of `access.ts` keep serving the pages this slice
 * does not rewire (SCR-088-092, and section 8 of the work order): the option
 * list and the "all departments" label are the one piece of that module
 * that is pure static reference data, not session-derived, so they are
 * still imported from there rather than duplicated here.
 */
function useServerScope() {
  return useQuery({ queryKey: ['scope'], queryFn: fetchScope })
}

export function DepartmentSelect({
  value,
  onChange,
  className,
}: {
  value: string
  onChange: (v: string) => void
  className?: string
}) {
  const { data: scope } = useServerScope()
  // While R-064 is in flight there is nothing yet to decide (GAP-SCR-011-090's
  // pattern): SCR-088-050 holds the loading treatment for step 11, so this
  // renders nothing rather than a half-known control.
  if (!scope) return null

  const options = scope.seesAll ? [ALL_DEPARTMENTS_LABEL, ...DEPARTMENTS] : [scope.department]
  return (
    <label className={cn('inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-background px-2 text-xs', className)}>
      <Building2 className="size-3.5 shrink-0 text-muted-foreground" />
      <span className="text-muted-foreground">Department</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={!scope.seesAll}
        className="max-w-[200px] bg-transparent text-xs font-medium text-foreground outline-none disabled:cursor-default"
      >
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </label>
  )
}

/**
 * The initial selected value for a DepartmentSelect, given a caller's scope.
 * `department` stays optional here: the pages this slice does not rewire
 * still call this with `access.ts`'s client-derived `Scope`, whose
 * `department` can be absent.
 */
export function initialDepartment(scope: { seesAll: boolean; department?: string } | undefined): string {
  if (!scope) return ''
  return scope.seesAll ? ALL_DEPARTMENTS_LABEL : (scope.department ?? 'Unassigned')
}

/** Shown in place of a list when a department legitimately has no records of a
 *  kind under the access boundary: this is the boundary working, not a gap. */
export function ScopeEmpty({ entity }: { entity: string }) {
  const { data: scope } = useServerScope()
  return (
    <div className="card-surface flex flex-col items-center gap-2 px-4 py-12 text-center">
      <Building2 className="size-6 text-muted-foreground" />
      <div className="text-sm font-medium text-foreground">No {entity} in your department</div>
      <div className="max-w-md text-xs text-muted-foreground">
        The {scope?.department ?? 'your'} department owns no {entity}.
      </div>
    </div>
  )
}
