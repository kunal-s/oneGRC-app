import * as React from 'react'
import { ChevronDown, ChevronUp, ChevronsUpDown, Search } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface Column<T> {
  key: string
  header: string
  render: (row: T) => React.ReactNode
  sortValue?: (row: T) => string | number
  className?: string
  headerClassName?: string
  align?: 'left' | 'right' | 'center'
}

export interface TableFilter<T> {
  key: string
  label: string
  options: string[]
  predicate: (row: T, value: string) => boolean
}

export function DataTable<T extends { id: string }>({
  data,
  columns,
  searchKeys,
  searchPlaceholder = 'Search…',
  filters,
  initialFilters,
  initialSort,
  onRowClick,
  rowKey,
  dense = true,
  rightSlot,
  pageSize = 40,
  emptyHint,
  selectable,
  bulkBar,
  tableClassName,
}: {
  data: T[]
  columns: Column<T>[]
  searchKeys?: (keyof T | ((row: T) => string))[]
  searchPlaceholder?: string
  filters?: TableFilter<T>[]
  /** Filters pre-applied on mount — used for deep links like
   *  `/risks?workflow=…`. The dropdowns show the value and can clear it. */
  initialFilters?: Record<string, string>
  initialSort?: { key: string; dir: 'asc' | 'desc' }
  onRowClick?: (row: T) => void
  rowKey?: (row: T) => string
  dense?: boolean
  rightSlot?: React.ReactNode
  pageSize?: number
  emptyHint?: string
  selectable?: boolean
  bulkBar?: (selected: T[], clear: () => void) => React.ReactNode
  /** Extra classes on the <table> — e.g. `table-fixed` to cap columns and prevent x-scroll. */
  tableClassName?: string
}) {
  const [query, setQuery] = React.useState('')
  const [sort, setSort] = React.useState<{ key: string; dir: 'asc' | 'desc' } | null>(initialSort ?? null)
  const [filterState, setFilterState] = React.useState<Record<string, string>>(initialFilters ?? {})
  const [limit, setLimit] = React.useState(pageSize)
  const [selected, setSelected] = React.useState<Set<string>>(new Set())
  const keyOf = (row: T) => (rowKey ? rowKey(row) : row.id)

  const filtered = React.useMemo(() => {
    let rows = data
    if (query.trim() && searchKeys) {
      const q = query.toLowerCase()
      rows = rows.filter((row) =>
        searchKeys.some((k) => {
          const v = typeof k === 'function' ? k(row) : String(row[k] ?? '')
          return v.toLowerCase().includes(q)
        }),
      )
    }
    if (filters) {
      for (const f of filters) {
        const val = filterState[f.key]
        if (val && val !== 'All') rows = rows.filter((row) => f.predicate(row, val))
      }
    }
    if (sort) {
      const col = columns.find((c) => c.key === sort.key)
      if (col?.sortValue) {
        const sv = col.sortValue
        rows = [...rows].sort((a, b) => {
          const av = sv(a)
          const bv = sv(b)
          const cmp = typeof av === 'number' && typeof bv === 'number' ? av - bv : String(av).localeCompare(String(bv))
          return sort.dir === 'asc' ? cmp : -cmp
        })
      }
    }
    return rows
  }, [data, query, searchKeys, filters, filterState, sort, columns])

  const shown = filtered.slice(0, limit)
  const selectedRows = filtered.filter((r) => selected.has(keyOf(r)))
  const allShownSelected = shown.length > 0 && shown.every((r) => selected.has(keyOf(r)))
  const toggleAll = () =>
    setSelected((prev) => {
      const next = new Set(prev)
      if (allShownSelected) shown.forEach((r) => next.delete(keyOf(r)))
      else shown.forEach((r) => next.add(keyOf(r)))
      return next
    })
  const toggleOne = (row: T) =>
    setSelected((prev) => {
      const next = new Set(prev)
      const k = keyOf(row)
      next.has(k) ? next.delete(k) : next.add(k)
      return next
    })
  const clearSelection = () => setSelected(new Set())

  const toggleSort = (key: string) => {
    setSort((prev) => {
      if (!prev || prev.key !== key) return { key, dir: 'asc' }
      if (prev.dir === 'asc') return { key, dir: 'desc' }
      return null
    })
  }

  return (
    <div className="card-surface overflow-hidden">
      {(searchKeys || filters || rightSlot) && (
        <div className="flex flex-wrap items-center gap-2 border-b border-border bg-muted/40 px-3 py-2">
          {searchKeys && (
            <div className="relative">
              <Search className="pointer-events-none absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <input
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value)
                  setLimit(pageSize)
                }}
                placeholder={searchPlaceholder}
                className="h-7 w-56 rounded-md border border-border bg-background pl-7 pr-2 text-xs outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          )}
          {filters?.map((f) => (
            <div key={f.key} className="flex items-center gap-1">
              <select
                value={filterState[f.key] ?? 'All'}
                onChange={(e) => {
                  setFilterState((s) => ({ ...s, [f.key]: e.target.value }))
                  setLimit(pageSize)
                }}
                className="h-7 rounded-md border border-border bg-background px-1.5 text-xs outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="All">{f.label}: All</option>
                {f.options.map((o) => (
                  <option key={o} value={o}>
                    {f.label}: {o}
                  </option>
                ))}
              </select>
            </div>
          ))}
          <div className="ml-auto flex items-center gap-2">
            <span className="text-2xs tabular-nums text-muted-foreground">
              {filtered.length} {filtered.length === 1 ? 'row' : 'rows'}
            </span>
            {rightSlot}
          </div>
        </div>
      )}
      {selectable && bulkBar && selectedRows.length > 0 && (
        <div className="flex items-center gap-3 border-b border-info/30 bg-info-soft/50 px-3 py-2">
          <span className="text-xs font-medium text-foreground">{selectedRows.length} selected</span>
          <div className="flex items-center gap-2">{bulkBar(selectedRows, clearSelection)}</div>
          <button onClick={clearSelection} className="ml-auto text-2xs font-medium text-muted-foreground hover:text-foreground">
            Clear
          </button>
        </div>
      )}
      <div className="scrollbar-thin overflow-x-auto">
        <table className={cn('w-full border-collapse text-sm', tableClassName)}>
          <thead>
            <tr className="border-b border-border bg-background">
              {selectable && (
                <th className="sticky top-0 z-10 w-9 bg-background px-3 py-2">
                  <input
                    type="checkbox"
                    checked={allShownSelected}
                    onChange={toggleAll}
                    className="size-3.5 cursor-pointer accent-[hsl(var(--primary))]"
                    aria-label="Select all"
                  />
                </th>
              )}
              {columns.map((c) => {
                const active = sort?.key === c.key
                const sortable = !!c.sortValue
                return (
                  <th
                    key={c.key}
                    className={cn(
                      'sticky top-0 z-10 bg-background px-3 py-2 text-left text-2xs font-semibold uppercase tracking-wide text-muted-foreground',
                      c.align === 'right' && 'text-right',
                      c.align === 'center' && 'text-center',
                      sortable && 'cursor-pointer select-none hover:text-foreground',
                      c.headerClassName,
                    )}
                    onClick={() => sortable && toggleSort(c.key)}
                  >
                    <span className={cn('inline-flex items-center gap-1', c.align === 'right' && 'flex-row-reverse')}>
                      {c.header}
                      {sortable &&
                        (active ? (
                          sort?.dir === 'asc' ? (
                            <ChevronUp className="size-3" />
                          ) : (
                            <ChevronDown className="size-3" />
                          )
                        ) : (
                          <ChevronsUpDown className="size-3 opacity-40" />
                        ))}
                    </span>
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {shown.map((row) => (
              <tr
                key={rowKey ? rowKey(row) : row.id}
                onClick={() => onRowClick?.(row)}
                className={cn(
                  'border-b border-border/70 last:border-0 transition-colors',
                  onRowClick && 'cursor-pointer hover:bg-info-soft/40',
                  selected.has(keyOf(row)) && 'bg-info-soft/40',
                  dense ? 'h-10' : 'h-12',
                )}
              >
                {selectable && (
                  <td className="w-9 px-3 align-middle" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selected.has(keyOf(row))}
                      onChange={() => toggleOne(row)}
                      className="size-3.5 cursor-pointer accent-[hsl(var(--primary))]"
                      aria-label="Select row"
                    />
                  </td>
                )}
                {columns.map((c) => (
                  <td
                    key={c.key}
                    className={cn(
                      'px-3 align-middle',
                      c.align === 'right' && 'text-right',
                      c.align === 'center' && 'text-center',
                      c.className,
                    )}
                  >
                    <Cell column={c} row={row} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {filtered.length === 0 && (
        <div className="px-3 py-6 text-center text-xs text-muted-foreground">
          {emptyHint ?? 'No rows match the current filters.'}
        </div>
      )}
      {filtered.length > limit && (
        <div className="border-t border-border bg-muted/30 px-3 py-2 text-center">
          <button
            className="text-xs font-medium text-info hover:underline"
            onClick={() => setLimit((l) => l + pageSize)}
          >
            Show more ({filtered.length - limit} remaining)
          </button>
        </div>
      )}
    </div>
  )
}

/**
 * One cell, isolated. A column renderer that touches a field the row does not
 * carry (a fixture that fell out of step with the roster, say) must degrade to a
 * placeholder — a single bad cell can never unmount the table, the section or
 * the route. The failure is still reported to the console for diagnosis rather
 * than swallowed.
 */
class Cell<T> extends React.Component<{ column: Column<T>; row: T }, { failed: boolean }> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch(error: Error) {
    const { column, row } = this.props
    const id = (row as { id?: string })?.id ?? 'unknown'
    console.error(`DataTable: column "${column.key}" failed to render row ${id}`, error)
  }

  render() {
    if (this.state.failed) {
      return (
        <span className="text-2xs text-muted-foreground" title={`This value could not be read for column "${this.props.column.key}".`}>
          —
        </span>
      )
    }
    // A renderer can also throw synchronously during this render pass; the
    // boundary above catches that too, but guarding here keeps the error inside
    // the cell rather than bubbling through the row.
    try {
      return <>{this.props.column.render(this.props.row)}</>
    } catch (error) {
      console.error(`DataTable: column "${this.props.column.key}" threw during render`, error)
      return <span className="text-2xs text-muted-foreground">—</span>
    }
  }
}
