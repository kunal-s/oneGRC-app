import { useNavigate } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import { fmtRelative, minsFromNow } from '@/lib/time'
import { useApp } from '@/store'

interface Spoke {
  id: string
  name: string
  sub: string
  syncMins: number
  flow: 'in' | 'out'
  status: 'Live' | 'Synced' | 'Connected'
  prominent?: boolean
  route?: string
}

// Order matters only for layout placement around the ellipse.
const SPOKES: Spoke[] = [
  { id: 'servicedesk', name: 'Sankalp ServiceDesk', sub: 'In-house ITSM + CMDB · system of record', syncMins: 2, flow: 'in', status: 'Live', prominent: true, route: '/incidents' },
  { id: 'splunk', name: 'Splunk SIEM', sub: 'Security events & logs', syncMins: 1, flow: 'in', status: 'Live', route: '/incidents' },
  { id: 'qualys', name: 'Qualys / Tenable', sub: 'Vulnerability scanner', syncMins: 47, flow: 'in', status: 'Synced', route: '/ccm' },
  { id: 'crowdstrike', name: 'CrowdStrike EDR', sub: 'Endpoint detection', syncMins: 3, flow: 'in', status: 'Live', route: '/incidents' },
  { id: 'okta', name: 'Okta / AD', sub: 'Identity & access', syncMins: 12, flow: 'in', status: 'Synced', route: '/controls' },
  { id: 'aws', name: 'AWS Security Hub', sub: 'CCM cloud feed', syncMins: 8, flow: 'in', status: 'Live', route: '/ccm' },
  { id: 'onetrust', name: 'Consent & Privacy platform', sub: 'DPDP / consent', syncMins: 37, flow: 'in', status: 'Synced', route: '/dpdp' },
  { id: 'regtech', name: 'Regulatory Intelligence feed', sub: 'Obligation & statutory-update engine', syncMins: 64, flow: 'in', status: 'Synced', route: '/reg-change' },
  { id: 'gst', name: 'ClearTax / IRIS GST', sub: 'GST filing', syncMins: 126, flow: 'out', status: 'Connected', route: '/obligations' },
  { id: 'cra', name: 'NPS Trust + CRA', sub: 'Protean / KFintech', syncMins: 19, flow: 'in', status: 'Synced', route: '/pfrda' },
]

// viewBox geometry
const W = 1060
const H = 660
const CX = W / 2
const CY = H / 2
const RX = 420
const RY = 250

function spokePos(i: number, n: number) {
  // start at top, distribute evenly; nudge so nothing sits dead-behind the title
  const angle = -Math.PI / 2 + (i / n) * Math.PI * 2
  return { x: CX + RX * Math.cos(angle), y: CY + RY * Math.sin(angle), angle }
}

const STATUS_DOT = { Live: '#16a34a', Synced: '#16a34a', Connected: '#0891b2' }

