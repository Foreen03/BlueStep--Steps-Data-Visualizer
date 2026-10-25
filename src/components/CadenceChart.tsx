import React, { useState, useMemo } from 'react'
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
  Brush,
  Cell,
} from 'recharts'
import { Button } from '@/components/ui/button'
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
        <div className="z-50 rounded-md border border-border bg-card p-3 shadow-md min-w-[200px]">
          <div className="flex items-center justify-between border-b border-border pb-1.5">
            <span className="font-mono text-xs text-muted-foreground tabular-nums">
              Time: {data.timeFormatted} ({data.second}s)
            </span>
            <span
              className="text-xs font-medium"
              style={{ color: zone.color }}
            >
              {zone.name}
            </span>
          </div>

          <div className="mt-2 space-y-1 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Cadence:</span>
              <span className="font-semibold text-foreground font-mono tabular-nums">
                {data.sps} <span className="font-normal text-muted-foreground">sps</span>
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">3s trend:</span>
              <span className="font-mono tabular-nums text-foreground">
                {data.rollingSps3s} sps
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Cumulative:</span>
              <span className="font-mono tabular-nums text-foreground">
                {data.steps} steps
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Acceleration:</span>
              <span
                className={`font-mono tabular-nums font-medium ${
                  data.acceleration > 0
                    ? 'text-foreground'
                    : data.acceleration < 0
                    ? 'text-destructive'
                    : 'text-muted-foreground'
                }`}
              >
                {data.acceleration > 0 ? `+${data.acceleration}` : data.acceleration} sps/s
              </span>
            </div>

            <div className="mt-1.5 pt-1.5 border-t border-border flex items-center justify-between">
              <span className="text-muted-foreground">Excitement score:</span>
              <span className="font-mono tabular-nums font-medium text-foreground">
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
    <div className="rounded-lg border border-border bg-card p-4 sm:p-6 space-y-4">
      {/* Header and Controls */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-3">
        <div>
          <h3 className="text-base font-semibold text-foreground">
            Second-by-second cadence
          </h3>
          <p className="text-[13px] text-muted-foreground mt-0.5">
            Step rate per second with 3s moving average and burst zones
          </p>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap items-center gap-1.5">
          <Button
            variant={showMovingAvg ? 'secondary' : 'outline'}
            size="sm"
            onClick={() => setShowMovingAvg(!showMovingAvg)}
            className="h-7 text-[13px] border-border"
          >
            3s Trend
          </Button>

          <Button
            variant={showCumulative ? 'secondary' : 'outline'}
            size="sm"
            onClick={() => setShowCumulative(!showCumulative)}
            className="h-7 text-[13px] border-border"
          >
            Cumulative steps
          </Button>
        </div>
      </div>

      {/* Zone Legend */}
      <div className="flex flex-wrap items-center gap-2 text-[13px]">
        <span className="text-muted-foreground font-normal">Cadence zone:</span>
        <button
          onClick={() => setActiveZoneFilter('all')}
          className={`px-2 py-0.5 rounded-sm transition-colors ${
            activeZoneFilter === 'all'
              ? 'bg-muted text-foreground font-medium'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          All
        </button>
        {(Object.keys(EXCITEMENT_ZONES) as ExcitementZoneId[]).map((zoneId) => {
          const zone = EXCITEMENT_ZONES[zoneId]
          const isActive = activeZoneFilter === zoneId
          return (
            <button
              key={zoneId}
              onClick={() =>
                setActiveZoneFilter(activeZoneFilter === zoneId ? 'all' : zoneId)
              }
              className={`flex items-center gap-1.5 px-2 py-0.5 rounded-sm transition-colors ${
                isActive
                  ? 'bg-muted text-foreground font-medium'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <span
                className="size-2 rounded-xs"
                style={{ backgroundColor: zone.color }}
              />
              <span>{zone.name}</span>
              <span className="text-muted-foreground">({zone.spsRange})</span>
            </button>
          )
        })}
      </div>

      {/* Chart Canvas */}
      <div className="h-80 w-full sm:h-96">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={chartData}
            margin={{ top: 12, right: 12, left: -16, bottom: 0 }}
            onClick={(state) => {
              if (state && typeof state.activeTooltipIndex === 'number' && onSelectSecond) {
                onSelectSecond(state.activeTooltipIndex)
              }
            }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              className="stroke-border/50"
              vertical={false}
            />

            <XAxis
              dataKey="timeFormatted"
              stroke="currentColor"
              className="text-xs text-muted-foreground font-mono"
              tickLine={false}
              interval="preserveStartEnd"
            />

            {/* Left Y-axis: SPS */}
            <YAxis
              yAxisId="left"
              stroke="currentColor"
              className="text-xs text-muted-foreground font-mono"
              tickLine={false}
              domain={[0, Math.max(5, session.maxSps + 1)]}
              ticks={[0, 1, 2, 3, 4, 5]}
              allowDecimals={false}
              label={{
                value: 'Steps / second',
                angle: -90,
                position: 'insideLeft',
                offset: 24,
                style: { fill: 'currentColor', fontSize: 11, opacity: 0.6 },
              }}
            />

            {showCumulative && (
              <YAxis
                yAxisId="right"
                orientation="right"
                stroke="currentColor"
                className="text-xs text-muted-foreground font-mono"
                tickLine={false}
                domain={[0, session.totalSteps + 10]}
                label={{
                  value: 'Cumulative steps',
                  angle: 90,
                  position: 'insideRight',
                  offset: 12,
                  style: { fill: 'currentColor', fontSize: 11, opacity: 0.6 },
                }}
              />
            )}

            <Tooltip content={<CustomTooltip />} />

            {/* Reference Line for High Excitement Sprint (3 SPS) */}
            <ReferenceLine
              yAxisId="left"
              y={3}
              stroke="#a86f0c"
              strokeDasharray="4 4"
              label={{
                value: 'Sprint threshold (3 sps)',
                fill: '#a86f0c',
                fontSize: 11,
                position: 'insideTopRight',
              }}
            />

            {/* Reference Line for Session Average */}
            <ReferenceLine
              yAxisId="left"
              y={session.avgSps}
              stroke="#1b6c80"
              strokeDasharray="2 2"
              label={{
                value: `Avg ${session.avgSps} sps`,
                fill: '#1b6c80',
                fontSize: 11,
                position: 'insideBottomRight',
              }}
            />

            {/* Flat Step Bars */}
            <Bar
              yAxisId="left"
              dataKey="sps"
              radius={[2, 2, 0, 0]}
              maxBarSize={28}
              isAnimationActive={false}
            >
              {chartData.map((entry, index) => {
                const zone = EXCITEMENT_ZONES[entry.zone]
                const isCurrent = entry.isHighlighted
                return (
                  <Cell
                    key={`cell-${index}`}
                    fill={isCurrent ? '#ffffff' : zone.color}
                    stroke={isCurrent ? '#131416' : undefined}
                    strokeWidth={isCurrent ? 1.5 : 0}
                    opacity={entry.opacity}
                  />
                )
              })}
            </Bar>

            {/* 3s Moving Average Curve */}
            {showMovingAvg && (
              <Line
                yAxisId="left"
                type="linear"
                dataKey="rollingSps3s"
                stroke="#1b6c80"
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
              />
            )}

            {/* Cumulative Steps */}
            {showCumulative && (
              <Line
                yAxisId="right"
                type="linear"
                dataKey="steps"
                stroke="#5d5f60"
                strokeWidth={1.5}
                dot={false}
                isAnimationActive={false}
              />
            )}

            <Brush
              dataKey="timeFormatted"
              height={24}
              stroke="#1b6c80"
              fill="var(--background)"
              className="opacity-60"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
