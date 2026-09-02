import type { ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { authLoginUrl, whoAmI } from './functions'

const isDev = import.meta.env.DEV

/**
 * Sends an unauthenticated visitor to the customer's identity provider,
 * preserving the route they asked for. GAP-SCR-011-002, GAP-SCR-011-004.
 *
 * In a development build the dev identity bar is how a person signs in
 * (SCR-096-030, kept explicitly by D-044), so this renders through instead of
 * redirecting: forcing every unauthenticated request through a provider that
 * AUTH_MODE=dev never configures would make the bar unreachable.
 */
export function AuthGate({ children }: { children: ReactNode }) {
  const who = useQuery({ queryKey: ['whoami'], queryFn: whoAmI, retry: false })

  // The redirect itself renders nothing (GAP-SCR-011-090); while whoami is in
  // flight there is nothing yet to decide, so nothing renders either.
  if (who.isLoading) return null

  if (who.isError && !isDev) {
    const returnTo = window.location.pathname + window.location.search
    window.location.href = authLoginUrl(returnTo)
    return null
  }

  return <>{children}</>
}
