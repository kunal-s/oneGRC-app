import {
  ResponsiveContainer, AreaChart, Area, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid,
} from 'recharts'
import { openIncidentsTrend, controlPassRateTrend, obligationsOnTimeTrend, type TrendPoint } from '@/lib/trends'

function ChartCard({
  title,
  current,
  unit,
  children,
}: {
  title: string
  current: string
  unit?: string
  children: React.ReactNode
}) {
  return (
    <div className="card-surface p-3.5">
      <div className="flex items-baseline justify-between">
        <h3 className="text-xs font-semibold text-foreground">{title}</h3>
        <div className="text-sm font-semibold tnum text-foreground">
          {current}
          {unit && <span className="ml-0.5 text-2xs font-medium text-muted-foreground">{unit}</span>}
        </div>
      </div>
      <div className="mt-1 text-2xs text-muted-foreground">Trailing 30 days</div>
      <div className="mt-2 h-28">{children}</div>
    </div>
  )
}

const axisProps = {
  tick: { fontSize: 9, fill: 'hsl(218 14% 46%)' },
  tickLine: false,
  axisLine: false,
}

function tooltipStyle() {
  return {
    contentStyle: {
      fontSize: 11,
      borderRadius: 8,
      border: '1px solid hsl(216 18% 89%)',
      padding: '4px 8px',
    },
    labelStyle: { fontSize: 10, color: 'hsl(218 14% 46%)' },
  }
}

function thinTicks(data: TrendPoint[]) {
  return data.filter((_, i) => i % 7 === 0).map((d) => d.day)
}

export function TrendCharts() {
  return (
    <div className="grid grid-cols-3 gap-3">
      <ChartCard title="Open incidents" current="5">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={openIncidentsTrend} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
            <defs>
              <linearGradient id="gInc" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(var(--critical))" stopOpacity={0.22} />
                <stop offset="100%" stopColor="hsl(var(--critical))" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(216 18% 92%)" />
            <XAxis dataKey="day" {...axisProps} ticks={thinTicks(openIncidentsTrend)} />
            <YAxis {...axisProps} width={28} allowDecimals={false} />
            <Tooltip {...tooltipStyle()} />
            <Area type="monotone" dataKey="value" stroke="hsl(var(--critical))" strokeWidth={1.8} fill="url(#gInc)" />
          </AreaChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Control pass-rate" current="96.2" unit="%">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={controlPassRateTrend} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(216 18% 92%)" />
            <XAxis dataKey="day" {...axisProps} ticks={thinTicks(controlPassRateTrend)} />
            <YAxis {...axisProps} width={28} domain={[90, 98]} />
            <Tooltip {...tooltipStyle()} />
            <Line type="monotone" dataKey="value" stroke="hsl(var(--ok))" strokeWidth={1.8} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Obligations on-time" current="94.6" unit="%">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={obligationsOnTimeTrend} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(216 18% 92%)" />
            <XAxis dataKey="day" {...axisProps} ticks={thinTicks(obligationsOnTimeTrend)} />
            <YAxis {...axisProps} width={28} domain={[82, 98]} />
            <Tooltip {...tooltipStyle()} />
            <Line type="monotone" dataKey="value" stroke="hsl(var(--info))" strokeWidth={1.8} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  )
}
