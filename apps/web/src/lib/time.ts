// Time helpers. The world is anchored to an EVERGREEN "now" — the real moment the
// app loads — so the demo never looks stale on a future date. Every seed date is
// relative to NOW (overdue/due/clocks all recompute), and the live clocks tick
// from real time (useLiveNow = NOW + real elapsed). Build decision: switched from
// the previously frozen 10-Jun-2026 anchor to a live anchor.
// All wall-clock display is in IST (UTC+05:30).

const IST_OFFSET_MIN = 5 * 60 + 30

/** Build a Date for a given IST wall-clock time. */
export function ist(
  y: number,
  m: number,
  d: number,
  h = 0,
  min = 0,
  s = 0,
): Date {
  // UTC ms = IST wall time - offset
  return new Date(Date.UTC(y, m - 1, d, h, min, s) - IST_OFFSET_MIN * 60 * 1000)
}

/**
 * Reference "now": the real moment the app loads (evergreen demo).
 * The marquee incident is detected NOW − 2h48m18s and its CERT-In 6h deadline is
 * NOW + 3h11m42s, so the headline clock still reads ~03:11:42 remaining on first
 * paint on ANY demo date, then ticks down in real time.
 */
export const NOW = new Date()
export const NOW_MS = NOW.getTime()

// Marquee incident anchor (relative to NOW). The CERT-In 6-hour clock reads
// ~03:11:42 remaining at load: detected 2h48m18s ago, deadline 3h11m42s ahead.
export const MARQUEE_DETECTED_MS = NOW_MS - (2 * 3600 + 48 * 60 + 18) * 1000

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
]

/** Get the IST calendar parts of a Date. */
function istParts(d: Date) {
  const shifted = new Date(d.getTime() + IST_OFFSET_MIN * 60 * 1000)
  return {
    dow: shifted.getUTCDay(),
    day: shifted.getUTCDate(),
    month: shifted.getUTCMonth(),
    year: shifted.getUTCFullYear(),
    hours: shifted.getUTCHours(),
    minutes: shifted.getUTCMinutes(),
    seconds: shifted.getUTCSeconds(),
  }
}

const pad = (n: number) => String(n).padStart(2, '0')

/** "Wed 10 Jun 2026, 02:14 IST" */
export function fmtIST(iso: string | Date): string {
  const d = typeof iso === 'string' ? new Date(iso) : iso
  const p = istParts(d)
  return `${DAY_NAMES[p.dow]} ${p.day} ${MONTH_NAMES[p.month]} ${p.year}, ${pad(p.hours)}:${pad(p.minutes)} IST`
}

/** "10 Jun 2026" */
export function fmtDate(iso: string | Date): string {
  const d = typeof iso === 'string' ? new Date(iso) : iso
  const p = istParts(d)
  return `${p.day} ${MONTH_NAMES[p.month]} ${p.year}`
}

/** "02:14" (IST 24h) */
export function fmtTime(iso: string | Date): string {
  const d = typeof iso === 'string' ? new Date(iso) : iso
  const p = istParts(d)
  return `${pad(p.hours)}:${pad(p.minutes)}`
}

/** Relative phrasing derived from absolute timestamp vs seeded NOW. */
export function fmtRelative(iso: string | Date): string {
  const d = typeof iso === 'string' ? new Date(iso) : iso
  const diff = NOW_MS - d.getTime()
  const abs = Math.abs(diff)
  const min = Math.round(abs / 60000)
  const future = diff < 0
  let core: string
  if (min < 1) core = 'just now'
  else if (min < 60) core = `${min} min`
  else if (min < 60 * 24) {
    const h = Math.floor(min / 60)
    const rem = min % 60
    core = rem ? `${h}h ${rem}m` : `${h}h`
  } else {
    const days = Math.floor(min / (60 * 24))
    core = `${days}d`
  }
  if (core === 'just now') return core
  return future ? `in ${core}` : `${core} ago`
}

export interface Countdown {
  ms: number
  breached: boolean
  hours: number
  minutes: number
  seconds: number
  /** "03:11:42" or "-01:24:09" if breached */
  label: string
}

/** Countdown from `nowMs` to a seeded deadline ISO. */
export function countdownTo(deadlineIso: string, nowMs: number): Countdown {
  const ms = new Date(deadlineIso).getTime() - nowMs
  const breached = ms < 0
  const a = Math.abs(ms)
  const hours = Math.floor(a / 3600000)
  const minutes = Math.floor((a % 3600000) / 60000)
  const seconds = Math.floor((a % 60000) / 1000)
  const label = `${breached ? '-' : ''}${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
  return { ms, breached, hours, minutes, seconds, label }
}

/** Offset helpers (relative to NOW) for seed authoring. */
export const hoursFromNow = (h: number) => new Date(NOW_MS + h * 3600000).toISOString()
export const minsFromNow = (m: number) => new Date(NOW_MS + m * 60000).toISOString()
export const daysFromNow = (d: number) => new Date(NOW_MS + d * 86400000).toISOString()
