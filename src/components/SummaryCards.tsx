import React from 'react'
import {
  Flame,
  Zap,
  Footprints,
  Timer,
  Trophy,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { SessionAnalysis } from '@/types/stepData'

interface SummaryCardsProps {
  session: SessionAnalysis
}

export const SummaryCards: React.FC<SummaryCardsProps> = ({ session }) => {
  const spm = Math.round(session.avgSps * 60)
  const peakSpm = Math.round(session.maxSps * 60)

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
      {/* 1. Total Steps */}
      <Card className="relative overflow-hidden border-border/80 bg-gradient-to-br from-card via-card to-indigo-500/5 transition-all hover:shadow-md">
        <div className="absolute top-0 right-0 h-16 w-16 translate-x-4 -translate-y-4 rounded-full bg-indigo-500/10 blur-xl" />
        <CardContent className="p-4.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Total Steps</span>
            <div className="rounded-lg bg-indigo-500/10 p-2 text-indigo-500">
              <Footprints className="size-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              {session.totalSteps.toLocaleString()}
            </span>
            <span className="text-xs text-muted-foreground">steps</span>
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
            <Timer className="size-3.5 text-indigo-500" />
            <span>Duration: <strong className="text-foreground">{session.durationFormatted}</strong></span>
          </div>
        </CardContent>
      </Card>

      {/* 2. Peak Steps Per Second (Max Cadence) */}
      <Card className="relative overflow-hidden border-border/80 bg-gradient-to-br from-card via-card to-rose-500/5 transition-all hover:shadow-md">
        <div className="absolute top-0 right-0 h-16 w-16 translate-x-4 -translate-y-4 rounded-full bg-rose-500/10 blur-xl" />
        <CardContent className="p-4.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Peak Cadence</span>
            <div className="rounded-lg bg-rose-500/10 p-2 text-rose-500">
              <Flame className="size-4 animate-bounce" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-rose-500 sm:text-3xl">
              {session.maxSps}
            </span>
            <span className="text-xs font-medium text-rose-500/80">steps / sec</span>
          </div>
          <div className="mt-2 flex items-center justify-between text-xs">
            <span className="text-muted-foreground">
              Peak at: <strong className="text-foreground">{session.peakTimeFormatted}</strong>
            </span>
            <Badge variant="outline" className="border-rose-500/30 bg-rose-500/10 text-[10px] text-rose-500 font-semibold">
              {peakSpm} SPM
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* 3. Average Steps Per Second */}
      <Card className="relative overflow-hidden border-border/80 bg-gradient-to-br from-card via-card to-cyan-500/5 transition-all hover:shadow-md">
        <div className="absolute top-0 right-0 h-16 w-16 translate-x-4 -translate-y-4 rounded-full bg-cyan-500/10 blur-xl" />
        <CardContent className="p-4.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Average Cadence</span>
            <div className="rounded-lg bg-cyan-500/10 p-2 text-cyan-500">
              <Zap className="size-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              {session.avgSps.toFixed(2)}
            </span>
            <span className="text-xs text-muted-foreground">steps / sec</span>
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
            <span>Pace: <strong className="text-foreground">{spm} SPM</strong></span>
            <span className="text-[11px] text-cyan-600 dark:text-cyan-400 font-medium">
              ~{(session.avgSps * 1.8).toFixed(1)} km/h
            </span>
          </div>
        </CardContent>
      </Card>

      {/* 4. Excitement Tier / Hype Rating */}
      <Card className="relative overflow-hidden border-border/80 bg-gradient-to-br from-card via-card to-amber-500/5 transition-all hover:shadow-md">
        <div className="absolute top-0 right-0 h-16 w-16 translate-x-4 -translate-y-4 rounded-full bg-amber-500/10 blur-xl" />
        <CardContent className="p-4.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Gamer Excitement</span>
            <div className="rounded-lg bg-amber-500/10 p-2 text-amber-500">
              <Trophy className="size-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span
              className="text-2xl font-black tracking-tight sm:text-3xl"
              style={{ color: session.excitementTier.color }}
            >
              {session.excitementTier.level}
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              {session.overallExcitementScore}/100
            </span>
          </div>
          <div className="mt-2 flex items-center justify-between text-xs">
            <span className="truncate font-semibold text-foreground text-[11px]">
              {session.excitementTier.badge}
            </span>
            <span className="text-[11px] text-muted-foreground">
              {session.longestSprintSec}s best sprint
            </span>
          </div>
        </CardContent>
      </Card>

      {/* 5. Caloric & Physical Burn */}
      <Card className="relative overflow-hidden border-border/80 bg-gradient-to-br from-card via-card to-emerald-500/5 transition-all hover:shadow-md">
        <div className="absolute top-0 right-0 h-16 w-16 translate-x-4 -translate-y-4 rounded-full bg-emerald-500/10 blur-xl" />
        <CardContent className="p-4.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Energy Burned</span>
            <div className="rounded-lg bg-emerald-500/10 p-2 text-emerald-500">
              <Flame className="size-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              {session.caloriesBurned}
            </span>
            <span className="text-xs text-muted-foreground">kcal</span>
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
            <span>METs: <strong className="text-foreground">~{(session.avgSps * 2.2).toFixed(1)}</strong></span>
            <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
              Aerobic Exertion
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
