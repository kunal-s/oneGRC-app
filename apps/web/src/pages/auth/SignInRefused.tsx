import { UserX } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { signOut } from '@/api/functions'

/**
 * GAP-SCR-011-020, GAP-SCR-011-021, GAP-SCR-011-022.
 *
 * Shown when the identity provider asserts a subject the platform holds no
 * active Person for. No Person is created by arriving here (rule 7), and the
 * message does not say whether the subject exists under another address.
 */
export function SignInRefused() {
  return (
    <div className="flex h-screen items-center justify-center bg-canvas px-6">
      <div className="card-surface flex max-w-md flex-col items-center gap-3 px-8 py-10 text-center">
        <div className="flex size-12 items-center justify-center rounded-xl bg-muted text-muted-foreground">
          <UserX className="size-6" />
        </div>
        <p className="text-sm text-foreground">
          You are signed in, but this platform has no record for you. Ask your administrator to add you.
        </p>
        <Button variant="outline" onClick={() => void signOut()}>
          Sign out
        </Button>
      </div>
    </div>
  )
}
