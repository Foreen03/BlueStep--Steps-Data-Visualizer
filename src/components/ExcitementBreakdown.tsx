import React from 'react'
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
} from 'recharts'
import {
  PieChart as PieIcon,
  Flame,
  BatteryCharging,
  TrendingUp,
  Zap,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { SessionAnalysis } from '@/types/stepData'
import { EXCITEMENT_ZONES } from '@/types/stepData'

interface ExcitementBreakdownProps {
  session: SessionAnalysis
}

export const ExcitementBreakdown: React.FC<ExcitementBreakdownProps> = ({ session }) => {
  const pieData = session.zoneSummaries.filter((z) => z.seconds > 0)

  const CustomPieTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ payload: (typeof pieData)[0] }> }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="rounded-xl border border-border/80 bg-background/95 p-2.5 shadow-lg backdrop-blur-md text-xs">
          <div className="font-semibold text-foreground flex items-center gap-1.5">
            <span className="size-2.5 rounded-full" style={{ backgroundColor: data.color }} />
            {data.name}
          </div>
          <div className="mt-1 text-muted-foreground space-y-0.5">
            <div>Duration: <strong>{data.seconds}s</strong> ({data.percentage}%)</div>
            <div>Steps taken: <strong>{data.stepCount}</strong> steps</div>
          </div>
        </div>
      )
    }
    return null
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
      {/* 1. Excitement Zone Distribution Donut Chart (5 cols) */}
      <Card className="border-border/80 bg-card/80 backdrop-blur-sm shadow-sm lg:col-span-5">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <PieIcon className="size-4 text-indigo-500" />
            Excitement Zone Distribution
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Breakdown of session duration across intensity tiers
          </p>
        </CardHeader>
        <CardContent>
          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  dataKey="seconds"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={75}
                  paddingAngle={3}
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                  ))}
                </Pie>
                <Tooltip content={<CustomPieTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Zone Legend Table */}
          <div className="mt-2 space-y-2">
            {session.zoneSummaries.map((z) => {
              const info = EXCITEMENT_ZONES[z.zone]
              return (
                <div key={z.zone} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="size-2.5 rounded-full" style={{ backgroundColor: z.color }} />
                    <span className="font-medium text-foreground">{z.name}</span>
                    <span className="text-[10px] text-muted-foreground font-mono">({info.spsRange})</span>
                  </div>
                  <div className="flex items-center gap-3 font-mono">
                    <span className="text-muted-foreground">{z.seconds}s</span>
                    <span className="w-10 text-right font-semibold text-foreground">{z.percentage}%</span>
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* 2. Gamer Stamina & Fatigue Analysis (7 cols) */}
      <Card className="border-border/80 bg-card/80 backdrop-blur-sm shadow-sm lg:col-span-7 flex flex-col justify-between">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <BatteryCharging className="size-4 text-emerald-500" />
            Gamer Stamina & Burst Dynamics
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Pacing stamina across the session and sudden adrenaline rushes
          </p>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* First Half vs Second Half Stamina */}
          <div className="rounded-xl border border-border/60 bg-muted/20 p-3.5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <TrendingUp className="size-4 text-indigo-500" />
                Pacing Stamina (1st vs 2nd Half)
              </span>
              <Badge
                variant="outline"
                className={`text-[10px] font-bold ${
                  session.fatigueTrend === 'increasing'
                    ? 'border-emerald-500/40 text-emerald-500 bg-emerald-500/10'
                    : session.fatigueTrend === 'exhausted'
                    ? 'border-rose-500/40 text-rose-500 bg-rose-500/10'
                    : 'border-cyan-500/40 text-cyan-500 bg-cyan-500/10'
                }`}
              >
                {session.fatigueTrend === 'increasing'
                  ? '⚡ SECOND WIND / SURGING'
                  : session.fatigueTrend === 'exhausted'
                  ? '🔻 FATIGUE DECLINE'
                  : '⚖️ BALANCED STAMINA'}
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-3 text-center">
              <div className="rounded-lg bg-card p-2.5 border border-border/50">
                <span className="text-[11px] text-muted-foreground">1st Half Cadence</span>
                <div className="text-xl font-bold text-foreground mt-0.5">
                  {session.firstHalfAvgSps} <span className="text-xs font-normal text-muted-foreground">SPS</span>
                </div>
              </div>
              <div className="rounded-lg bg-card p-2.5 border border-border/50">
                <span className="text-[11px] text-muted-foreground">2nd Half Cadence</span>
                <div className="text-xl font-bold text-foreground mt-0.5">
                  {session.secondHalfAvgSps} <span className="text-xs font-normal text-muted-foreground">SPS</span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="rounded-xl border border-border/50 bg-muted/15 p-3">
              <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                <Flame className="size-3.5 text-rose-500" />
                Longest Burst
              </div>
              <div className="text-lg font-bold text-foreground mt-1">
                {session.longestSprintSec}s
              </div>
              <div className="text-[10px] text-muted-foreground">at high cadence</div>
            </div>

            <div className="rounded-xl border border-border/50 bg-muted/15 p-3">
              <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                <Zap className="size-3.5 text-amber-500" />
                Sprint Surges
              </div>
              <div className="text-lg font-bold text-foreground mt-1">
                {session.sprintBurstCount}
              </div>
              <div className="text-[10px] text-muted-foreground">separate burst phases</div>
            </div>

            <div className="rounded-xl border border-border/50 bg-muted/15 p-3 col-span-2 sm:col-span-1">
              <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                <BatteryCharging className="size-3.5 text-cyan-500" />
                Active Ratio
              </div>
              <div className="text-lg font-bold text-foreground mt-1">
                {Math.round(
                  ((session.durationSec -
                    (session.zoneSummaries.find((z) => z.zone === 'rest')?.seconds || 0)) /
                    session.durationSec) *
                    100
                )}%
              </div>
              <div className="text-[10px] text-muted-foreground">active movement</div>
            </div>
          </div>

          {/* Gamer Evaluation Summary */}
          <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/5 p-3 text-xs">
            <strong className="text-indigo-400 font-semibold">Gamer Exertion Profile: </strong>
            <span className="text-muted-foreground">{session.excitementTier.comment}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
