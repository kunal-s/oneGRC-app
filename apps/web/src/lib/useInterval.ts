import { useEffect, useRef, useState } from 'react'

/** Single shared ticking hook — drives all live countdowns (animation only). */
export function useInterval(callback: () => void, delay: number) {
  const saved = useRef(callback)
  useEffect(() => {
    saved.current = callback
  }, [callback])
  useEffect(() => {
    const id = setInterval(() => saved.current(), delay)
    return () => clearInterval(id)
  }, [delay])
}

/**
 * Returns a "live now" in ms that advances in real time from the anchored NOW.
 * Deadlines are seeded; only the displayed remaining time animates.
 */
import { NOW_MS } from './time'
export function useLiveNow(tickMs = 1000): number {
  const mounted = useRef<number>(Date.now())
  const [now, setNow] = useState<number>(NOW_MS)
  useInterval(() => {
    const elapsed = Date.now() - mounted.current
    setNow(NOW_MS + elapsed)
  }, tickMs)
  return now
}