export function Integrations() {
  const navigate = useNavigate()
  const pushToast = useApp((s) => s.pushToast)

  return (
    <div>
      <PageHeader
        eyebrow="Integrations"
        title="Integrations — backbone &amp; spokes"
        description={`${SPOKES.length} connected systems · ${SPOKES.filter((s) => s.flow === 'in').length} feed OneGRC · ${SPOKES.filter((s) => s.flow === 'out').length} filed via OneGRC.`}
        actions={
          <button
            onClick={() => pushToast({ title: 'Connection report exported', description: 'integrations-status.pdf.', variant: 'success' })}
            className="rounded-md border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted"
          >
            Export connection report
          </button>
        }
      />

      {/* status summary */}
      <div className="mb-3 flex flex-wrap items-center gap-2 text-xs">
        <span className="inline-flex items-center gap-1.5 rounded-md border border-ok/30 bg-ok-soft px-2.5 py-1 text-ok">
          <span className="size-1.5 rounded-full bg-ok" /> {SPOKES.length} spokes connected
        </span>
        <span className="rounded-md border border-border bg-background px-2.5 py-1">
          {SPOKES.filter((s) => s.status === 'Live').length} live feeds
        </span>
        <span className="rounded-md border border-border bg-background px-2.5 py-1 tnum">
          {SPOKES.filter((s) => s.flow === 'in').length} inbound · {SPOKES.filter((s) => s.flow === 'out').length} outbound
        </span>
      </div>

      {/* diagram */}
      <div className="card-surface overflow-hidden p-2">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: 560 }}>
          <defs>
            <radialGradient id="coreGrad" cx="50%" cy="45%" r="65%">
              <stop offset="0%" stopColor="hsl(222 47% 30%)" />
              <stop offset="100%" stopColor="hsl(222 47% 20%)" />
            </radialGradient>
            <marker id="inArrow" markerWidth="9" markerHeight="9" refX="4.5" refY="4.5" orient="auto">
              <path d="M0,0 L9,4.5 L0,9 Z" fill="hsl(222 30% 55%)" />
            </marker>
          </defs>

          {/* connectors (drawn first, behind nodes) */}
          {SPOKES.map((s, i) => {
            const p = spokePos(i, SPOKES.length)
            // arrow direction: inbound points toward core; outbound toward spoke
            const from = s.flow === 'in' ? p : { x: CX, y: CY }
            const to = s.flow === 'in' ? { x: CX, y: CY } : p
            return (
              <g key={`line-${s.id}`}>
                <line
                  x1={from.x}
                  y1={from.y}
                  x2={to.x}
                  y2={to.y}
                  stroke={s.prominent ? 'hsl(199 89% 48%)' : 'hsl(216 18% 82%)'}
                  strokeWidth={s.prominent ? 2.4 : 1.4}
                  markerEnd="url(#inArrow)"
                  className="animate-draw"
                  style={{ strokeDasharray: 1000, strokeDashoffset: 1000, animationDelay: `${i * 90}ms` }}
                />
              </g>
            )
          })}

          {/* prominent ServiceDesk flow label */}
          {(() => {
            const p = spokePos(0, SPOKES.length)
            const mx = (p.x + CX) / 2
            const my = (p.y + CY) / 2 - 8
            return (
              <g className="animate-fade-in" style={{ animationDelay: '700ms' }}>
                <rect x={mx - 96} y={my - 11} width={192} height={22} rx={11} fill="hsl(199 89% 96%)" stroke="hsl(199 89% 70%)" />
                <text x={mx} y={my + 4} textAnchor="middle" fontSize={10} fontWeight={600} fill="hsl(199 80% 30%)">
                  incidents · changes · CI/asset → OneGRC
                </text>
              </g>
            )
          })()}

          {/* core backbone */}
          <g className="animate-fade-in" style={{ animationDelay: '200ms' }}>
            <rect x={CX - 150} y={CY - 58} width={300} height={116} rx={16} fill="url(#coreGrad)" />
            <rect x={CX - 150} y={CY - 58} width={300} height={116} rx={16} fill="none" stroke="hsl(199 89% 48%)" strokeOpacity={0.4} />
            <text x={CX} y={CY - 28} textAnchor="middle" fontSize={18} fontWeight={700} fill="#fff">
              OneGRC
            </text>
            <text x={CX} y={CY - 6} textAnchor="middle" fontSize={10.5} fill="hsl(210 40% 86%)">
              Unified GRC / IRM backbone
            </text>
            <g transform={`translate(${CX - 70}, ${CY + 14})`}>
              <rect x={0} y={0} width={140} height={20} rx={10} fill="hsl(222 47% 14%)" />
              <text x={70} y={14} textAnchor="middle" fontSize={9} fill="hsl(210 40% 80%)">
                risks · controls · obligations
              </text>
            </g>
          </g>

          {/* spoke nodes */}
          {SPOKES.map((s, i) => {
            const p = spokePos(i, SPOKES.length)
            const w = s.prominent ? 224 : 184
            const h = s.prominent ? 76 : 60
            const x = p.x - w / 2
            const y = p.y - h / 2
            return (
              <g
                key={s.id}
                className="animate-fade-in cursor-pointer"
                style={{ animationDelay: `${250 + i * 80}ms` }}
                onClick={() => s.route && navigate(s.route)}
              >
                <rect
                  x={x}
                  y={y}
                  width={w}
                  height={h}
                  rx={12}
                  fill="#fff"
                  stroke={s.prominent ? 'hsl(199 89% 48%)' : 'hsl(216 18% 86%)'}
                  strokeWidth={s.prominent ? 2 : 1}
                  style={{ filter: 'drop-shadow(0 1px 2px rgba(15,23,42,0.06))' }}
                />
                <circle cx={x + 14} cy={y + 16} r={3.5} fill={STATUS_DOT[s.status]} />
                <text x={x + 24} y={y + 19} fontSize={s.prominent ? 12.5 : 11.5} fontWeight={700} fill="hsl(222 30% 16%)">
                  {s.name}
                </text>
                <text x={x + 14} y={y + (s.prominent ? 36 : 34)} fontSize={9} fill="hsl(218 14% 46%)">
                  {s.sub}
                </text>
                <text x={x + 14} y={y + (s.prominent ? 52 : 50)} fontSize={8.5} fill="hsl(218 14% 56%)">
                  {s.flow === 'in' ? '↘ feeds OneGRC' : '↗ filed via OneGRC'} · last sync {fmtRelative(minsFromNow(-s.syncMins))}
                </text>
              </g>
            )
          })}
        </svg>
      </div>

      <div className="mt-4 card-surface p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">Connected systems</h3>
          <span className="text-2xs text-muted-foreground tnum">{SPOKES.length} spokes</span>
        </div>
        <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
          {SPOKES.map((s) => (
            <button
              key={s.id}
              onClick={() => s.route && navigate(s.route)}
              className="group flex items-center gap-2 rounded-md border border-border bg-background px-2.5 py-1.5 text-left hover:border-info/40 hover:bg-info-soft/40"
            >
              <span className="size-2 shrink-0 rounded-full" style={{ background: STATUS_DOT[s.status] }} />
              <div className="min-w-0 flex-1">
                <div className="truncate text-xs font-medium text-foreground">{s.name}</div>
                <div className="truncate text-2xs text-muted-foreground">{s.sub}</div>
              </div>
              <div className="shrink-0 text-right">
                <div className="text-2xs font-medium text-foreground">{s.status}</div>
                <div className="text-2xs text-muted-foreground">
                  {s.flow === 'in' ? '↘ in' : '↗ out'} · {fmtRelative(minsFromNow(-s.syncMins))}
                </div>
              </div>
              <ArrowRight className="size-3 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
