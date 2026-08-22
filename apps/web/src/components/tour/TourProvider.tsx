import * as React from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useApp } from '@/store'
import { TOUR_STEPS, type TourStep } from '@/lib/tour/config'
import { TourOverlay } from './TourOverlay'

/**
 * The guided tour engine (docs/onegrc-video-pack.md, Section 5 is the config).
 *
 * It drives the route, the active persona and a per-step timer; the overlay does
 * the drawing. The tour never blocks the app: the scrim is click-through, so a
 * viewer can hover and click live records while a caption is up.
 */
interface TourContextValue {
  steps: TourStep[]
  active: boolean
  index: number
  step?: TourStep
  start: () => void
  next: () => void
  back: () => void
  skip: () => void
}

const TourContext = React.createContext<TourContextValue | null>(null)

export function useTour(): TourContextValue {
  const ctx = React.useContext(TourContext)
  if (!ctx) throw new Error('useTour must be used inside <TourProvider>')
  return ctx
}

export function TourProvider({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate()
  const location = useLocation()
  const setPersona = useApp((s) => s.setPersona)

  const [active, setActive] = React.useState(false)
  const [index, setIndex] = React.useState(0)
  // Captured at Start so Skip can return the viewer exactly where they were, as
  // whoever they were.
  const origin = React.useRef<{ url: string; personId: string }>({ url: '/', personId: '' })

  const steps = TOUR_STEPS
  const step = active ? steps[index] : undefined

  const end = React.useCallback(
    (to: string) => {
      setActive(false)
      setIndex(0)
      if (origin.current.personId) setPersona(origin.current.personId)
      navigate(to)
    },
    [navigate, setPersona],
  )

  const start = React.useCallback(() => {
    if (steps.length === 0) return
    origin.current = { url: `${location.pathname}${location.search}`, personId: useApp.getState().personId }
    setIndex(0)
    setActive(true)
  }, [location.pathname, location.search, steps.length])

  // Kept out of the state updater: advancing past the last step ends the tour and
  // navigates, and side effects must not run inside a render-phase updater.
  const next = React.useCallback(() => {
    if (index >= steps.length - 1) end('/') // Finish lands on the cockpit.
    else setIndex(index + 1)
  }, [end, index, steps.length])

  const back = React.useCallback(() => setIndex((i) => Math.max(0, i - 1)), [])

  const skip = React.useCallback(() => end(origin.current.url || '/'), [end])

  // Apply the step: persona first (it changes what the route renders), then route.
  React.useEffect(() => {
    if (!active) return
    const s = steps[index]
    if (!s) return
    if (s.persona && useApp.getState().personId !== s.persona) setPersona(s.persona)
    const current = `${location.pathname}${location.search}`
    if (current !== s.route) navigate(s.route)
    // location is intentionally read, not depended on: re-running on every
    // navigation would fight a viewer who clicks through the click-through scrim.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, index, steps, navigate, setPersona])

  // Auto-advance on the step's own duration; the config is the timing authority.
  React.useEffect(() => {
    if (!active) return
    const s = steps[index]
    if (!s) return
    const t = setTimeout(next, s.durationMs)
    return () => clearTimeout(t)
  }, [active, index, steps, next])

  // Keyboard: Left back, Right next, Esc skip — unless the viewer is typing.
  React.useEffect(() => {
    if (!active) return
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return
      if (e.key === 'ArrowLeft') {
        e.preventDefault()
        back()
      } else if (e.key === 'ArrowRight') {
        e.preventDefault()
        next()
      } else if (e.key === 'Escape') {
        e.preventDefault()
        skip()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [active, back, next, skip])

  const value: TourContextValue = { steps, active, index, step, start, next, back, skip }

  return (
    <TourContext.Provider value={value}>
      {children}
      {active && step && (
        <TourOverlay
          step={step}
          index={index}
          total={steps.length}
          onNext={next}
          onBack={back}
          onSkip={skip}
        />
      )}
    </TourContext.Provider>
  )
}
