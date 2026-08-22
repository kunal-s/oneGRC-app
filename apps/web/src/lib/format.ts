// Number / currency / id formatting in the Indian convention.

/** 324718 → "3,24,718" (Indian grouping). */
export function inGroup(n: number): string {
  const s = Math.round(n).toString()
  if (s.length <= 3) return s
  const last3 = s.slice(-3)
  const rest = s.slice(0, -3)
  return rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + ',' + last3
}

/** "₹3,24,718 cr" */
export function inCrore(n: number): string {
  return `₹${inGroup(n)} cr`
}

/** Mask a 12-digit PRAN: 110078451293 → "1100 7845 ••••" */
export function maskPran(pran: string): string {
  const clean = pran.replace(/\s/g, '')
  return `${clean.slice(0, 4)} ${clean.slice(4, 8)} ••••`
}

export function pct(n: number, digits = 1): string {
  return `${n.toFixed(digits)}%`
}
