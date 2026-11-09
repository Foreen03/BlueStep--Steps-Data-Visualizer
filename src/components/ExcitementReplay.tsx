import React, { useState, useEffect, useRef } from "react"
import {
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  Film,
  Activity,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import type { SessionAnalysis } from "@/types/stepData"
import { EXCITEMENT_ZONES } from "@/types/stepData"
import { playStepSound, playOverdriveSound } from "@/lib/soundEffects"
import { GameFramePlayer } from "@/components/GameFramePlayer"

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
  const [replayMode, setReplayMode] = useState<"video" | "gauge">(
    session.hasVideo ||
      (session.frameRecords && session.frameRecords.length > 0)
      ? "video"
      : "gauge"
  )
  const [prevSessionId, setPrevSessionId] = useState(session.id)
  if (prevSessionId !== session.id) {
    setPrevSessionId(session.id)
    if (
      session.hasVideo ||
      (session.frameRecords && session.frameRecords.length > 0)
    ) {
      setReplayMode("video")
    }
  }

  const [isPlaying, setIsPlaying] = useState(false)
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1)
  const [soundEnabled, setSoundEnabled] = useState(false)
  const [comboStreak, setComboStreak] = useState(0)

  const currentMetric =
    session.secondsData[currentSecond] || session.secondsData[0]
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

    if (currentMetric.sps >= 3) {
      setComboStreak((prev) => prev + 1)
    } else {
      setComboStreak(0)
    }
  }, [currentSecond, currentMetric, soundEnabled])

  // Smooth animated cadence number state for silky transitions between seconds
  const [animatedSps, setAnimatedSps] = useState<number>(currentMetric.sps)

  useEffect(() => {
    const startVal = animatedSps
    const targetVal = currentMetric.sps
    if (Math.abs(startVal - targetVal) < 0.02) {
      setAnimatedSps(targetVal)
      return
    }

    const duration = 280
    let startTimestamp: number | null = null
    let frameId: number

    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp
      const elapsed = timestamp - startTimestamp
      const progress = Math.min(1, elapsed / duration)
      // Ease out cubic
      const ease = 1 - Math.pow(1 - progress, 3)
      setAnimatedSps(startVal + (targetVal - startVal) * ease)

      if (progress < 1) {
        frameId = requestAnimationFrame(step)
      } else {
        setAnimatedSps(targetVal)
      }
    }

    frameId = requestAnimationFrame(step)
    return () => cancelAnimationFrame(frameId)
  }, [currentMetric.sps])

  // Tachometer Geometry & Arc Calculations
  const maxDialSps = 5
  const currentRatio = Math.min(1, Math.max(0, currentMetric.sps / maxDialSps))
  const needleAngle = -120 + currentRatio * 240
  const arcLength240 = 343.5 // 2 * PI * 82 * (240 / 360) = 343.48

  // Helper: Polar to Cartesian (0 deg is top / 12 o'clock, clockwise)
  const polarToCartesian = (
    cx: number,
    cy: number,
    r: number,
    angleDeg: number
  ) => {
    const rad = ((angleDeg - 90) * Math.PI) / 180
    return {
      x: cx + r * Math.cos(rad),
      y: cy + r * Math.sin(rad),
    }
  }

  // Helper: Describe SVG Arc Path (clockwise from startAngle to endAngle)
  const describeArc = (
    cx: number,
    cy: number,
    r: number,
    startAngle: number,
    endAngle: number
  ) => {
    const start = polarToCartesian(cx, cy, r, startAngle)
    const end = polarToCartesian(cx, cy, r, endAngle)
    const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1"
    return [
      "M",
      start.x,
      start.y,
      "A",
      r,
      r,
      0,
      largeArcFlag,
      1,
      end.x,
      end.y,
    ].join(" ")
  }

  if (replayMode === "video") {
    return (
      <div className="space-y-4">
        {/* Replay Mode Switcher */}
        <div className="flex items-center justify-between">
          <div className="flex items-center rounded-md border border-border bg-muted/30 p-0.5 text-xs">
            <button
              onClick={() => setReplayMode("video")}
              className="flex items-center gap-1.5 rounded bg-card px-3 py-1 font-medium text-foreground shadow-xs transition-colors"
            >
              <Film className="size-3.5 text-accent" />
              <span>Game Frame & Video Sync</span>
            </button>
            <button
              onClick={() => setReplayMode("gauge")}
              className="flex items-center gap-1.5 rounded px-3 py-1 font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              <Activity className="size-3.5" />
              <span>Speedometer Simulator</span>
            </button>
          </div>
        </div>

        <GameFramePlayer
          session={session}
          highlightedSecond={currentSecond}
          onSelectSecond={onSecondChange}
        />
      </div>
    )
  }

  return (
    <div className="space-y-5 rounded-lg border border-border bg-card p-4 sm:p-6">
      {/* Card Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
        <div>
          <h3 className="text-base font-semibold text-foreground">
            Cadence replay simulator
          </h3>
          <p className="mt-0.5 text-[13px] text-muted-foreground">
            Realtime session playback with precision speedometer and footstep
            sensor tracking
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Mode Switcher */}
          <div className="flex items-center rounded-md border border-border bg-muted/30 p-0.5 text-xs">
            <button
              onClick={() => setReplayMode("video")}
              className="flex items-center gap-1.5 rounded px-2.5 py-1 font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              <Film className="size-3.5" />
              <span>Game Frames</span>
            </button>
            <button
              onClick={() => setReplayMode("gauge")}
              className="flex items-center gap-1.5 rounded bg-card px-2.5 py-1 font-medium text-foreground shadow-xs transition-colors"
            >
              <Activity className="size-3.5" />
              <span>Gauge</span>
            </button>
          </div>

          {/* Audio Toggle */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="h-8 gap-1.5 border-border text-[13px] text-muted-foreground hover:text-foreground"
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
      </div>

      {/* Main Simulator Grid */}
      <div className="grid grid-cols-1 items-center gap-6 md:grid-cols-12">
        {/* Speedometer Gauge Visualizer (5 cols) */}
        <div className="relative flex flex-col items-center justify-center md:col-span-5">
          <div className="relative flex h-[210px] w-full max-w-[280px] items-center justify-center">
            {/* Precision 240-degree Tachometer Gauge */}
            <svg className="size-full" viewBox="0 0 240 200">
              {/* Background Track Arc */}
              <path
                d={describeArc(120, 105, 82, -120, 120)}
                fill="none"
                stroke="currentColor"
                className="text-border"
                strokeWidth="8"
                strokeLinecap="round"
              />

              {/* Active Value Arc with Smooth CSS Dashoffset Transition */}
              <path
                d={describeArc(120, 105, 82, -120, 120)}
                fill="none"
                stroke={zone.color}
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={`${arcLength240} 515.2`}
                strokeDashoffset={arcLength240 * (1 - currentRatio)}
                style={{
                  transition:
                    "stroke-dashoffset 300ms cubic-bezier(0.25, 1, 0.5, 1), stroke 250ms ease",
                }}
              />

              {/* Major Ticks and Scale Numbers (0 to 5) */}
              {[0, 1, 2, 3, 4, 5].map((sps) => {
                const angle = -120 + (sps / 5) * 240
                const outer = polarToCartesian(120, 105, 82, angle)
                const inner = polarToCartesian(120, 105, 72, angle)
                const labelPt = polarToCartesian(120, 105, 58, angle)
                return (
                  <g key={sps}>
                    <line
                      x1={inner.x}
                      y1={inner.y}
                      x2={outer.x}
                      y2={outer.y}
                      stroke="currentColor"
                      className="text-muted-foreground/60"
                      strokeWidth="2"
                    />
                    <text
                      x={labelPt.x}
                      y={labelPt.y}
                      textAnchor="middle"
                      dominantBaseline="central"
                      className="fill-muted-foreground font-mono text-[11px] font-medium"
                    >
                      {sps}
                    </text>
                  </g>
                )
              })}

              {/* Minor Ticks (0.5 increments) */}
              {[0.5, 1.5, 2.5, 3.5, 4.5].map((sps) => {
                const angle = -120 + (sps / 5) * 240
                const outer = polarToCartesian(120, 105, 82, angle)
                const inner = polarToCartesian(120, 105, 76, angle)
                return (
                  <line
                    key={sps}
                    x1={inner.x}
                    y1={inner.y}
                    x2={outer.x}
                    y2={outer.y}
                    stroke="currentColor"
                    className="text-border"
                    strokeWidth="1.5"
                  />
                )
              })}

              {/* Smoothly Animated Needle Group */}
              <g
                style={{
                  transform: `rotate(${needleAngle}deg)`,
                  transformOrigin: "120px 105px",
                  transition: "transform 300ms cubic-bezier(0.25, 1, 0.5, 1)",
                }}
              >
                {/* Tapered Needle */}
                <polygon
                  points="120,31 124.5,105 120,117 115.5,105"
                  fill={zone.color}
                  style={{ transition: "fill 250ms ease" }}
                />

                {/* Center Pivot Pin */}
                <circle
                  cx="120"
                  cy="105"
                  r="8"
                  className="fill-foreground stroke-card stroke-2"
                />
                <circle
                  cx="120"
                  cy="105"
                  r="3"
                  fill={zone.color}
                  style={{ transition: "fill 250ms ease" }}
                />
              </g>
            </svg>

            {/* Smooth Digital Cadence Readout in Lower Open Chamber */}
            <div className="pointer-events-none absolute inset-x-0 bottom-1 flex flex-col items-center justify-center text-center">
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-semibold tracking-tight text-foreground tabular-nums sm:text-4xl">
                  {animatedSps < 0.05 ? "0" : animatedSps.toFixed(1)}
                </span>
                <span className="font-mono text-[13px] text-muted-foreground">
                  sps
                </span>
              </div>
              <div className="mt-0.5 font-mono text-[13px] text-muted-foreground tabular-nums">
                {Math.round(animatedSps * 60)} SPM • {currentMetric.steps} steps
              </div>
            </div>
          </div>

          {/* Status Label */}
          <div className="mt-3 flex items-center gap-2 rounded-full border border-border bg-muted/20 px-3 py-1 text-[13px]">
            <span
              className="size-2 rounded-full"
              style={{ backgroundColor: zone.color }}
            />
            <span className="font-medium text-foreground">{zone.name}</span>
            <span className="font-mono text-muted-foreground">
              ({zone.spsRange})
            </span>
            <span className="hidden text-muted-foreground sm:inline">
              • {zone.description}
            </span>
          </div>
        </div>

        {/* Footstep Telemetry Sensors (7 cols) */}
        <div className="flex flex-col gap-4 rounded-lg border border-border bg-muted/30 p-4 md:col-span-7">
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
              <span>
                Excitement score: {currentMetric.excitementScore} / 100
              </span>
              <span>
                Acceleration:{" "}
                {currentMetric.acceleration > 0
                  ? `+${currentMetric.acceleration}`
                  : currentMetric.acceleration}{" "}
                sps/s
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-border">
              <div
                className="h-full rounded-full bg-accent transition-all duration-200"
                style={{ width: `${currentMetric.excitementScore}%` }}
              />
            </div>
          </div>

          {/* Verified Realtime Cadence Dynamics (4 Tiles) */}
          <div className="pt-1">
            <div className="mb-2 text-[13px] font-normal text-muted-foreground">
              Second-by-second cadence telemetry
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {/* 1. Step Delta */}
              <div className="rounded-md border border-border bg-card p-3">
                <div className="text-[12px] text-muted-foreground">
                  Step delta
                </div>
                <div className="mt-1 flex items-baseline gap-1">
                  <span className="text-xl font-semibold text-foreground tabular-nums">
                    {currentMetric.sps}
                  </span>
                  <span className="text-[12px] text-muted-foreground">
                    steps
                  </span>
                </div>
                <div className="mt-0.5 font-mono text-[11px] text-muted-foreground">
                  In 1.0s window
                </div>
              </div>

              {/* 2. Acceleration */}
              <div className="rounded-md border border-border bg-card p-3">
                <div className="text-[12px] text-muted-foreground">
                  Acceleration
                </div>
                <div className="mt-1 flex items-baseline gap-1">
                  <span className="text-xl font-semibold text-foreground tabular-nums">
                    {currentMetric.acceleration > 0
                      ? `+${currentMetric.acceleration}`
                      : currentMetric.acceleration}
                  </span>
                  <span className="text-[12px] text-muted-foreground">
                    sps/s
                  </span>
                </div>
                <div className="mt-0.5 text-[11px] text-muted-foreground">
                  {currentMetric.acceleration > 0
                    ? "Pace surge"
                    : currentMetric.acceleration < 0
                      ? "Deceleration"
                      : "Steady pace"}
                </div>
              </div>

              {/* 3. 3s Moving Trend */}
              <div className="rounded-md border border-border bg-card p-3">
                <div className="text-[12px] text-muted-foreground">
                  3s trend
                </div>
                <div className="mt-1 flex items-baseline gap-1">
                  <span className="text-xl font-semibold text-foreground tabular-nums">
                    {currentMetric.rollingSps3s.toFixed(1)}
                  </span>
                  <span className="text-[12px] text-muted-foreground">sps</span>
                </div>
                <div className="mt-0.5 font-mono text-[11px] text-muted-foreground">
                  ~{Math.round(currentMetric.rollingSps3s * 60)} SPM
                </div>
              </div>

              {/* 4. Cumulative Steps */}
              <div className="rounded-md border border-border bg-card p-3">
                <div className="text-[12px] text-muted-foreground">
                  Total steps
                </div>
                <div className="mt-1 flex items-baseline gap-1">
                  <span className="text-xl font-semibold text-foreground tabular-nums">
                    {currentMetric.steps.toLocaleString()}
                  </span>
                  <span className="text-[12px] text-muted-foreground">
                    steps
                  </span>
                </div>
                <div className="mt-0.5 font-mono text-[11px] text-muted-foreground">
                  Sensor log total
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Scrubber & Controls */}
      <div className="space-y-3 rounded-md border border-border bg-muted/20 p-3.5">
        <div className="flex items-center justify-between font-mono text-xs tabular-nums">
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
              className="h-8 gap-1.5 bg-primary px-3.5 text-xs text-primary-foreground hover:bg-primary/90"
            >
              {isPlaying ? (
                <Pause className="size-3.5" />
              ) : (
                <Play className="size-3.5" />
              )}
              <span>{isPlaying ? "Pause" : "Play session"}</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setIsPlaying(false)
                onSecondChange(0)
              }}
              title="Restart from 00:00"
              className="h-8 gap-1.5 border-border px-2.5 text-xs"
            >
              <RotateCcw className="size-3.5" />
              <span>Restart</span>
            </Button>
          </div>

          {/* Speed selector */}
          <div className="flex items-center gap-1 text-xs">
            <span className="mr-1 text-muted-foreground">Speed:</span>
            {[1, 2, 4, 8].map((speed) => (
              <button
                key={speed}
                onClick={() => setPlaybackSpeed(speed)}
                className={`size-7 rounded-sm font-mono text-xs transition-colors ${
                  playbackSpeed === speed
                    ? "border border-border bg-muted font-semibold text-foreground"
                    : "text-muted-foreground hover:text-foreground"
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
