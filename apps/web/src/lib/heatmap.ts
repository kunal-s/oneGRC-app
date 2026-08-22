import { WORLD } from '@/data'
import type { Risk, RiskDomain } from '@/types'

export interface HeatCell {
  likelihood: number // 1-5 (x)
  impact: number // 1-5 (y)
  score: number // likelihood*impact
  risks: Risk[]
  domains: Record<RiskDomain, number>
}

export const DOMAIN_COLORS: Record<RiskDomain, string> = {
  IT: '#2563eb', // blue
  Cyber: '#7c3aed', // violet
  Operational: '#0891b2', // cyan
  Investment: '#d97706', // amber
  Compliance: '#059669', // emerald
  ThirdParty: '#db2777', // pink
}

export const DOMAIN_LABELS: { key: RiskDomain; label: string }[] = [
  { key: 'IT', label: 'IT' },
  { key: 'Cyber', label: 'Cyber' },
  { key: 'Operational', label: 'Operational' },
  { key: 'Investment', label: 'Investment' },
  { key: 'Compliance', label: 'Compliance' },
  { key: 'ThirdParty', label: 'Third-party' },
]

/**
 * Derive the residual (likelihood, impact) cell for a risk. Shared by the heat
 * map and the Risk Register filter so a clicked cell deep-links to the exact set.
 */
export function residualCell(r: Risk): { likelihood: number; impact: number } {
  const impact = Math.max(1, Math.min(5, Math.round(r.residual / r.likelihood) || r.impact))
  const likelihood = Math.max(1, Math.min(5, Math.round(r.residual / impact)))
  return { likelihood, impact }
}

/** Build a 5×5 grid keyed by residual likelihood/impact. */
export function buildHeatGrid(): HeatCell[][] {
  // derive likelihood/impact from residual: keep stored likelihood/impact but
  // weight by residual so the heat map reflects residual posture.
  const grid: HeatCell[][] = []
  for (let impact = 5; impact >= 1; impact--) {
    const row: HeatCell[] = []
    for (let likelihood = 1; likelihood <= 5; likelihood++) {
      row.push({
        likelihood,
        impact,
        score: likelihood * impact,
        risks: [],
        domains: { IT: 0, Cyber: 0, Operational: 0, Investment: 0, Compliance: 0, ThirdParty: 0 },
      })
    }
    grid.push(row)
  }
  for (const r of WORLD.risks) {
    const { likelihood: resLikelihood, impact: resImpact } = residualCell(r)
    const rowIdx = 5 - resImpact
    const cell = grid[rowIdx][resLikelihood - 1]
    cell.risks.push(r)
    cell.domains[r.domain]++
  }
  return grid
}

export function heatColor(score: number): string {
  // governance-grade muted band, color = state only
  if (score >= 15) return '#fef2f2' // critical band bg
  if (score >= 10) return '#fff7ed'
  if (score >= 5) return '#fefce8'
  return '#f0fdf4'
}
export function heatBorder(score: number): string {
  if (score >= 15) return '#fecaca'
  if (score >= 10) return '#fed7aa'
  if (score >= 5) return '#fef08a'
  return '#bbf7d0'
}
