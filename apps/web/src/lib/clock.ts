// CLK-011: the client clock. Replaces `NOW` (a page-load instant, frozen for
// the life of the tab) as the anchor for relative phrasing on the four
// surfaces that read the server (CLK-014). The seed world keeps
// `lib/time.ts`'s NOW anchor unchanged (CLK-013): this module is additive,
// never a rewrite of it.
import { useState } from 'react'
import { useInterval } from './useInterval'

/** Real wall-clock milliseconds, ticking every `tickMs` (default 15s: enough to move a relative phrase, not enough to burn a re-render every second). */
export function useRealNow(tickMs = 15000): number {
  const [now, setNow] = useState<number>(() => Date.now())
  useInterval(() => setNow(Date.now()), tickMs)
  return now
}

const pad = (n: number) => String(n).padStart(2, '0')

/**
 * Relative phrasing against the real clock, never a page-load anchor
 * (CLK-011). Same wording `lib/time.ts#fmtRelative` already established
 * ("3h ago", "in 2 days"); only what it is measured against changes.
 */
export function fmtRelativeReal(iso: string | Date, nowMs: number): string {
  const d = typeof iso === 'string' ? new Date(iso) : iso
  const diff = nowMs - d.getTime()
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

/**
 * CLK-009: "Wed 10 Jun 2026, 02:14 IST", the prototype's own `fmtIST` shape,
 * generalised to any IANA zone via `Intl` instead of a hard-coded IST
 * offset, so a server-named zone renders correctly without this module
 * knowing in advance what it will be.
 */
export function fmtInZone(iso: string | Date, timezone: string): string {
  const d = typeof iso === 'string' ? new Date(iso) : iso
  const parts = new Intl.DateTimeFormat('en-IN', {
    timeZone: timezone,
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
    timeZoneName: 'short',
  }).formatToParts(d)
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? ''
  return `${get('weekday')} ${get('day')} ${get('month')} ${get('year')}, ${pad(Number(get('hour')))}:${pad(Number(get('minute')))} ${get('timeZoneName')}`
}

/** CLK-009, CLK-010: "As at <date>, <time> <zone>", one line per surface, at the foot. */
export function fmtAsOf(iso: string | Date, timezone: string): string {
  return `As at ${fmtInZone(iso, timezone)}`
}
