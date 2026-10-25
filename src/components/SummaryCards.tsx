import React from 'react'
import type { SessionAnalysis } from '@/types/stepData'

interface SummaryCardsProps {
  session: SessionAnalysis
}

export const SummaryCards: React.FC<SummaryCardsProps> = ({ session }) => {
  const spm = Math.round(session.avgSps * 60)
  const peakSpm = Math.round(session.maxSps * 60)

  return (
    <div className="rounded-lg border border-border bg-card p-0 overflow-hidden">
      <div className="grid grid-cols-1 divide-y divide-border sm:grid-cols-2 sm:divide-y-0 sm:divide-x lg:grid-cols-5">
        {/* 1. Total Steps */}
        <div className="p-4 sm:p-5">
          <div className="text-sm font-normal text-muted-foreground">
            Total steps
          </div>
          <div className="mt-1.5 flex items-baseline gap-1.5">
            <span className="text-2xl font-semibold tabular-nums tracking-tight text-foreground sm:text-3xl">
              {session.totalSteps.toLocaleString()}
            </span>
            <span className="text-sm text-muted-foreground">steps</span>
          </div>
          <div className="mt-2 text-[13px] text-muted-foreground tabular-nums">
            Duration: {session.durationFormatted}
          </div>
        </div>

        {/* 2. Peak Cadence */}
        <div className="p-4 sm:p-5">
          <div className="text-sm font-normal text-muted-foreground">
            Peak cadence
          </div>
          <div className="mt-1.5 flex items-baseline gap-1.5">
            <span className="text-2xl font-semibold tabular-nums tracking-tight text-foreground sm:text-3xl">
              {session.maxSps}
            </span>
            <span className="text-sm text-muted-foreground">steps / sec</span>
          </div>
          <div className="mt-2 text-[13px] text-muted-foreground tabular-nums">
            At {session.peakTimeFormatted} ({peakSpm} SPM)
          </div>
        </div>

        {/* 3. Average Cadence */}
        <div className="p-4 sm:p-5">
          <div className="text-sm font-normal text-muted-foreground">
            Average cadence
          </div>
          <div className="mt-1.5 flex items-baseline gap-1.5">
            <span className="text-2xl font-semibold tabular-nums tracking-tight text-foreground sm:text-3xl">
              {session.avgSps.toFixed(2)}
            </span>
            <span className="text-sm text-muted-foreground">steps / sec</span>
          </div>
          <div className="mt-2 text-[13px] text-muted-foreground tabular-nums">
            Pacing: {spm} SPM (~{(session.avgSps * 1.8).toFixed(1)} km/h)
          </div>
        </div>

        {/* 4. Excitement Tier */}
        <div className="p-4 sm:p-5">
          <div className="text-sm font-normal text-muted-foreground">
            Excitement rating
          </div>
          <div className="mt-1.5 flex items-baseline gap-2">
            <span
              className="text-2xl font-semibold tracking-tight sm:text-3xl"
              style={{ color: session.excitementTier.color }}
            >
              {session.excitementTier.level}
            </span>
            <span className="text-sm font-normal tabular-nums text-muted-foreground">
              {session.overallExcitementScore} / 100
            </span>
          </div>
          <div className="mt-2 text-[13px] text-muted-foreground">
            {session.longestSprintSec}s sustained burst
          </div>
        </div>

        {/* 5. Caloric & Physical Burn */}
        <div className="p-4 sm:p-5">
          <div className="text-sm font-normal text-muted-foreground">
            Energy expenditure
          </div>
          <div className="mt-1.5 flex items-baseline gap-1.5">
            <span className="text-2xl font-semibold tabular-nums tracking-tight text-foreground sm:text-3xl">
              {session.caloriesBurned}
            </span>
            <span className="text-sm text-muted-foreground">kcal</span>
          </div>
          <div className="mt-2 text-[13px] text-muted-foreground tabular-nums">
            Aerobic ~{(session.avgSps * 2.2).toFixed(1)} METs
          </div>
        </div>
      </div>
    </div>
  )
}
