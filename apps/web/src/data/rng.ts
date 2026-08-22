// Deterministic seeded PRNG (mulberry32) so reloads are stable.

export function mulberry32(seed: number) {
  let a = seed >>> 0
  return function () {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export class Rand {
  private r: () => number
  constructor(seed: number) {
    this.r = mulberry32(seed)
  }
  next() {
    return this.r()
  }
  int(min: number, max: number) {
    return Math.floor(this.r() * (max - min + 1)) + min
  }
  pick<T>(arr: readonly T[]): T {
    return arr[Math.floor(this.r() * arr.length)]
  }
  weighted<T>(entries: readonly [T, number][]): T {
    const total = entries.reduce((s, e) => s + e[1], 0)
    let roll = this.r() * total
    for (const [val, w] of entries) {
      roll -= w
      if (roll <= 0) return val
    }
    return entries[entries.length - 1][0]
  }
  bool(p = 0.5) {
    return this.r() < p
  }
  // pick n distinct items
  sample<T>(arr: readonly T[], n: number): T[] {
    const copy = [...arr]
    const out: T[] = []
    n = Math.min(n, copy.length)
    for (let i = 0; i < n; i++) {
      const idx = Math.floor(this.r() * copy.length)
      out.push(copy.splice(idx, 1)[0])
    }
    return out
  }
}
