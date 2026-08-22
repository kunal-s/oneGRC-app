import { Building2 } from 'lucide-react'
import { useScope, departmentFilterOptions, type Scope } from '@/lib/access'
import { cn } from '@/lib/utils'

/**
 * Compact department selector (enhancement plan 1.1). Replaces the verbose scope
 * banner: the dropdown itself communicates the access boundary. Compliance and the
 * administrator can narrow to one department or see all; a department-locked user
 * sees only their own (the control is fixed and disabled).
 */
export function DepartmentSelect({
  value,
  onChange,
  className,
}: {
  value: string
  onChange: (v: string) => void
  className?: string
}) {
  const scope = useScope()
  const options = departmentFilterOptions(scope)
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

/** The initial selected value for a DepartmentSelect, given the active scope. */
export function initialDepartment(scope: Scope): string {
  return departmentFilterOptions(scope)[0]
}

/** Shown in place of a list when a department legitimately has no records of a
 *  kind under the access boundary — this is the boundary working, not a gap. */
export function ScopeEmpty({ entity }: { entity: string }) {
  const scope = useScope()
  return (
    <div className="card-surface flex flex-col items-center gap-2 px-4 py-12 text-center">
      <Building2 className="size-6 text-muted-foreground" />
      <div className="text-sm font-medium text-foreground">No {entity} in your department</div>
      <div className="max-w-md text-xs text-muted-foreground">
        The {scope.department} department owns no {entity}.
      </div>
    </div>
  )
}
