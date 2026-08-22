import type { Regulator } from '@/types'

export const REGULATOR_ORDER: Regulator[] = ['PFRDA', 'CERT-In', 'DPDP', 'GST', 'Labour', 'Companies Act']

// Muted, distinct accents — color marks the regulator, not decoration.
export const REGULATOR_COLORS: Record<Regulator, { dot: string; chip: string }> = {
  PFRDA: { dot: '#0f766e', chip: 'bg-[#f0fdfa] text-[#0f766e] border-[#99f6e4]' },
  'CERT-In': { dot: '#b91c1c', chip: 'bg-[#fef2f2] text-[#b91c1c] border-[#fecaca]' },
  DPDP: { dot: '#7c3aed', chip: 'bg-[#f5f3ff] text-[#6d28d9] border-[#ddd6fe]' },
  GST: { dot: '#b45309', chip: 'bg-[#fffbeb] text-[#b45309] border-[#fde68a]' },
  Labour: { dot: '#0e7490', chip: 'bg-[#ecfeff] text-[#0e7490] border-[#a5f3fc]' },
  'Companies Act': { dot: '#4338ca', chip: 'bg-[#eef2ff] text-[#4338ca] border-[#c7d2fe]' },
}

export function RegulatorChip({ regulator, className }: { regulator: Regulator; className?: string }) {
  const c = REGULATOR_COLORS[regulator]
  return (
    <span className={`inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-2xs font-medium ${c.chip} ${className ?? ''}`}>
      <span className="size-1.5 rounded-full" style={{ background: c.dot }} />
      {regulator}
    </span>
  )
}
