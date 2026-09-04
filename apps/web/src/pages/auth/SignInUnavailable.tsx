import { CloudOff } from 'lucide-react'
import { Button } from '@/components/ui/Button'

/**
 * GAP-SCR-011-030. The identity provider could not be reached, or is not
 * configured. There is no local sign-in path to fall back to
 * (GAP-SCR-011-001), so this states the fact rather than offering one.
 */
export function SignInUnavailable() {
  return (
    <div className="flex h-screen items-center justify-center bg-canvas px-6">
      <div className="card-surface flex max-w-md flex-col items-center gap-3 px-8 py-10 text-center">
        <div className="flex size-12 items-center justify-center rounded-xl bg-muted text-muted-foreground">
          <CloudOff className="size-6" />
        </div>
        <p className="text-sm text-foreground">Sign-in is unavailable right now. Try again shortly.</p>
        <Button variant="outline" onClick={() => window.location.reload()}>
          Try again
        </Button>
      </div>
    </div>
  )
}
