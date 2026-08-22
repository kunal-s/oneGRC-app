// Guided-tour step configuration.
//
// The tour is NOT declared in code. `docs/onegrc-video-pack.md` is the single
// source of truth: Section 5 of that file carries a fenced json block with the
// nine steps (id, route, anchor, caption, durationMs and an optional persona).
// We import the markdown as a raw string at build time and parse the block here,
// so editing the pack changes the running tour with no code change.
import packRaw from '../../../docs/onegrc-video-pack.md?raw'

export interface TourStep {
  id: number
  route: string
  anchor: string
  caption: string
  durationMs: number
  /** Optional persona id to activate before the step renders (see the pack). */
  persona?: string
}

export interface TourConfig {
  tour: string
  totalDurationMs: number
  steps: TourStep[]
}

const EMPTY: TourConfig = { tour: 'onegrc-demo', totalDurationMs: 0, steps: [] }

/** Pull the first fenced json block that parses into a step config. */
function parsePack(md: string): TourConfig {
  const fences = md.match(/```json\s*([\s\S]*?)```/g) ?? []
  for (const fence of fences) {
    const body = fence.replace(/^```json\s*/, '').replace(/```$/, '')
    try {
      const parsed = JSON.parse(body) as Partial<TourConfig>
      if (Array.isArray(parsed.steps) && parsed.steps.length > 0 && parsed.steps[0].anchor) {
        return {
          tour: parsed.tour ?? EMPTY.tour,
          totalDurationMs: parsed.totalDurationMs ?? parsed.steps.reduce((n, s) => n + s.durationMs, 0),
          steps: parsed.steps,
        }
      }
    } catch {
      // Not the config block — keep looking.
    }
  }
  return EMPTY
}

export const TOUR: TourConfig = parsePack(packRaw)
export const TOUR_STEPS: TourStep[] = TOUR.steps
