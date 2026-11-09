import React from "react"
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts"
import type { SessionAnalysis } from "@/types/stepData"
import { EXCITEMENT_ZONES } from "@/types/stepData"

interface ExcitementBreakdownProps {
  session: SessionAnalysis
}

export const ExcitementBreakdown: React.FC<ExcitementBreakdownProps> = ({
  session,
}) => {
  const pieData = session.zoneSummaries.filter((z) => z.seconds > 0)

  const CustomPieTooltip = ({
    active,
    payload,
  }: {
    active?: boolean
    payload?: Array<{ payload: (typeof pieData)[0] }>
  }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="rounded-md border border-border bg-card p-2.5 text-xs shadow-md">
          <div className="flex items-center gap-1.5 font-medium text-foreground">
            <span
              className="size-2 rounded-xs"
              style={{ backgroundColor: data.color }}
            />
            {data.name}
          </div>
          <div className="mt-1 space-y-0.5 text-muted-foreground tabular-nums">
            <div>
              Duration: {data.seconds}s ({data.percentage}%)
            </div>
            <div>Step count: {data.stepCount} steps</div>
          </div>
        </div>
      )
    }
    return null
  }

  const fatigueLabel =
    session.fatigueTrend === "increasing"
      ? "Second wind pacing"
      : session.fatigueTrend === "exhausted"
        ? "Fatigue decline"
        : "Balanced stamina"

  const fatigueColor =
    session.fatigueTrend === "increasing"
      ? "text-accent"
      : session.fatigueTrend === "exhausted"
        ? "text-destructive"
        : "text-foreground"

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
      {/* 1. Excitement Zone Distribution Donut Chart (5 cols) */}
      <div className="flex flex-col justify-between rounded-lg border border-border bg-card p-4 sm:p-6 lg:col-span-5">
        <div className="border-b border-border pb-3">
          <h3 className="text-base font-semibold text-foreground">
            Cadence zone distribution
          </h3>
          <p className="mt-0.5 text-[13px] text-muted-foreground">
            Breakdown of session duration across intensity tiers
          </p>
        </div>

        <div className="py-2">
          <div className="h-44 w-full">
            <ResponsiveContainer width="100%" height="100%" minWidth={100} minHeight={100}>
              <PieChart>
                <Pie
                  data={pieData}
                  dataKey="seconds"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={46}
                  outerRadius={72}
                  paddingAngle={2}
                  isAnimationActive={false}
                >
                  {pieData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.color}
                      stroke="none"
                    />
                  ))}
                </Pie>
                <Tooltip content={<CustomPieTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Zone Legend Table */}
          <div className="mt-3 space-y-2 border-t border-border pt-3">
            {session.zoneSummaries.map((z) => {
              const info = EXCITEMENT_ZONES[z.zone]
              return (
                <div
                  key={z.zone}
                  className="flex items-center justify-between text-[13px]"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="size-2 rounded-xs"
                      style={{ backgroundColor: z.color }}
                    />
                    <span className="font-medium text-foreground">
                      {z.name}
                    </span>
                    <span className="text-muted-foreground">
                      ({info.spsRange})
                    </span>
                  </div>
                  <div className="flex items-center gap-3 font-mono tabular-nums">
                    <span className="text-muted-foreground">{z.seconds}s</span>
                    <span className="w-10 text-right font-medium text-foreground">
                      {z.percentage}%
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* 2. Gamer Stamina & Fatigue Analysis (7 cols) */}
      <div className="flex flex-col justify-between space-y-4 rounded-lg border border-border bg-card p-4 sm:p-6 lg:col-span-7">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div>
            <h3 className="text-base font-semibold text-foreground">
              Stamina and pacing dynamics
            </h3>
            <p className="mt-0.5 text-[13px] text-muted-foreground">
              Comparison of first half vs second half cadence and burst duration
            </p>
          </div>

          <span className={`text-[13px] font-semibold ${fatigueColor}`}>
            {fatigueLabel}
          </span>
        </div>

        {/* First Half vs Second Half */}
        <div className="rounded-md border border-border bg-muted/20 p-4">
          <div className="mb-3 text-[13px] font-medium text-foreground">
            Cadence pacing split
          </div>
          <div className="grid grid-cols-2 gap-3 text-center">
            <div className="rounded-sm border border-border bg-card p-3">
              <div className="text-[13px] text-muted-foreground">
                First half cadence
              </div>
              <div className="mt-1 text-2xl font-semibold text-foreground tabular-nums">
                {session.firstHalfAvgSps}{" "}
                <span className="text-[13px] font-normal text-muted-foreground">
                  sps
                </span>
              </div>
            </div>
            <div className="rounded-sm border border-border bg-card p-3">
              <div className="text-[13px] text-muted-foreground">
                Second half cadence
              </div>
              <div className="mt-1 text-2xl font-semibold text-foreground tabular-nums">
                {session.secondHalfAvgSps}{" "}
                <span className="text-[13px] font-normal text-muted-foreground">
                  sps
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-md border border-border bg-muted/20 p-3">
            <div className="text-[13px] text-muted-foreground">
              Longest burst
            </div>
            <div className="mt-0.5 text-lg font-semibold text-foreground tabular-nums">
              {session.longestSprintSec}s
            </div>
            <div className="text-[13px] text-muted-foreground">
              Continuous sprint
            </div>
          </div>

          <div className="rounded-md border border-border bg-muted/20 p-3">
            <div className="text-[13px] text-muted-foreground">
              Sprint phases
            </div>
            <div className="mt-0.5 text-lg font-semibold text-foreground tabular-nums">
              {session.sprintBurstCount}
            </div>
            <div className="text-[13px] text-muted-foreground">
              Separate bursts
            </div>
          </div>

          <div className="rounded-md border border-border bg-muted/20 p-3">
            <div className="text-[13px] text-muted-foreground">
              Active ratio
            </div>
            <div className="mt-0.5 text-lg font-semibold text-foreground tabular-nums">
              {Math.round(
                ((session.durationSec -
                  (session.zoneSummaries.find((z) => z.zone === "rest")
                    ?.seconds || 0)) /
                  session.durationSec) *
                  100
              )}
              %
            </div>
            <div className="text-[13px] text-muted-foreground">
              Session uptime
            </div>
          </div>
        </div>

        {/* Summary note */}
        <div className="rounded-md border border-border bg-muted/10 p-3 text-[13px] text-muted-foreground">
          <strong className="font-medium text-foreground">
            Session observation:{" "}
          </strong>
          {session.excitementTier.comment}
        </div>
      </div>
    </div>
  )
}
