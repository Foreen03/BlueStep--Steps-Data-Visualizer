import React, { useState, useEffect, useRef } from 'react'
import {
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
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

  // Playback Loop
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

  // Reaction to second step changes
  useEffect(() => {
    if (!currentMetric) return

    if (soundEnabled && currentMetric.sps > 0) {
      playStepSound(currentMetric.sps)
      if (currentMetric.sps >= 4) {
        playOverdriveSound()
      }
    }

    if (currentMetric.sps > 0) {
      setActiveFoot((prev) => (prev === 'left' ? 'right' : 'left'))
    } else {
      setActiveFoot(null)
    }

    if (currentMetric.sps >= 3) {
      setComboStreak((prev) => prev + 1)
    } else {
      setComboStreak(0)
    }
  }, [currentSecond, currentMetric, soundEnabled])

  // Tachometer Needle Angle Calculation (-120deg to +120deg)
  const maxDialSps = 5
  const currentRatio = Math.min(1, currentMetric.sps / maxDialSps)
  const needleAngle = -120 + currentRatio * 240

  return (
    <div className="rounded-lg border border-border bg-card p-4 sm:p-6 space-y-5">
      {/* Card Header */}
      <div className="flex items-center justify-between border-b border-border pb-3">
        <div>
          <h3 className="text-base font-semibold text-foreground">
            Cadence replay simulator
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Realtime session playback with cadence speedometer and footstep sensor tracking
          </p>
        </div>

        {/* Audio Toggle */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => setSoundEnabled(!soundEnabled)}
          className="h-7 gap-1.5 text-xs text-muted-foreground border-border hover:text-foreground"
          title="Toggle audio rhythm feedback"
        >
          {soundEnabled ? (
            <>
              <Volume2 className="size-3.5 text-accent" />
              <span>Audio on</span>
            </>
          ) : (
            <>
              <VolumeX className="size-3.5" />
              <span>Muted</span>
            </>
          )}
        </Button>
      </div>

      {/* Main Simulator Grid */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-12 items-center">
        {/* Tachometer Speedometer Gauge (5 cols) */}
        <div className="flex flex-col items-center justify-center md:col-span-5 relative">
          <div className="relative size-52 sm:size-60 flex items-center justify-center">
            {/* Tachometer SVG Dial */}
            <svg className="size-full -rotate-90" viewBox="0 0 200 200">
              {/* Background Track Arc */}
              <circle
                cx="100"
                cy="100"
                r="76"
                fill="none"
                stroke="currentColor"
                className="text-border"
                strokeWidth="10"
                strokeDasharray="360"
                strokeDashoffset="120"
                strokeLinecap="round"
              />

              {/* Active Value Arc */}
              <circle
                cx="100"
                cy="100"
                r="76"
                fill="none"
                stroke={zone.color}
                strokeWidth="10"
                strokeDasharray="360"
                strokeDashoffset={360 - currentRatio * 240}
                strokeLinecap="round"
                className="transition-all duration-200 ease-out"
              />
            </svg>

            {/* Precision Indicator Needle */}
            <div
              className="absolute size-full flex items-center justify-center transition-transform duration-200 ease-out pointer-events-none"
              style={{ transform: `rotate(${needleAngle}deg)` }}
            >
              <div className="relative h-26 w-0.5 flex flex-col items-center justify-start -translate-y-9">
                <div
                  className="w-1 h-14 rounded-full"
                  style={{ backgroundColor: zone.color }}
                />
                <div className="size-2.5 rounded-full bg-foreground border border-background" />
              </div>
            </div>

            {/* Center Readout */}
            <div className="absolute flex flex-col items-center justify-center text-center">
              <span className="text-[13px] text-muted-foreground font-normal">
                Current cadence
              </span>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="text-4xl sm:text-5xl font-semibold tabular-nums text-foreground">
                  {currentMetric.sps}
                </span>
                <span className="text-[13px] text-muted-foreground font-medium">sps</span>
              </div>
              <div className="mt-1 flex items-center gap-1.5 text-[13px] text-muted-foreground tabular-nums">
                <span>{Math.round(currentMetric.sps * 60)} SPM</span>
                <span>•</span>
                <span className="text-foreground">{currentMetric.steps} steps</span>
              </div>
            </div>
          </div>

          {/* Status Label */}
          <div className="mt-2 text-[13px] font-medium text-muted-foreground">
            Zone: <span style={{ color: zone.color }}>{zone.name}</span> — {zone.description}
          </div>
        </div>

        {/* Footstep Telemetry Sensors (7 cols) */}
        <div className="flex flex-col gap-4 md:col-span-7 rounded-lg border border-border bg-muted/30 p-4">
          <div className="flex items-center justify-between">
            <span className="text-[13px] font-medium text-foreground">
              Excitement dynamics
            </span>
            {comboStreak > 1 && (
              <span className="text-[13px] font-medium text-accent">
                Sprint burst streak: {comboStreak}s
              </span>
            )}
          </div>

          {/* Intensity Bar */}
          <div className="space-y-1">
            <div className="flex justify-between text-[13px] text-muted-foreground tabular-nums">
              <span>Excitement score: {currentMetric.excitementScore} / 100</span>
              <span>
                Acceleration: {currentMetric.acceleration > 0 ? `+${currentMetric.acceleration}` : currentMetric.acceleration} sps/s
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-border">
              <div
                className="h-full rounded-full transition-all duration-200 bg-accent"
                style={{ width: `${currentMetric.excitementScore}%` }}
              />
            </div>
          </div>

          {/* Footstep Stepping Sensor Pads */}
          <div className="pt-2">
            <div className="text-xs font-normal text-muted-foreground mb-2">
              Footstep sensor telemetry
            </div>
            <div className="grid grid-cols-2 gap-3">
              {/* Left Foot Sensor */}
              <div
                className={`flex flex-col items-center justify-center p-3.5 rounded-md border transition-colors ${
                  activeFoot === 'left'
                    ? 'border-accent bg-accent/10 text-accent font-medium'
                    : 'border-border bg-card text-muted-foreground'
                }`}
              >
                <span className="text-xs">Left foot sensor</span>
                <span className="text-xs font-medium mt-1">
                  {activeFoot === 'left' ? 'Active step' : 'Standby'}
                </span>
              </div>

              {/* Right Foot Sensor */}
              <div
                className={`flex flex-col items-center justify-center p-3.5 rounded-md border transition-colors ${
                  activeFoot === 'right'
                    ? 'border-accent bg-accent/10 text-accent font-medium'
                    : 'border-border bg-card text-muted-foreground'
                }`}
              >
                <span className="text-xs">Right foot sensor</span>
                <span className="text-xs font-medium mt-1">
                  {activeFoot === 'right' ? 'Active step' : 'Standby'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Scrubber & Controls */}
      <div className="space-y-3 rounded-md border border-border bg-muted/20 p-3.5">
        <div className="flex items-center justify-between text-xs font-mono tabular-nums">
          <span className="text-foreground">
            {currentMetric.timeFormatted} ({currentSecond}s)
          </span>
          <span className="text-muted-foreground">
            {session.durationFormatted} ({session.durationSec}s total)
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

        {/* Control Buttons */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <div className="flex items-center gap-2">
            <Button
              variant="default"
              size="sm"
              onClick={() => setIsPlaying(!isPlaying)}
              className="h-8 gap-1.5 px-3.5 text-xs bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {isPlaying ? <Pause className="size-3.5" /> : <Play className="size-3.5" />}
              <span>{isPlaying ? 'Pause' : 'Play session'}</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setIsPlaying(false)
                onSecondChange(0)
              }}
              title="Restart from 00:00"
              className="h-8 px-2.5 text-xs gap-1.5 border-border"
            >
              <RotateCcw className="size-3.5" />
              <span>Restart</span>
            </Button>
          </div>

          {/* Speed selector */}
          <div className="flex items-center gap-1 text-xs">
            <span className="text-muted-foreground mr-1">Speed:</span>
            {[1, 2, 4, 8].map((speed) => (
              <button
                key={speed}
                onClick={() => setPlaybackSpeed(speed)}
                className={`size-7 rounded-sm text-xs font-mono transition-colors ${
                  playbackSpeed === speed
                    ? 'bg-muted text-foreground font-semibold border border-border'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {speed}x
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
