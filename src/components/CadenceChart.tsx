import React, { useState, useMemo } from 'react'
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
  Brush,
  Cell,
} from 'recharts'
import {
  Activity,
  Layers,
  TrendingUp,
  BarChart3,
  SlidersHorizontal,
  Flame,
  Info,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import type { SecondMetric, SessionAnalysis, ExcitementZoneId } from '@/types/stepData'
import { EXCITEMENT_ZONES } from '@/types/stepData'

interface CadenceChartProps {
  session: SessionAnalysis
  onSelectSecond?: (second: number) => void
  highlightedSecond?: number | null
}

export const CadenceChart: React.FC<CadenceChartProps> = ({
  session,
  onSelectSecond,
  highlightedSecond,
}) => {
  const [chartType, setChartType] = useState<'bar' | 'area'>('bar')
  const [showMovingAvg, setShowMovingAvg] = useState(true)
  const [showCumulative, setShowCumulative] = useState(false)
  const [activeZoneFilter, setActiveZoneFilter] = useState<ExcitementZoneId | 'all'>('all')

  const chartData = useMemo(() => {
    return session.secondsData.map((d) => ({
      ...d,
      opacity:
        activeZoneFilter === 'all' || d.zone === activeZoneFilter ? 1 : 0.2,
      isHighlighted: highlightedSecond === d.second,
    }))
  }, [session.secondsData, activeZoneFilter, highlightedSecond])

  const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ payload: SecondMetric & { isHighlighted?: boolean } }> }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      const zone = EXCITEMENT_ZONES[data.zone]

      return (
        <div className="z-50 rounded-xl border border-border/80 bg-background/95 p-3.5 shadow-xl backdrop-blur-md ring-1 ring-foreground/5 min-w-[210px]">
          <div className="flex items-center justify-between border-b border-border/60 pb-2">
            <span className="font-mono text-xs font-semibold text-muted-foreground">
              TIME: {data.timeFormatted} (sec {data.second})
            </span>
            <Badge
              variant="outline"
              className="text-[10px] font-bold"
              style={{
                borderColor: `${zone.color}40`,
                backgroundColor: `${zone.color}15`,
                color: zone.color,
              }}
            >
              {zone.name}
            </Badge>
          </div>

          <div className="mt-2.5 space-y-1.5 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground flex items-center gap-1.5">
                <Flame className="size-3.5 text-rose-500" />
                Step Rate:
              </span>
              <span className="font-bold text-foreground text-sm">
                {data.sps} <span className="text-[10px] font-normal text-muted-foreground">steps/sec</span>
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">3s Rolling Avg:</span>
              <span className="font-mono font-medium text-foreground">
                {data.rollingSps3s} SPS
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Cumulative Steps:</span>
              <span className="font-mono font-semibold text-indigo-500">
                {data.steps} steps
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Cadence Surge:</span>
              <span
                className={`font-mono text-[11px] font-semibold ${
                  data.acceleration > 0
                    ? 'text-emerald-500'
                    : data.acceleration < 0
                    ? 'text-rose-400'
                    : 'text-muted-foreground'
                }`}
              >
                {data.acceleration > 0 ? `+${data.acceleration}` : data.acceleration} SPS/s
              </span>
            </div>

            <div className="mt-2 pt-1.5 border-t border-border/50 flex items-center justify-between">
              <span className="text-[11px] text-muted-foreground">Excitement Score:</span>
              <span className="font-bold text-foreground">
                {data.excitementScore} / 100
              </span>
            </div>
          </div>
        </div>
      )
    }
    return null
  }

  return (
    <Card className="border-border/80 bg-card/80 backdrop-blur-sm shadow-sm">
      <CardHeader className="flex flex-col gap-4 pb-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <CardTitle className="text-base sm:text-lg flex items-center gap-2">
              <Activity className="size-5 text-indigo-500" />
              Second-by-Second Cadence (Steps / Second)
            </CardTitle>
            <Badge variant="secondary" className="text-[11px] font-mono">
              1-Sec Resolution
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Visualize gamer excitement bursts, sprints, and rhythm shifts in real time
          </p>
        </div>

        {/* Controls Bar */}
        <div className="flex flex-wrap items-center gap-1.5">
          {/* Chart Type Toggle */}
          <div className="flex items-center rounded-lg border border-border/80 bg-muted/40 p-0.5">
            <Button
              variant={chartType === 'bar' ? 'default' : 'ghost'}
              size="xs"
              onClick={() => setChartType('bar')}
              className="gap-1 text-xs"
            >
              <BarChart3 className="size-3" />
              <span>Bars</span>
            </Button>
            <Button
              variant={chartType === 'area' ? 'default' : 'ghost'}
              size="xs"
              onClick={() => setChartType('area')}
              className="gap-1 text-xs"
            >
              <TrendingUp className="size-3" />
              <span>Smooth Flow</span>
            </Button>
          </div>

          {/* Moving Average Toggle */}
          <Button
            variant={showMovingAvg ? 'secondary' : 'outline'}
            size="xs"
            onClick={() => setShowMovingAvg(!showMovingAvg)}
            className="gap-1 text-xs"
          >
            <SlidersHorizontal className="size-3 text-cyan-500" />
            <span>3s Trend</span>
          </Button>

          {/* Cumulative Toggle */}
          <Button
            variant={showCumulative ? 'secondary' : 'outline'}
            size="xs"
            onClick={() => setShowCumulative(!showCumulative)}
            className="gap-1 text-xs"
          >
            <Layers className="size-3 text-indigo-500" />
            <span>Cumulative</span>
          </Button>
        </div>
      </CardHeader>

      <CardContent className="pt-2">
        {/* Excitement Zone Legend & Filters */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-medium text-muted-foreground mr-1">
              Excitement Zones:
            </span>
            <Button
              variant={activeZoneFilter === 'all' ? 'default' : 'ghost'}
              size="xs"
              onClick={() => setActiveZoneFilter('all')}
              className="h-6 text-[10px] px-2 rounded-full"
            >
              All Zones
            </Button>
            {(Object.keys(EXCITEMENT_ZONES) as ExcitementZoneId[]).map((zoneId) => {
              const zone = EXCITEMENT_ZONES[zoneId]
              const isActive = activeZoneFilter === zoneId
              return (
                <button
                  key={zoneId}
                  onClick={() =>
                    setActiveZoneFilter(activeZoneFilter === zoneId ? 'all' : zoneId)
                  }
                  className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-medium transition-all ${
                    isActive
                      ? 'ring-2 ring-primary ring-offset-1 text-foreground font-semibold'
                      : 'hover:bg-muted text-muted-foreground'
                  }`}
                  style={{
                    backgroundColor: isActive ? `${zone.color}25` : undefined,
                  }}
                >
                  <span
                    className="size-2 rounded-full"
                    style={{ backgroundColor: zone.color }}
                  />
                  <span>{zone.name}</span>
                  <span className="text-[9px] opacity-75 font-mono">({zone.spsRange})</span>
                </button>
              )
            })}
          </div>

          <div className="hidden sm:flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <Info className="size-3" />
            <span>Click any bar or drag slider to scrub through timeline</span>
          </div>
        </div>

        {/* Main Chart */}
        <div className="h-80 w-full sm:h-96">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={chartData}
              margin={{ top: 15, right: 15, left: -10, bottom: 0 }}
              onClick={(state) => {
                if (state && typeof state.activeTooltipIndex === 'number' && onSelectSecond) {
                  onSelectSecond(state.activeTooltipIndex)
                }
              }}
            >
              <defs>
                <linearGradient id="spsGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8} />
                  <stop offset="50%" stopColor="#f59e0b" stopOpacity={0.5} />
                  <stop offset="80%" stopColor="#06b6d4" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.1} />
                </linearGradient>
              </defs>

              <CartesianGrid
                strokeDasharray="3 3"
                className="stroke-border/40"
                vertical={false}
              />

              <XAxis
                dataKey="timeFormatted"
                stroke="currentColor"
                className="text-[10px] text-muted-foreground font-mono"
                tickLine={false}
                interval="preserveStartEnd"
              />

              {/* Primary Y-axis: SPS */}
              <YAxis
                yAxisId="left"
                stroke="currentColor"
                className="text-[10px] text-muted-foreground font-mono"
                tickLine={false}
                domain={[0, Math.max(5, session.maxSps + 1)]}
                ticks={[0, 1, 2, 3, 4, Math.max(5, session.maxSps + 1)]}
                allowDecimals={false}
                label={{
                  value: 'Steps / Sec (Cadence)',
                  angle: -90,
                  position: 'insideLeft',
                  offset: 20,
                  style: { fill: 'currentColor', fontSize: 10, opacity: 0.7 },
                }}
              />

              {/* Optional Secondary Y-axis: Cumulative Steps */}
              {showCumulative && (
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  stroke="#6366f1"
                  className="text-[10px] font-mono text-indigo-500"
                  tickLine={false}
                  domain={[0, session.totalSteps + 10]}
                  label={{
                    value: 'Cumulative',
                    angle: 90,
                    position: 'insideRight',
                    offset: 10,
                    style: { fill: '#6366f1', fontSize: 10 },
                  }}
                />
              )}

              <Tooltip content={<CustomTooltip />} />

              {/* High Excitement / Sprint Reference Threshold */}
              <ReferenceLine
                yAxisId="left"
                y={3}
                stroke="#f59e0b"
                strokeDasharray="4 4"
                label={{
                  value: 'High Excitement (3 SPS)',
                  fill: '#f59e0b',
                  fontSize: 10,
                  position: 'insideTopRight',
                }}
              />

              {/* Average Cadence Reference Line */}
              <ReferenceLine
                yAxisId="left"
                y={session.avgSps}
                stroke="#06b6d4"
                strokeDasharray="2 2"
                label={{
                  value: `Avg ${session.avgSps} SPS`,
                  fill: '#06b6d4',
                  fontSize: 10,
                  position: 'insideBottomRight',
                }}
              />

              {/* Render Bar or Area depending on mode */}
              {chartType === 'bar' ? (
                <Bar
                  yAxisId="left"
                  dataKey="sps"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={28}
                  animationDuration={600}
                >
                  {chartData.map((entry, index) => {
                    const zone = EXCITEMENT_ZONES[entry.zone]
                    const isCurrent = entry.isHighlighted
                    return (
                      <Cell
                        key={`cell-${index}`}
                        fill={isCurrent ? '#ffffff' : zone.color}
                        stroke={isCurrent ? '#6366f1' : undefined}
                        strokeWidth={isCurrent ? 2 : 0}
                        opacity={entry.opacity}
                      />
                    )
                  })}
                </Bar>
              ) : (
                <Area
                  yAxisId="left"
                  type="monotone"
                  dataKey="sps"
                  stroke="#ef4444"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#spsGradient)"
                />
              )}

              {/* Smoothed 3s Moving Average Curve */}
              {showMovingAvg && (
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="rollingSps3s"
                  stroke="#38bdf8"
                  strokeWidth={2.5}
                  dot={false}
                  strokeDasharray={chartType === 'bar' ? 'none' : '4 2'}
                />
              )}

              {/* Cumulative Steps Line */}
              {showCumulative && (
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="steps"
                  stroke="#818cf8"
                  strokeWidth={2}
                  dot={false}
                />
              )}

              {/* Interactive Brush Zoom Slider */}
              <Brush
                dataKey="timeFormatted"
                height={26}
                stroke="#6366f1"
                fill="var(--background)"
                className="opacity-70"
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
