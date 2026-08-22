import * as React from 'react'
import { AlertTriangle, RotateCcw } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  /** What failed, e.g. "Users & Roles" — named so the fallback is diagnosable. */
  label: string
  children: React.ReactNode
  className?: string
}

interface State {
  error: Error | null
}

/**
 * Containment boundary for a page section. Without one, a single bad field in a
 * single renderer unmounts the whole route and the only recovery is a reload —
 * which is exactly the failure this replaces. The rest of the page keeps
 * rendering; the failed section shows a bordered panel that can be retried.
 *
 * Deliberately a section-level boundary rather than one per route: it keeps the
 * page's navigation, header and sibling sections alive, so the user can move on.
 */
export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error(`Section "${this.props.label}" failed to render`, error, info.componentStack)
  }

  render() {
    const { error } = this.state
    if (!error) return this.props.children
    return (
      <div className={cn('rounded-lg border border-critical/30 bg-critical-soft/30 p-4', this.props.className)}>
        <div className="flex items-start gap-2.5">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-critical" />
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-semibold text-foreground">This section could not be loaded</h3>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {this.props.label} hit an error. The rest of the page is unaffected.
            </p>
            <p className="mt-1.5 break-words font-mono text-2xs text-muted-foreground">{error.message}</p>
            <button
              onClick={() => this.setState({ error: null })}
              className="mt-2.5 inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-2.5 py-1 text-xs font-medium text-foreground hover:bg-muted"
            >
              <RotateCcw className="size-3.5" /> Retry
            </button>
          </div>
        </div>
      </div>
    )
  }
}
