import { useNavigate } from 'react-router-dom'
import { buildHeatGrid, heatColor, heatBorder, DOMAIN_COLORS, DOMAIN_LABELS, type HeatCell } from '@/lib/heatmap'
import type { RiskDomain } from '@/types'

const SIZE = 62 // cell px
const GAP = 6
const PAD_L = 92
const PAD_B = 56
const PAD_T = 8
const PAD_R = 8
const GRID = 5 * SIZE + 4 * GAP

function CellDots({ cell }: { cell: HeatCell }) {
  const entries = (Object.entries(cell.domains) as [RiskDomain, number][]).filter(([, n]) => n > 0)
  // lay out up to 8 dots in a small cluster
  const dots: { domain: RiskDomain }[] = []
  entries.forEach(([d, n]) => {
    for (let i = 0; i < Math.min(n, 4); i++) dots.push({ domain: d })
  })
  const shown = dots.slice(0, 9)
  const cols = 3
  return (
    <>
      {shown.map((d, i) => {
        const cx = (i % cols) * 12 + 12
        const cy = Math.floor(i / cols) * 12 + 14
        return <circle key={i} cx={cx} cy={cy} r={3.4} fill={DOMAIN_COLORS[d.domain]} fillOpacity={0.92} />
      })}
    </>
  )
}

export function HeatMap() {
  const navigate = useNavigate()
  const grid = buildHeatGrid()
  const width = PAD_L + GRID + PAD_R
  const height = PAD_T + GRID + PAD_B

  const impactLabels = ['Severe', 'Major', 'Moderate', 'Minor', 'Low'] // top→bottom (5→1)
  const likelihoodLabels = ['Rare', 'Unlikely', 'Possible', 'Likely', 'Almost certain']

  return (
    <div className="card-surface p-4">
      <div className="mb-3 flex items-start justify-between">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Enterprise risk heat map</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Residual likelihood × impact · {grid.flat().reduce((s, c) => s + c.risks.length, 0)} risks
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-x-2.5 gap-y-1">
          {DOMAIN_LABELS.map((d) => (
            <span key={d.key} className="inline-flex items-center gap-1 text-2xs text-muted-foreground">
              <span className="size-2 rounded-full" style={{ background: DOMAIN_COLORS[d.key] }} />
              {d.label}
            </span>
          ))}
        </div>
      </div>

      <svg viewBox={`0 0 ${width} ${height}`} className="w-full" style={{ maxHeight: 380 }}>
        {/* Y axis label */}
        <text
          x={14}
          y={PAD_T + GRID / 2}
          fontSize={10}
          fontWeight={600}
          fill="hsl(218 14% 46%)"
          textAnchor="middle"
          transform={`rotate(-90 14 ${PAD_T + GRID / 2})`}
        >
          IMPACT →
        </text>
        {grid.map((row, ri) =>
          row.map((cell, ci) => {
            const x = PAD_L + ci * (SIZE + GAP)
            const y = PAD_T + ri * (SIZE + GAP)
            const isHot = cell.score >= 15
            const hasRisks = cell.risks.length > 0
            return (
              <g
                key={`${ri}-${ci}`}
                className={hasRisks ? 'cursor-pointer' : 'cursor-default'}
                onClick={() => hasRisks && navigate(`/risks?likelihood=${cell.likelihood}&impact=${cell.impact}`)}
              >
                <rect
                  x={x}
                  y={y}
                  width={SIZE}
                  height={SIZE}
                  rx={7}
                  fill={heatColor(cell.score)}
                  stroke={heatBorder(cell.score)}
                  strokeWidth={isHot ? 1.5 : 1}
                  className="transition-[stroke,filter] hover:stroke-info"
                />
                <g transform={`translate(${x + 6} ${y + 6})`}>
                  <CellDots cell={cell} />
                </g>
                {cell.risks.length > 0 && (
                  <text
                    x={x + SIZE - 7}
                    y={y + SIZE - 7}
                    fontSize={11}
                    fontWeight={700}
                    fill="hsl(222 30% 30%)"
                    textAnchor="end"
                    className="tnum"
                  >
                    {cell.risks.length}
                  </text>
                )}
                {/* row impact label */}
                {ci === 0 && (
                  <text x={PAD_L - 10} y={y + SIZE / 2 + 3} fontSize={9.5} fill="hsl(218 14% 46%)" textAnchor="end">
                    {impactLabels[ri]}
                  </text>
                )}
              </g>
            )
          }),
        )}
        {/* X axis labels */}
        {likelihoodLabels.map((lab, ci) => (
          <text
            key={ci}
            x={PAD_L + ci * (SIZE + GAP) + SIZE / 2}
            y={PAD_T + GRID + 16}
            fontSize={9.5}
            fill="hsl(218 14% 46%)"
            textAnchor="middle"
          >
            {lab}
          </text>
        ))}
        <text
          x={PAD_L + GRID / 2}
          y={PAD_T + GRID + 36}
          fontSize={10}
          fontWeight={600}
          fill="hsl(218 14% 46%)"
          textAnchor="middle"
        >
          LIKELIHOOD →
        </text>
      </svg>
      <div className="mt-1 text-2xs text-muted-foreground">Click any cell to drill into the filtered Risk Register.</div>
    </div>
  )
}
