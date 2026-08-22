import { heatColor, heatBorder, residualCell } from '@/lib/heatmap'
import type { Risk } from '@/types'

const SIZE = 48
const GAP = 5
const PAD_L = 78
const PAD_B = 46
const PAD_T = 6
const PAD_R = 6
const GRID = 5 * SIZE + 4 * GAP

// centre of a cell given likelihood(1-5, x) and impact(1-5, y)
function center(likelihood: number, impact: number) {
  const col = likelihood - 1
  const rowIdx = 5 - impact
  return {
    x: PAD_L + col * (SIZE + GAP) + SIZE / 2,
    y: PAD_T + rowIdx * (SIZE + GAP) + SIZE / 2,
  }
}

const IMPACT_LABELS = ['Severe', 'Major', 'Moderate', 'Minor', 'Low']
const LIKELIHOOD_LABELS = ['Rare', 'Unlikely', 'Possible', 'Likely', 'Almost certain']

/** Inherent (hollow) vs residual (filled) position on the shared 5×5 grid. */
export function RiskPositionMap({ risk }: { risk: Risk }) {
  const width = PAD_L + GRID + PAD_R
  const height = PAD_T + GRID + PAD_B
  const inh = center(risk.likelihood, risk.impact)
  const res = residualCell(risk)
  const rc = center(res.likelihood, res.impact)

  return (
    <div>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full" style={{ maxHeight: 320 }}>
        <text
          x={12}
          y={PAD_T + GRID / 2}
          fontSize={9}
          fontWeight={600}
          fill="hsl(218 14% 46%)"
          textAnchor="middle"
          transform={`rotate(-90 12 ${PAD_T + GRID / 2})`}
        >
          IMPACT →
        </text>
        {Array.from({ length: 5 }).map((_, rowIdx) =>
          Array.from({ length: 5 }).map((__, col) => {
            const likelihood = col + 1
            const impact = 5 - rowIdx
            const score = likelihood * impact
            const x = PAD_L + col * (SIZE + GAP)
            const y = PAD_T + rowIdx * (SIZE + GAP)
            return (
              <g key={`${rowIdx}-${col}`}>
                <rect
                  x={x}
                  y={y}
                  width={SIZE}
                  height={SIZE}
                  rx={6}
                  fill={heatColor(score)}
                  stroke={heatBorder(score)}
                  strokeWidth={1}
                />
                {col === 0 && (
                  <text x={PAD_L - 8} y={y + SIZE / 2 + 3} fontSize={8.5} fill="hsl(218 14% 46%)" textAnchor="end">
                    {IMPACT_LABELS[rowIdx]}
                  </text>
                )}
              </g>
            )
          }),
        )}

        {/* mitigation arrow inherent → residual */}
        <defs>
          <marker id="arrow" markerWidth="7" markerHeight="7" refX="5" refY="3" orient="auto">
            <path d="M0,0 L6,3 L0,6 Z" fill="hsl(222 47% 24%)" />
          </marker>
        </defs>
        {(inh.x !== rc.x || inh.y !== rc.y) && (
          <line
            x1={inh.x}
            y1={inh.y}
            x2={rc.x}
            y2={rc.y}
            stroke="hsl(222 47% 24%)"
            strokeWidth={1.5}
            strokeDasharray="3 3"
            markerEnd="url(#arrow)"
          />
        )}

        {/* inherent (hollow) */}
        <circle cx={inh.x} cy={inh.y} r={9} fill="white" stroke="hsl(222 30% 40%)" strokeWidth={2} />
        {/* residual (filled) */}
        <circle cx={rc.x} cy={rc.y} r={9} fill="hsl(var(--critical))" stroke="white" strokeWidth={2} />

        {LIKELIHOOD_LABELS.map((lab, col) => (
          <text
            key={col}
            x={PAD_L + col * (SIZE + GAP) + SIZE / 2}
            y={PAD_T + GRID + 14}
            fontSize={8}
            fill="hsl(218 14% 46%)"
            textAnchor="middle"
          >
            {lab}
          </text>
        ))}
        <text
          x={PAD_L + GRID / 2}
          y={PAD_T + GRID + 32}
          fontSize={9}
          fontWeight={600}
          fill="hsl(218 14% 46%)"
          textAnchor="middle"
        >
          LIKELIHOOD →
        </text>
      </svg>
      <div className="mt-1 flex items-center justify-center gap-4 text-2xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block size-2.5 rounded-full border-2 border-[hsl(222_30%_40%)] bg-white" />
          Inherent {risk.inherent}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block size-2.5 rounded-full bg-critical" />
          Residual {risk.residual}
        </span>
        <span>↘ mitigation effect</span>
      </div>
    </div>
  )
}
