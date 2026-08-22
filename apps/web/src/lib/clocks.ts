import { WORLD } from '@/data'
import { useApp } from '@/store'
import { effectiveIncident } from './effective'
import type { RegulatorTrack } from '@/types'

export interface ActiveTrack {
  incidentId: string
  incidentTitle: string
  track: RegulatorTrack
}

/**
 * All regulator tracks still running (not Filed), across open incidents - read
 * through the effective layer so a track filed in-session (Epic 3.2) drops out.
 * Reads the override map via getState; components that render clocks subscribe to
 * incidentOverrides so they re-render when a track is filed.
 */
export function activeTracks(): ActiveTrack[] {
  const overrides = useApp.getState().incidentOverrides
  const out: ActiveTrack[] = []
  for (const seed of WORLD.incidents) {
    const inc = effectiveIncident(seed, overrides[seed.id])
    if (inc.status === 'Closed') continue
    for (const track of inc.regulatorTracks) {
      if (track.status === 'Filed') continue
      out.push({ incidentId: inc.id, incidentTitle: inc.title, track })
    }
  }
  return out.sort((a, b) => new Date(a.track.deadline).getTime() - new Date(b.track.deadline).getTime())
}

/** The nearest (soonest-deadline) live regulator clock. */
export function nearestTrack(): ActiveTrack | undefined {
  return activeTracks()[0]
}
