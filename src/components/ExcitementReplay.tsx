import React, { useState, useEffect, useRef } from 'react'
import confetti from 'canvas-confetti'
import {
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  Flame,
  Footprints,
  Gauge,
  Sparkles,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Slider } from '@/components/ui/slider'
import type { SessionAnalysis } from '@/types/stepData'
import { EXCITEMENT_ZONES } from '@/types/stepData'
import { playStepSound, playOverdriveSound } from '@/lib/soundEffects'

interface ExcitementReplayProps {
  session: SessionAnalysis
  currentSecond: number
  onSecondChange: (second: number) => void
}

export const ExcitementReplay: React.FC<ExcitementReplayProps> = ({
  session,
  currentSecond,
  onSecondChange,
}) => {
  const [isPlaying, setIsPlaying] = useState(false)
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1)
  const [soundEnabled, setSoundEnabled] = useState(false)
  const [activeFoot, setActiveFoot] = useState<'left' | 'right' | null>(null)
  const [comboStreak, setComboStreak] = useState(0)

  const currentMetric = session.secondsData[currentSecond] || session.secondsData[0]
  const zone = EXCITEMENT_ZONES[currentMetric.zone]

  const timerRef = useRef<number | null>(null)
  const currentSecondRef = useRef(currentSecond)
  currentSecondRef.current = currentSecond

  // Handle Playback Loop
  useEffect(() => {
    if (!isPlaying) {
      if (timerRef.current) clearInterval(timerRef.current)
      return
    }

    const intervalMs = 1000 / playbackSpeed
    timerRef.current = window.setInterval(() => {
      const nextSec = currentSecondRef.current + 1
      if (nextSec >= session.secondsData.length) {
        setIsPlaying(false)
        onSecondChange(0)
      } else {
        onSecondChange(nextSec)
      }
    }, intervalMs)

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [isPlaying, playbackSpeed, session.secondsData.length, onSecondChange])

  // React to current second changes: sounds, foot alternation, combos, and celebrations
  useEffect(() => {
    if (!currentMetric) return

    // Sound feedback
    if (soundEnabled && currentMetric.sps > 0) {
      playStepSound(currentMetric.sps)
      if (currentMetric.sps >= 4) {
        playOverdriveSound()
      }
    }

    // Foot animation toggle
    if (currentMetric.sps > 0) {
      setActiveFoot((prev) => (prev === 'left' ? 'right' : 'left'))
    } else {
      setActiveFoot(null)
    }

    // Combo streak tracking
    if (currentMetric.sps >= 3) {
      setComboStreak((prev) => {
        const next = prev + 1
        // Trigger celebratory confetti on high bursts!
        if (next === 5 || currentMetric.sps >= 4) {
          try {
            confetti({
              particleCount: 25,
              spread: 60,
              origin: { y: 0.65 },
              colors: ['#ef4444', '#f59e0b', '#06b6d4'],
            })
          } catch {
            // Ignore if confetti not supported
          }
        }
        return next
      })
    } else {
      setComboStreak(0)
    }
  }, [currentSecond, currentMetric, soundEnabled])

  // Tachometer Needle Angle Calculation (-120deg to +120deg)
  const maxDialSps = 5
  const currentRatio = Math.min(1, currentMetric.sps / maxDialSps)
  const needleAngle = -120 + currentRatio * 240

  return (
    <Card className="border-border/80 bg-gradient-to-b from-card via-card to-muted/20 shadow-sm overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="flex items-center gap-2">
          <CardTitle className="text-base sm:text-lg flex items-center gap-2">
            <Gauge className="size-5 text-indigo-500" />
            Live Excitement Simulator & Replay
          </CardTitle>
          <Badge
            variant="outline"
            className="border-indigo-500/30 bg-indigo-500/10 text-indigo-500 text-[10px]"
          >
            REALTIME REPLAY
          </Badge>
        </div>

        {/* Audio Toggle */}
        <Button
          variant={soundEnabled ? 'secondary' : 'ghost'}
          size="xs"
          onClick={() => setSoundEnabled(!soundEnabled)}
          className="gap-1.5 text-xs text-muted-foreground hover:text-foreground"
          title="Toggle audio rhythm feedback"
        >
          {soundEnabled ? (
            <>
              <Volume2 className="size-3.5 text-emerald-500 animate-pulse" />
              <span className="text-[11px] text-emerald-500 font-medium">Audio Active</span>
            </>
          ) : (
            <>
              <VolumeX className="size-3.5" />
              <span className="text-[11px]">Muted</span>
            </>
          )}
        </Button>
      </CardHeader>

      <CardContent className="space-y-6 pt-2">
        {/* Tachometer & Footstep Pads Arena */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-12 items-center">
          {/* Left: Interactive Speedometer / Tachometer Gauge (5 cols) */}
          <div className="flex flex-col items-center justify-center md:col-span-5 relative">
            <div className="relative size-56 sm:size-64 flex items-center justify-center">
              {/* Outer Glow Halo based on zone */}
              <div
                className="absolute inset-4 rounded-full blur-2xl opacity-20 transition-all duration-300"
                style={{ backgroundColor: zone.color }}
              />

              {/* Tachometer SVG Dial */}
              <svg className="size-full -rotate-90" viewBox="0 0 200 200">
                {/* Background Track Arc */}
                <circle
                  cx="100"
                  cy="100"
                  r="78"
                  fill="none"
                  stroke="currentColor"
                  className="text-border/40"
                  strokeWidth="12"
                  strokeDasharray="360"
                  strokeDashoffset="120"
                  strokeLinecap="round"
                />

                {/* Animated Value Arc */}
                <circle
                  cx="100"
                  cy="100"
                  r="78"
                  fill="none"
                  stroke={zone.color}
                  strokeWidth="12"
                  strokeDasharray="360"
                  strokeDashoffset={360 - currentRatio * 240}
                  strokeLinecap="round"
                  className="transition-all duration-300 ease-out"
                />
              </svg>

              {/* Animated Needle */}
              <div
                className="absolute size-full flex items-center justify-center transition-transform duration-300 ease-out pointer-events-none"
                style={{ transform: `rotate(${needleAngle}deg)` }}
              >
                <div className="relative h-28 w-1 flex flex-col items-center justify-start -translate-y-10">
                  <div
                    className="w-1.5 h-16 rounded-full shadow-lg"
                    style={{ backgroundColor: zone.color }}
                  />
                  <div className="size-3 rounded-full bg-foreground border-2 border-background" />
                </div>
              </div>

              {/* Center Metrics Readout */}
              <div className="absolute flex flex-col items-center justify-center text-center">
                <span className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
                  CURRENT CADENCE
                </span>
                <div className="flex items-baseline gap-1 mt-0.5">
                  <span
                    className="text-4xl sm:text-5xl font-black tracking-tight transition-colors duration-300"
                    style={{ color: zone.color }}
                  >
                    {currentMetric.sps}
                  </span>
                  <span className="text-xs font-semibold text-muted-foreground">SPS</span>
                </div>
                <div className="mt-1 flex items-center gap-1 font-mono text-xs text-muted-foreground">
                  <span>{Math.round(currentMetric.sps * 60)} SPM</span>
                  <span>•</span>
                  <span className="text-foreground font-semibold">{currentMetric.steps} steps</span>
                </div>
              </div>
            </div>

            {/* Zone Status Pill */}
            <div className="mt-1 flex items-center gap-2">
              <Badge
                variant="outline"
                className="px-3 py-1 font-semibold text-xs border"
                style={{
                  borderColor: `${zone.color}60`,
                  backgroundColor: `${zone.color}15`,
                  color: zone.color,
                }}
              >
                {zone.name} • {zone.description}
              </Badge>
            </div>
          </div>

          {/* Right: Step Pads & Combo Visualizer (7 cols) */}
          <div className="flex flex-col items-center justify-center gap-4 md:col-span-7 bg-muted/20 rounded-2xl p-4 border border-border/60">
            {/* Top Gamer Excitement Indicator */}
            <div className="w-full flex items-center justify-between px-2">
              <div className="flex items-center gap-2">
                <Flame
                  className={`size-5 transition-transform ${
                    currentMetric.sps >= 3 ? 'text-rose-500 scale-125 animate-bounce' : 'text-muted-foreground'
                  }`}
                />
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  EXCITEMENT LEVEL
                </span>
              </div>
              {comboStreak > 0 && (
                <Badge className="bg-gradient-to-r from-amber-500 to-rose-500 text-white font-black text-xs animate-pulse">
                  <Sparkles className="size-3 mr-1" />
                  BURST COMBO x{comboStreak}!
                </Badge>
              )}
            </div>

            {/* Excitement Intensity Bar */}
            <div className="w-full space-y-1">
              <div className="flex justify-between text-[11px] text-muted-foreground">
                <span>Intensity Score: <strong>{currentMetric.excitementScore} / 100</strong></span>
                <span>Acceleration: <strong>{currentMetric.acceleration > 0 ? `+${currentMetric.acceleration}` : currentMetric.acceleration} SPS/s</strong></span>
              </div>
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full transition-all duration-300 bg-gradient-to-r from-cyan-500 via-amber-500 to-rose-500"
                  style={{ width: `${currentMetric.excitementScore}%` }}
                />
              </div>
            </div>

            {/* Footstep Stepping Pads (Left / Right) */}
            <div className="w-full pt-2">
              <div className="text-[11px] font-semibold text-muted-foreground uppercase text-center mb-2">
                Gamer Stepping Telemetry
              </div>
              <div className="grid grid-cols-2 gap-4">
                {/* Left Foot Pad */}
                <div
                  className={`relative flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all duration-150 ${
                    activeFoot === 'left'
                      ? 'border-cyan-400 bg-cyan-500/20 shadow-lg shadow-cyan-500/30 scale-105'
                      : 'border-border/60 bg-card/60 opacity-60'
                  }`}
                >
                  <Footprints
                    className={`size-8 transition-transform ${
                      activeFoot === 'left' ? 'text-cyan-400 scale-110 -scale-x-100' : 'text-muted-foreground -scale-x-100'
                    }`}
                  />
                  <span className="mt-1 text-xs font-bold tracking-wider">LEFT FOOT</span>
                  {activeFoot === 'left' && (
                    <span className="absolute -top-1 -right-1 flex size-3">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400 opacity-75" />
                      <span className="relative inline-flex size-3 rounded-full bg-cyan-500" />
                    </span>
                  )}
                </div>

                {/* Right Foot Pad */}
                <div
                  className={`relative flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all duration-150 ${
                    activeFoot === 'right'
                      ? 'border-indigo-400 bg-indigo-500/20 shadow-lg shadow-indigo-500/30 scale-105'
                      : 'border-border/60 bg-card/60 opacity-60'
                  }`}
                >
                  <Footprints
                    className={`size-8 transition-transform ${
                      activeFoot === 'right' ? 'text-indigo-400 scale-110' : 'text-muted-foreground'
                    }`}
                  />
                  <span className="mt-1 text-xs font-bold tracking-wider">RIGHT FOOT</span>
                  {activeFoot === 'right' && (
                    <span className="absolute -top-1 -right-1 flex size-3">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-indigo-400 opacity-75" />
                      <span className="relative inline-flex size-3 rounded-full bg-indigo-500" />
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Timeline Scrubber & Playback Controls */}
        <div className="space-y-3 rounded-xl border border-border/60 bg-card/50 p-3.5">
          {/* Progress Slider */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-foreground font-semibold">
                {currentMetric.timeFormatted} ({currentSecond}s)
              </span>
              <span className="text-muted-foreground">
                {session.durationFormatted} ({session.durationSec}s)
              </span>
            </div>
            <Slider
              value={[currentSecond]}
              min={0}
              max={session.secondsData.length - 1}
              step={1}
              onValueChange={([val]) => onSecondChange(val)}
              className="cursor-pointer"
            />
          </div>

          {/* Player Buttons */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <div className="flex items-center gap-2">
              <Button
                variant="default"
                size="sm"
                onClick={() => setIsPlaying(!isPlaying)}
                className={`gap-1.5 font-semibold text-white ${
                  isPlaying ? 'bg-amber-600 hover:bg-amber-700' : 'bg-indigo-600 hover:bg-indigo-700'
                }`}
              >
                {isPlaying ? <Pause className="size-4" /> : <Play className="size-4" />}
                <span>{isPlaying ? 'Pause' : 'Play Session'}</span>
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setIsPlaying(false)
                  onSecondChange(0)
                }}
                title="Restart from beginning"
                className="size-8 p-0"
              >
                <RotateCcw className="size-3.5" />
              </Button>
            </div>

            {/* Playback Speed Multipliers */}
            <div className="flex items-center gap-1">
              <span className="text-[11px] font-medium text-muted-foreground mr-1">Speed:</span>
              {[1, 2, 4, 8].map((speed) => (
                <Button
                  key={speed}
                  variant={playbackSpeed === speed ? 'default' : 'ghost'}
                  size="xs"
                  onClick={() => setPlaybackSpeed(speed)}
                  className="size-7 p-0 text-xs font-mono"
                >
                  {speed}x
                </Button>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
