import * as React from 'react'
import { createPortal } from 'react-dom'
import { ArrowLeft, ArrowRight, X, Flag } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'
import { useAnchorRect } from '@/lib/tour/useAnchorRect'
import type { TourStep } from '@/lib/tour/config'

const BUBBLE_W = 400
const CUTOUT_PAD = 8
const GAP = 14
const EDGE = 16

/**
 * The tour's drawing layer: a click-through scrim with a cut-out over the step's
 * anchor and a caption bubble. Everything except the bubble has
 * `pointer-events: none`, so the underlying app stays fully usable while a
 * caption is up. When the anchor cannot be resolved the scrim stays flat and the
 * bubble centres itself — the tour continues rather than stalling.
 */
export function TourOverlay({
  step,
  index,
  total,
  onNext,
  onBack,
  onSkip,
}: {
  step: TourStep
  index: number
  total: number
  onNext: () => void
  onBack: () => void
  onSkip: () => void
}) {
  const { rect, settled } = useAnchorRect(step.anchor, index)
  const bubbleRef = React.useRef<HTMLDivElement>(null)
  const [bubbleH, setBubbleH] = React.useState(220)
  const side = React.useRef<'below' | 'above' | 'overlay' | null>(null)
  const isLast = index === total - 1

  React.useEffect(() => {
    side.current = null // each step picks its own side afresh
  }, [index])

  React.useLayoutEffect(() => {
    const h = bubbleRef.current?.offsetHeight
    if (h && Math.abs(h - bubbleH) > 1) setBubbleH(h)
  })

  const vw = typeof window === 'undefined' ? 1440 : window.innerWidth
  const vh = typeof window === 'undefined' ? 900 : window.innerHeight

  let left = (vw - BUBBLE_W) / 2
  let top = (vh - bubbleH) / 2
  if (rect) {
    const fitsBelow = rect.bottom + GAP + bubbleH <= vh - EDGE
    const fitsAbove = rect.top - GAP - bubbleH >= EDGE
    // Hysteresis: content that grows under the spotlight (the Copilot's streaming
    // answer, an auto-captured evidence list) must not make the caption hop sides.
    const held = side.current
    const keep = (held === 'below' && fitsBelow) || (held === 'above' && fitsAbove)
    const place = keep ? held : fitsBelow ? 'below' : fitsAbove ? 'above' : 'overlay'
    side.current = place
    if (place === 'below') {
      top = rect.bottom + GAP
      left = rect.left
    } else if (place === 'above') {
      top = rect.top - GAP - bubbleH
      left = rect.left
    } else {
      // Anchor is taller than the viewport: sit bottom-right over its edge.
      top = vh - bubbleH - EDGE
      left = vw - BUBBLE_W - EDGE
    }
    left = Math.min(Math.max(left, EDGE), Math.max(EDGE, vw - BUBBLE_W - EDGE))
    top = Math.min(Math.max(top, EDGE), Math.max(EDGE, vh - bubbleH - EDGE))
  }

  return createPortal(
    <div className="pointer-events-none fixed inset-0 z-[100]">
      {/* Scrim: either a cut-out ring around the anchor, or a flat wash. */}
      {rect ? (
        <div
          className="pointer-events-none fixed rounded-lg ring-2 ring-info/70 transition-all duration-200 ease-out"
          style={{
            left: rect.left - CUTOUT_PAD,
            top: rect.top - CUTOUT_PAD,
            width: rect.width + CUTOUT_PAD * 2,
            height: rect.height + CUTOUT_PAD * 2,
            boxShadow: '0 0 0 9999px hsl(222 47% 11% / 0.55)',
          }}
        />
      ) : (
        <div
          className="pointer-events-none fixed inset-0 transition-opacity duration-200"
          style={{ background: 'hsl(222 47% 11% / 0.55)', opacity: settled ? 1 : 0 }}
        />
      )}

      {/* Caption bubble — the only interactive part of the overlay. */}
      <div
        ref={bubbleRef}
        role="dialog"
        aria-label={`Guided tour, step ${index + 1} of ${total}`}
        className="pointer-events-auto fixed w-[400px] rounded-xl border border-border bg-background p-4 shadow-2xl"
        style={{ left, top }}
      >
        <div className="mb-2 flex items-center gap-2">
          <span className="text-2xs font-semibold uppercase tracking-wide text-info">Guided tour</span>
          <span className="text-2xs tnum text-muted-foreground">
            Step {index + 1} of {total}
          </span>
          <button
            onClick={onSkip}
            aria-label="Skip the guided tour"
            className="ml-auto rounded p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <X className="size-3.5" />
          </button>
        </div>

        <div className="mb-3 h-1 w-full overflow-hidden rounded-full bg-muted">
          <div
            key={index}
            className="h-full rounded-full bg-info"
            style={{ animation: `tour-progress ${step.durationMs}ms linear forwards` }}
          />
        </div>

        <p className="text-sm leading-relaxed text-foreground">{step.caption}</p>

        {rect === null && settled && (
          <p className="mt-2 text-2xs text-muted-foreground">
            This step's anchor is not on screen; the tour continues.
          </p>
        )}

        <div className="mt-3 flex items-center gap-2 border-t border-border pt-3">
          <Button variant="outline" size="sm" onClick={onBack} disabled={index === 0}>
            <ArrowLeft className="size-4" /> Back
          </Button>
          <Button size="sm" onClick={onNext}>
            {isLast ? (
              <>
                <Flag className="size-4" /> Finish
              </>
            ) : (
              <>
                Next <ArrowRight className="size-4" />
              </>
            )}
          </Button>
          <button
            onClick={onSkip}
            className={cn('ml-auto text-2xs font-medium text-muted-foreground hover:text-foreground')}
          >
            Skip tour
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
