// Anchor tracking for the guided tour.
//
// After a route change the target element may not exist yet, so we poll for it
// for up to 2000ms; if it never appears the caller falls back to a centered card
// and the tour continues. Once found we keep the measured rectangle glued to the
// element through resize, scroll (capture phase, because the app scrolls in an
// inner <main>), and DOM mutation — the live countdowns, the Copilot's streaming
// answer and the auto-captured evidence lists all re-render underneath us.
import * as React from 'react'

const POLL_TIMEOUT_MS = 2000
/** Keep re-measuring for this long after the anchor resolves, to ride out the
 *  smooth scrollIntoView animation without depending on scroll events firing. */
const SETTLE_MS = 700
/** Room the caption bubble needs below the anchor (bubble + gap + edge). */
const RESERVE_PX = 300
/** Breathing room above a top-aligned anchor so the cut-out ring is not clipped. */
const SCROLL_MARGIN_PX = 16

/** The scrolling ancestor an element lives in (the app scrolls in an inner main). */
function scrollPortOf(el: HTMLElement): HTMLElement | null {
  let node = el.parentElement
  while (node) {
    const overflow = getComputedStyle(node).overflowY
    if (overflow === 'auto' || overflow === 'scroll') return node
    node = node.parentElement
  }
  return null
}

/**
 * Centering a tall anchor leaves no room for the caption on either side, so the
 * bubble ends up over the very thing it describes. When the anchor plus the
 * bubble fits the scroll port we align to the top instead and keep the caption
 * clear of the spotlight; only genuinely oversized anchors fall back to centre.
 */
function alignmentFor(el: HTMLElement): ScrollLogicalPosition {
  const port = scrollPortOf(el)
  const portHeight = port ? port.clientHeight : window.innerHeight
  return el.getBoundingClientRect().height + RESERVE_PX <= portHeight ? 'start' : 'center'
}

export interface AnchorState {
  /** The anchor's viewport rectangle, or null when it could not be resolved. */
  rect: DOMRect | null
  /** True once we have either found the anchor or given up waiting for it. */
  settled: boolean
}

function sameRect(a: DOMRect | null, b: DOMRect): boolean {
  if (!a) return false
  return (
    Math.abs(a.top - b.top) < 0.5 &&
    Math.abs(a.left - b.left) < 0.5 &&
    Math.abs(a.width - b.width) < 0.5 &&
    Math.abs(a.height - b.height) < 0.5
  )
}

/** Track `[data-tour="<anchor>"]`. `key` re-runs the hook on every step change. */
export function useAnchorRect(anchor: string | undefined, key: number | string): AnchorState {
  const [rect, setRect] = React.useState<DOMRect | null>(null)
  const [settled, setSettled] = React.useState(false)

  React.useEffect(() => {
    setRect(null)
    setSettled(false)
    if (!anchor) {
      setSettled(true)
      return
    }

    let cancelled = false
    let el: HTMLElement | null = null
    let pollRaf = 0
    let measureRaf = 0
    let settleRaf = 0
    const startedAt = performance.now()
    let resolvedAt = 0

    const cleanups: (() => void)[] = []

    const measure = () => {
      if (cancelled || !el) return
      const next = el.getBoundingClientRect()
      setRect((prev) => (sameRect(prev, next) ? prev : next))
    }

    const scheduleMeasure = () => {
      if (cancelled || measureRaf) return
      measureRaf = requestAnimationFrame(() => {
        measureRaf = 0
        measure()
      })
    }

    // Ride out the smooth scroll: re-measure every frame for a short window.
    const settleLoop = () => {
      if (cancelled) return
      measure()
      if (performance.now() - resolvedAt < SETTLE_MS) settleRaf = requestAnimationFrame(settleLoop)
    }

    const attach = (node: HTMLElement) => {
      const ro = new ResizeObserver(scheduleMeasure)
      ro.observe(node)
      cleanups.push(() => ro.disconnect())

      const mo = new MutationObserver(scheduleMeasure)
      mo.observe(node, { subtree: true, childList: true, characterData: true, attributes: true })
      cleanups.push(() => mo.disconnect())

      window.addEventListener('resize', scheduleMeasure)
      cleanups.push(() => window.removeEventListener('resize', scheduleMeasure))

      // Capture phase catches scrolling inside the app's own scroll container.
      window.addEventListener('scroll', scheduleMeasure, true)
      cleanups.push(() => window.removeEventListener('scroll', scheduleMeasure, true))
    }

    const poll = () => {
      if (cancelled) return
      el = document.querySelector<HTMLElement>(`[data-tour="${anchor}"]`)
      if (el) {
        resolvedAt = performance.now()
        setSettled(true)
        const block = alignmentFor(el)
        const priorMargin = el.style.scrollMarginTop
        if (block === 'start') el.style.scrollMarginTop = `${SCROLL_MARGIN_PX}px`
        el.scrollIntoView({ block, behavior: 'smooth' })
        cleanups.push(() => {
          el!.style.scrollMarginTop = priorMargin
        })
        attach(el)
        settleLoop()
        return
      }
      if (performance.now() - startedAt < POLL_TIMEOUT_MS) {
        pollRaf = requestAnimationFrame(poll)
        return
      }
      // Never appeared — the caller shows a centered card and the tour continues.
      setSettled(true)
    }

    poll()

    return () => {
      cancelled = true
      cancelAnimationFrame(pollRaf)
      cancelAnimationFrame(measureRaf)
      cancelAnimationFrame(settleRaf)
      cleanups.forEach((fn) => fn())
    }
  }, [anchor, key])

  return { rect, settled }
}
