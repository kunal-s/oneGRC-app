import { Rand } from '@/data/rng'
import { NOW_MS } from './time'

export interface TrendPoint {
  day: string // "13 May"
  value: number
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function label(ms: number): string {
  const d = new Date(ms + (5 * 60 + 30) * 60000)
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`
}

/** 30-day series ending at NOW, deterministic, landing on `end`. */
function series(seed: number, start: number, end: number, jitter: number, round = true): TrendPoint[] {
  const r = new Rand(seed)
  const pts: TrendPoint[] = []
  for (let i = 29; i >= 0; i--) {
    const t = (29 - i) / 29
    const base = start + (end - start) * t
    const noise = (r.next() - 0.5) * 2 * jitter
    let v = base + noise
    if (i === 0) v = end
    pts.push({ day: label(NOW_MS - i * 86400000), value: round ? Math.round(v) : Math.round(v * 10) / 10 })
  }
  return pts
}

export const openIncidentsTrend = series(311, 9, 5, 1.4)
export const controlPassRateTrend = series(312, 93.1, 96.2, 0.7, false)
export const obligationsOnTimeTrend = series(313, 88, 94.6, 1.6, false)
