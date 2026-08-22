import type { Dsar } from '@/types'

/**
 * The data-principal request workflow (spec 5.9). Erasure walks the full
 * locate → check-retention → erase-allowed → log → audit-record sequence; other
 * request types are a shorter locate → verify → fulfil-and-log. `step` on a Dsar
 * counts completed stages; the request is complete when step reaches the total.
 */
export const dsarTotalSteps = (type: Dsar['type']): number => (type === 'Erasure' ? 5 : 3)

export const dsarComplete = (d: Dsar): boolean => d.step >= dsarTotalSteps(d.type)
