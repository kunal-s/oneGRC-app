import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { TopBar } from './TopBar'
import { NeedsMe } from '../kit/NeedsMe'
import { DrawerHost } from './DrawerHost'
import { Toasts } from '../Toasts'
import { CommandSearch } from '../CommandSearch'
import { ErrorBoundary } from '../ErrorBoundary'
import { useLocation } from 'react-router-dom'

export function Layout() {
  // Keyed by pathname so navigating away from a failed page clears the fallback
  // rather than stranding the user on it.
  const { pathname } = useLocation()
  return (
    <div className="flex h-screen min-w-[1024px] overflow-hidden bg-canvas">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar />
        <NeedsMe />
        <main className="scrollbar-thin flex-1 overflow-y-auto">
          <div className="mx-auto max-w-[1480px] px-6 py-5">
            {/* Route-level containment: the shell (nav, top bar, queue strip)
                survives any page fault, so recovery is a click, not a reload. */}
            <ErrorBoundary key={pathname} label="This page">
              <Outlet />
            </ErrorBoundary>
          </div>
        </main>
      </div>
      <Toasts />
      <CommandSearch />
      <DrawerHost />
    </div>
  )
}
