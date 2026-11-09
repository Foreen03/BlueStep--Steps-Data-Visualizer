import React, { useState, useEffect, useRef, useMemo, useCallback } from "react"
import {
  Play,
  Pause,
  RotateCcw,
  SkipBack,
  SkipForward,
  StepBack,
  StepForward,
  Volume2,
  VolumeX,
  Video,
  Film,
  Search,
  AlertCircle,
  ExternalLink,
  Flame,
  Layers,
  Upload,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Slider } from "@/components/ui/slider"
import type { SessionAnalysis } from "@/types/stepData"
import { EXCITEMENT_ZONES } from "@/types/stepData"
import { formatVideoTime, getStepAtVideoTime } from "@/lib/logParser"
import { playStepSound, playOverdriveSound } from "@/lib/soundEffects"

interface GameFramePlayerProps {
  session: SessionAnalysis
  onSelectSecond?: (second: number) => void
  highlightedSecond?: number
  onAttachVideo?: (videoUrl: string, fileName?: string) => void
}

export const GameFramePlayer: React.FC<GameFramePlayerProps> = ({
  session,
  onSelectSecond,
  highlightedSecond = 0,
  onAttachVideo,
}) => {
  const fps = session.fps || 30
  const frameDurationSec = 1 / fps

  // Video State
  const videoRef = useRef<HTMLVideoElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(session.durationSec || 1)
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1)
  const [soundEnabled, setSoundEnabled] = useState(false)
  const [videoError, setVideoError] = useState<string | null>(null)
  const [localVideoUrl, setLocalVideoUrl] = useState<string | null>(
    session.videoUrl || null
  )
  const [videoAttachedName, setVideoAttachedName] = useState<string | null>(
    session.videoFileName || null
  )
  const [isDraggingVideo, setIsDraggingVideo] = useState(false)

  // Step Flash state (when a step occurs on the current frame)
  const [lastTriggeredStep, setLastTriggeredStep] = useState<number | null>(
    null
  )
  const [showStepFlash, setShowStepFlash] = useState(false)

  // Table Filters
  const [searchTerm, setSearchTerm] = useState("")
  const [zoneFilter, setZoneFilter] = useState<
    "all" | "sprint" | "active" | "warmup"
  >("all")

  // Synchronize localVideoUrl when session.videoUrl changes
  useEffect(() => {
    if (session.videoUrl) {
      setLocalVideoUrl(session.videoUrl)
    }
    if (session.videoFileName) {
      setVideoAttachedName(session.videoFileName)
    }
  }, [session.videoUrl, session.videoFileName])

  // Current frame calculated from currentTime
  const currentFrame = Math.max(0, Math.floor(currentTime * fps))
  const totalFrames = Math.max(1, Math.round(duration * fps))

  // Realtime step status lookup
  const stepStatus = useMemo(() => {
    return getStepAtVideoTime(session, currentTime)
  }, [session, currentTime])

  const zone = EXCITEMENT_ZONES[stepStatus.zone]

  // Handle step sound and flash animation
  useEffect(() => {
    if (stepStatus.lastStepEvent && stepStatus.isStepChange) {
      const stepNum = stepStatus.lastStepEvent.stepNumber
      if (stepNum !== lastTriggeredStep) {
        setLastTriggeredStep(stepNum)
        setShowStepFlash(true)

        if (soundEnabled) {
          playStepSound(stepStatus.currentSps)
          if (stepStatus.currentSps >= 4) {
            playOverdriveSound()
          }
        }

        const t = setTimeout(() => setShowStepFlash(false), 380)
        return () => clearTimeout(t)
      }
    }
  }, [stepStatus, lastTriggeredStep, soundEnabled])

  // Sync with highlightedSecond prop from parent (e.g. when user clicks on Cadence chart)
  useEffect(() => {
    if (
      highlightedSecond !== undefined &&
      highlightedSecond !== null &&
      !isPlaying
    ) {
      const targetTime = highlightedSecond
      if (Math.abs(currentTime - targetTime) > 0.5 && targetTime <= duration) {
        seekToTime(targetTime)
      }
    }
  }, [highlightedSecond])

  // Keep parent in sync with current second
  useEffect(() => {
    const sec = Math.floor(currentTime)
    if (onSelectSecond) {
      onSelectSecond(sec)
    }
  }, [Math.floor(currentTime), onSelectSecond])

  // Video Time Update Loop using requestAnimationFrame or requestVideoFrameCallback
  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    let animationFrameId: number

    const updateTime = () => {
      if (video && !video.paused) {
        setCurrentTime(video.currentTime)
        animationFrameId = requestAnimationFrame(updateTime)
      }
    }

    const onPlay = () => {
      setIsPlaying(true)
      animationFrameId = requestAnimationFrame(updateTime)
    }

    const onPause = () => {
      setIsPlaying(false)
      if (video) setCurrentTime(video.currentTime)
      cancelAnimationFrame(animationFrameId)
    }

    const onLoadedMetadata = () => {
      if (video.duration && !isNaN(video.duration)) {
        setDuration(video.duration)
      }
      setVideoError(null)
    }

    const onTimeUpdate = () => {
      setCurrentTime(video.currentTime)
    }

    const onError = () => {
      // If error loading /api/recordings/... or file
      if (video.error) {
        setVideoError(
          `Video playback error (code ${video.error.code}): ${video.error.message || "Format unsupported or file missing"}`
        )
      }
    }

    video.addEventListener("play", onPlay)
    video.addEventListener("pause", onPause)
    video.addEventListener("timeupdate", onTimeUpdate)
    video.addEventListener("loadedmetadata", onLoadedMetadata)
    video.addEventListener("error", onError)

    return () => {
      video.removeEventListener("play", onPlay)
      video.removeEventListener("pause", onPause)
      video.removeEventListener("timeupdate", onTimeUpdate)
      video.removeEventListener("loadedmetadata", onLoadedMetadata)
      video.removeEventListener("error", onError)
      cancelAnimationFrame(animationFrameId)
    }
  }, [localVideoUrl])

  // Seek helper
  const seekToTime = useCallback(
    (timeSec: number) => {
      const clamped = Math.max(0, Math.min(duration, timeSec))
      setCurrentTime(clamped)
      if (videoRef.current) {
        videoRef.current.currentTime = clamped
      }
    },
    [duration]
  )

  // Frame Stepping Controls
  const handleStepFrames = (frames: number) => {
    if (videoRef.current) {
      videoRef.current.pause()
    }
    setIsPlaying(false)
    seekToTime(currentTime + frames * frameDurationSec)
  }

  // Jump to Previous / Next Step Increment
  const handleJumpStep = (direction: "prev" | "next") => {
    if (videoRef.current) {
      videoRef.current.pause()
    }
    setIsPlaying(false)

    const currentMs = currentTime * 1000

    if (direction === "prev") {
      // Find the last step event before currentMs - 50ms
      const prevEvents = session.stepEvents.filter(
        (ev) => (ev.videoTimeMs ?? ev.elapsedMs) < currentMs - 50
      )
      if (prevEvents.length > 0) {
        const target = prevEvents[prevEvents.length - 1]
        const targetMs = target.videoTimeMs ?? target.elapsedMs
        seekToTime(targetMs / 1000)
      } else {
        seekToTime(0)
      }
    } else {
      // Find the first step event after currentMs + 50ms
      const nextEvent = session.stepEvents.find(
        (ev) => (ev.videoTimeMs ?? ev.elapsedMs) > currentMs + 50
      )
      if (nextEvent) {
        const nextMs = nextEvent.videoTimeMs ?? nextEvent.elapsedMs
        seekToTime(nextMs / 1000)
      }
    }
  }

  // Play / Pause Toggle
  const togglePlay = () => {
    const video = videoRef.current
    if (!video) {
      // Simulation mode without video
      setIsPlaying(!isPlaying)
      return
    }

    if (video.paused) {
      video.play().catch((err) => {
        console.warn("Playback error:", err)
      })
    } else {
      video.pause()
    }
  }

  // Playback Speed
  const handleSpeedChange = (speed: number) => {
    setPlaybackSpeed(speed)
    if (videoRef.current) {
      videoRef.current.playbackRate = speed
    }
  }

  // Handle Manual Video File Drop / Browse
  const handleVideoFileSelected = (file: File) => {
    try {
      const objectUrl = URL.createObjectURL(file)
      setLocalVideoUrl(objectUrl)
      setVideoAttachedName(file.name)
      setVideoError(null)
      if (onAttachVideo) {
        onAttachVideo(objectUrl, file.name)
      }
    } catch (err: unknown) {
      setVideoError(
        err instanceof Error ? err.message : "Failed to load video file."
      )
    }
  }

  // Fallback simulation timer when no video element is loaded but isPlaying is true
  useEffect(() => {
    if (!localVideoUrl && isPlaying) {
      const interval = 1000 / (fps * playbackSpeed)
      const t = window.setInterval(() => {
        setCurrentTime((prev) => {
          const next = prev + frameDurationSec
          if (next >= duration) {
            setIsPlaying(false)
            return 0
          }
          return next
        })
      }, interval)
      return () => clearInterval(t)
    }
  }, [localVideoUrl, isPlaying, fps, playbackSpeed, duration, frameDurationSec])

  // Filtered Game Frame Step Records for the Table
  const filteredFrameRecords = useMemo(() => {
    const records = session.frameRecords || []
    return records.filter((r) => {
      const matchesSearch =
        searchTerm === "" ||
        r.frameNumber.toString().includes(searchTerm) ||
        r.stepNumber.toString().includes(searchTerm) ||
        r.videoTime.includes(searchTerm)

      const matchesZone =
        zoneFilter === "all" ||
        (zoneFilter === "sprint" &&
          (r.zone === "sprint" || r.zone === "overdrive")) ||
        (zoneFilter === "active" && r.zone === "active") ||
        (zoneFilter === "warmup" && r.zone === "warmup")

      return matchesSearch && matchesZone
    })
  }, [session.frameRecords, searchTerm, zoneFilter])

  // Frame stats
  const totalFrameStepCount =
    session.frameRecords?.length || session.stepEvents.length || 0
  const avgFramesBetweenSteps =
    totalFrameStepCount > 1
      ? Math.round((totalFrames / totalFrameStepCount) * 10) / 10
      : 0

  return (
    <div className="space-y-6">
      {/* Top Banner: Video & Game Frame Controller */}
      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        {/* Header Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-muted/20 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-2.5">
            <div className="flex size-8 items-center justify-center rounded-lg bg-accent/10 text-accent">
              <Film className="size-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold tracking-tight text-foreground sm:text-base">
                  Game Frame & Step Synchronizer
                </h3>
                <Badge variant="outline" className="font-mono text-[11px]">
                  {fps} FPS Fixed
                </Badge>
                {localVideoUrl ? (
                  <Badge
                    variant="default"
                    className="bg-emerald-600/90 text-[11px] text-white"
                  >
                    Video Linked
                  </Badge>
                ) : (
                  <Badge
                    variant="secondary"
                    className="text-[11px] text-muted-foreground"
                  >
                    Telemetry Mode
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Inspect which game frame executed how many controller steps in
                real time
              </p>
            </div>
          </div>

          {/* Quick Actions (Audio & Video Source) */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="h-8 gap-1.5 border-border text-xs text-muted-foreground hover:text-foreground"
            >
              {soundEnabled ? (
                <>
                  <Volume2 className="size-3.5 text-accent" />
                  <span>Audio On</span>
                </>
              ) : (
                <>
                  <VolumeX className="size-3.5" />
                  <span>Audio Off</span>
                </>
              )}
            </Button>

            {/* Video File Selector */}
            <label className="cursor-pointer">
              <input
                type="file"
                accept="video/mp4,video/*"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleVideoFileSelected(e.target.files[0])
                  }
                }}
              />
              <Button
                variant="outline"
                size="sm"
                type="button"
                className="h-8 gap-1.5 border-border text-xs"
                onClick={(e) => {
                  const input = e.currentTarget.parentElement?.querySelector(
                    "input"
                  ) as HTMLInputElement
                  input?.click()
                }}
              >
                <Video className="size-3.5 text-accent" />
                <span>{videoAttachedName ? "Change Video" : "Attach MP4"}</span>
              </Button>
            </label>
          </div>
        </div>

        {/* Video Player Display Area with Live HUD */}
        <div className="space-y-4 p-4 sm:p-6">
          <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
            {/* Left 8 Cols: Video Screen with HUD Overlay */}
            <div className="flex flex-col space-y-3 lg:col-span-8">
              <div
                className={`relative flex aspect-video w-full items-center justify-center overflow-hidden rounded-xl border bg-black shadow-inner ${
                  isDraggingVideo
                    ? "border-primary ring-2 ring-primary/30"
                    : "border-border"
                }`}
                onDragOver={(e) => {
                  e.preventDefault()
                  setIsDraggingVideo(true)
                }}
                onDragLeave={() => setIsDraggingVideo(false)}
                onDrop={(e) => {
                  e.preventDefault()
                  setIsDraggingVideo(false)
                  if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                    handleVideoFileSelected(e.dataTransfer.files[0])
                  }
                }}
              >
                {localVideoUrl ? (
                  <video
                    ref={videoRef}
                    src={localVideoUrl}
                    className="size-full object-contain"
                    playsInline
                    preload="auto"
                    onClick={togglePlay}
                  />
                ) : (
                  /* Empty state / drop zone when video not yet attached */
                  <div className="flex flex-col items-center justify-center space-y-3 p-8 text-center text-white/80">
                    <div className="rounded-full bg-white/10 p-4">
                      <Video className="size-8 text-accent" />
                    </div>
                    <div className="max-w-md space-y-1">
                      <h4 className="text-sm font-semibold text-white">
                        Recording Video Screen
                      </h4>
                      <p className="text-xs text-white/60">
                        {videoAttachedName
                          ? `Attempting to stream ${videoAttachedName}`
                          : "Connect session_20261109_142244.mp4 from C:\\Program Files (x86)\\PCServer_YHY\\recordings"}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        className="h-8 gap-1.5 text-xs"
                        onClick={() => {
                          const url = `/api/recordings/${session.sessionId || "session_20261109_142244"}/video`
                          setLocalVideoUrl(url)
                          setVideoAttachedName(
                            `${session.sessionId || "session_20261109_142244"}.mp4`
                          )
                        }}
                      >
                        <ExternalLink className="size-3" />
                        Stream from PCServer folder
                      </Button>

                      <label className="cursor-pointer">
                        <input
                          type="file"
                          accept="video/mp4,video/*"
                          className="hidden"
                          onChange={(e) => {
                            if (e.target.files && e.target.files[0]) {
                              handleVideoFileSelected(e.target.files[0])
                            }
                          }}
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          type="button"
                          className="h-8 gap-1.5 border-white/20 text-xs text-white hover:bg-white/10"
                          onClick={(e) => {
                            const input =
                              e.currentTarget.parentElement?.querySelector(
                                "input"
                              ) as HTMLInputElement
                            input?.click()
                          }}
                        >
                          <Upload className="size-3" />
                          Browse Local MP4
                        </Button>
                      </label>
                    </div>
                  </div>
                )}

                {/* Real-time Telemetry HUD Overlay (Top-Left) */}
                <div className="pointer-events-none absolute top-3 left-3 z-10 flex flex-col gap-1.5">
                  {/* Game Frame Pill */}
                  <div className="flex items-center gap-2 rounded-md border border-white/10 bg-black/75 px-2.5 py-1 text-white shadow-lg backdrop-blur-md">
                    <span className="size-2 animate-pulse rounded-full bg-accent" />
                    <span className="font-mono text-xs font-semibold tracking-wide uppercase">
                      FRAME #{currentFrame.toLocaleString()}
                    </span>
                    <span className="font-mono text-[11px] text-white/60">
                      / {totalFrames.toLocaleString()}
                    </span>
                  </div>

                  {/* Video Timestamp Pill */}
                  <div className="flex items-center gap-1.5 rounded-md border border-white/10 bg-black/60 px-2.5 py-0.5 font-mono text-xs text-white/90 tabular-nums backdrop-blur-md">
                    <span>{formatVideoTime(currentTime * 1000)}</span>
                    <span className="text-white/40">|</span>
                    <span className="text-white/60">
                      {formatVideoTime(duration * 1000)}
                    </span>
                  </div>
                </div>

                {/* Real-time Telemetry HUD Overlay (Top-Right) */}
                <div className="pointer-events-none absolute top-3 right-3 z-10 flex flex-col items-end gap-1.5">
                  {/* Current Steps Count Badge */}
                  <div className="flex items-center gap-2 rounded-md border border-white/10 bg-black/75 px-3 py-1 text-white shadow-lg backdrop-blur-md">
                    <span className="text-xs text-white/70">Steps:</span>
                    <span className="font-mono text-base font-bold text-foreground tabular-nums dark:text-white">
                      {stepStatus.stepCount}
                    </span>
                    <span className="py-0.2 rounded bg-accent/20 px-1 font-mono text-[10px] text-accent">
                      +{stepStatus.cumulativeDelta}
                    </span>
                  </div>

                  {/* Instantaneous Cadence Rate & Zone */}
                  <div className="flex items-center gap-1.5 rounded-md border border-white/10 bg-black/60 px-2.5 py-0.5 text-xs backdrop-blur-md">
                    <span
                      className="size-2 rounded-full"
                      style={{ backgroundColor: zone.color }}
                    />
                    <span className="font-medium text-white">{zone.name}</span>
                    <span className="font-mono text-white/80 tabular-nums">
                      {stepStatus.currentSps} sps
                    </span>
                  </div>
                </div>

                {/* Step Event Trigger Flash Banner (Centered when a step occurs) */}
                {showStepFlash && (
                  <div className="pointer-events-none absolute inset-x-0 bottom-4 z-20 flex animate-in justify-center duration-150 zoom-in-95 fade-in">
                    <div className="flex items-center gap-2 rounded-full border border-emerald-400 bg-emerald-500/90 px-4 py-1 text-white shadow-xl backdrop-blur-md">
                      <Flame className="size-4 animate-bounce" />
                      <span className="text-xs font-semibold tracking-wide uppercase">
                        Step #{stepStatus.stepCount} Triggered!
                      </span>
                      <span className="font-mono text-[11px] opacity-90">
                        (Frame {currentFrame})
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {videoError && (
                <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-2.5 text-xs text-destructive">
                  <AlertCircle className="size-4 shrink-0" />
                  <span>{videoError}</span>
                </div>
              )}

              {/* Synchronized Scrubber Timeline Bar */}
              <div className="space-y-1.5 rounded-lg border border-border bg-muted/20 p-3">
                <div className="flex items-center justify-between font-mono text-xs text-muted-foreground tabular-nums">
                  <span className="font-medium text-foreground">
                    Frame {currentFrame} ({formatVideoTime(currentTime * 1000)})
                  </span>
                  <span>
                    Frame {totalFrames} ({formatVideoTime(duration * 1000)})
                  </span>
                </div>

                {/* Scrubber slider */}
                <Slider
                  value={[currentTime]}
                  min={0}
                  max={duration || 1}
                  step={frameDurationSec}
                  onValueChange={([val]) => seekToTime(val)}
                  className="cursor-pointer"
                />

                {/* Playback Controls & Frame Navigation Buttons */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                  <div className="flex items-center gap-1.5">
                    {/* Previous Step Jump */}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleJumpStep("prev")}
                      title="Jump to previous step frame"
                      className="h-8 gap-1 border-border px-2 text-xs"
                    >
                      <SkipBack className="size-3.5" />
                      <span className="hidden sm:inline">Prev Step</span>
                    </Button>

                    {/* Step -1 Frame */}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleStepFrames(-1)}
                      title="Step back 1 frame (33ms)"
                      className="h-8 gap-1 border-border px-2 text-xs"
                    >
                      <StepBack className="size-3.5" />
                      <span>-1 Frame</span>
                    </Button>

                    {/* Play / Pause */}
                    <Button
                      variant="default"
                      size="sm"
                      onClick={togglePlay}
                      className="h-8 gap-1.5 bg-primary px-3.5 text-xs font-medium text-primary-foreground hover:bg-primary/90"
                    >
                      {isPlaying ? (
                        <Pause className="size-3.5" />
                      ) : (
                        <Play className="size-3.5" />
                      )}
                      <span>{isPlaying ? "Pause" : "Play"}</span>
                    </Button>

                    {/* Step +1 Frame */}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleStepFrames(1)}
                      title="Step forward 1 frame (33ms)"
                      className="h-8 gap-1 border-border px-2 text-xs"
                    >
                      <span>+1 Frame</span>
                      <StepForward className="size-3.5" />
                    </Button>

                    {/* Next Step Jump */}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleJumpStep("next")}
                      title="Jump to next step frame"
                      className="h-8 gap-1 border-border px-2 text-xs"
                    >
                      <span className="hidden sm:inline">Next Step</span>
                      <SkipForward className="size-3.5" />
                    </Button>

                    {/* Restart */}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => seekToTime(0)}
                      title="Restart from start"
                      className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground"
                    >
                      <RotateCcw className="size-3.5" />
                    </Button>
                  </div>

                  {/* Playback speed selector */}
                  <div className="flex items-center gap-1 text-xs">
                    <span className="mr-1 text-muted-foreground">Speed:</span>
                    {[0.25, 0.5, 1, 2].map((speed) => (
                      <button
                        key={speed}
                        onClick={() => handleSpeedChange(speed)}
                        className={`rounded-sm px-2 py-0.5 font-mono text-xs transition-colors ${
                          playbackSpeed === speed
                            ? "bg-primary font-semibold text-primary-foreground shadow-xs"
                            : "text-muted-foreground hover:bg-muted hover:text-foreground"
                        }`}
                      >
                        {speed}x
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Right 4 Cols: Live Telemetry Gauges & Frame State */}
            <div className="flex flex-col space-y-4 lg:col-span-4">
              {/* Frame Telemetry Focus Card */}
              <div className="space-y-3 rounded-xl border border-border bg-muted/20 p-4">
                <div className="flex items-center justify-between border-b border-border pb-2">
                  <span className="text-xs font-semibold tracking-wider text-foreground uppercase">
                    Current Game Frame
                  </span>
                  <Badge variant="outline" className="font-mono text-[11px]">
                    Frame #{currentFrame}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded-md border border-border bg-card p-2.5">
                    <div className="text-[11px] text-muted-foreground">
                      Video Time
                    </div>
                    <div className="mt-0.5 font-mono text-sm font-semibold text-foreground tabular-nums">
                      {formatVideoTime(currentTime * 1000)}
                    </div>
                  </div>

                  <div className="rounded-md border border-border bg-card p-2.5">
                    <div className="text-[11px] text-muted-foreground">
                      Controller Steps
                    </div>
                    <div className="mt-0.5 font-mono text-sm font-semibold text-foreground tabular-nums">
                      {stepStatus.stepCount} steps
                    </div>
                  </div>

                  <div className="rounded-md border border-border bg-card p-2.5">
                    <div className="text-[11px] text-muted-foreground">
                      Cadence Rate
                    </div>
                    <div className="mt-0.5 font-mono text-sm font-semibold text-foreground tabular-nums">
                      {stepStatus.currentSps} SPS
                    </div>
                  </div>

                  <div className="rounded-md border border-border bg-card p-2.5">
                    <div className="text-[11px] text-muted-foreground">
                      Excitement Zone
                    </div>
                    <div
                      className="mt-1 flex items-center gap-1.5 text-xs font-medium"
                      style={{ color: zone.color }}
                    >
                      <span
                        className="size-2 rounded-full"
                        style={{ backgroundColor: zone.color }}
                      />
                      <span>{zone.name}</span>
                    </div>
                  </div>
                </div>

                {/* Proximity to Next / Prev Step */}
                <div className="space-y-1.5 border-t border-border pt-1 font-mono text-[11px] text-muted-foreground">
                  <div className="flex justify-between">
                    <span>Last Step:</span>
                    <span className="text-foreground">
                      {stepStatus.lastStepEvent
                        ? `Step #${stepStatus.lastStepEvent.stepNumber} @ Frame ${stepStatus.lastStepEvent.frameNumber}`
                        : "None yet"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Next Step:</span>
                    <span className="text-foreground">
                      {stepStatus.nextStepEvent
                        ? `Step #${stepStatus.nextStepEvent.stepNumber} @ Frame ${stepStatus.nextStepEvent.frameNumber}`
                        : "Session ended"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Session Frame Statistics Card */}
              <div className="space-y-3 rounded-xl border border-border bg-card p-4">
                <span className="text-xs font-semibold tracking-wider text-foreground uppercase">
                  Session Frame Summary
                </span>

                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">
                      Total Game Frames:
                    </span>
                    <span className="font-mono font-medium text-foreground">
                      {totalFrames.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">
                      Frames with Step Change:
                    </span>
                    <span className="font-mono font-semibold text-accent">
                      {totalFrameStepCount.toLocaleString()} frames
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">
                      Step Frequency:
                    </span>
                    <span className="font-mono text-foreground">
                      1 step every ~{avgFramesBetweenSteps} frames
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">
                      Average Cadence:
                    </span>
                    <span className="font-mono text-foreground">
                      {session.avgSps} SPS (~{Math.round(session.avgSps * 60)}{" "}
                      SPM)
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">
                      Peak Burst Cadence:
                    </span>
                    <span className="font-mono font-semibold text-destructive">
                      {session.maxSps} SPS at {session.peakTimeFormatted}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Table: Which Game Frame Ran How Many Steps */}
      <div className="space-y-4 overflow-hidden rounded-xl border border-border bg-card p-4 shadow-sm sm:p-6">
        <div className="flex flex-col gap-3 border-b border-border pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Layers className="size-4 text-accent" />
              <h3 className="text-base font-semibold text-foreground">
                Game Frame Step Inspector
              </h3>
              <Badge variant="secondary" className="font-mono text-xs">
                {filteredFrameRecords.length} Events
              </Badge>
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Exact correlation showing which video frame triggered controller
              step increases
            </p>
          </div>

          {/* Search & Filters */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search frame or step #..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-8 w-44 rounded-md border border-border bg-background pr-3 pl-8 text-xs outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              />
            </div>

            <div className="flex items-center rounded-md border border-border bg-muted/40 p-0.5 text-xs">
              <button
                onClick={() => setZoneFilter("all")}
                className={`rounded px-2.5 py-1 transition-colors ${
                  zoneFilter === "all"
                    ? "bg-card font-medium text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                All
              </button>
              <button
                onClick={() => setZoneFilter("sprint")}
                className={`rounded px-2.5 py-1 transition-colors ${
                  zoneFilter === "sprint"
                    ? "bg-card font-medium text-destructive shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Bursts (3+ SPS)
              </button>
              <button
                onClick={() => setZoneFilter("active")}
                className={`rounded px-2.5 py-1 transition-colors ${
                  zoneFilter === "active"
                    ? "bg-card font-medium text-accent shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Active
              </button>
              <button
                onClick={() => setZoneFilter("warmup")}
                className={`rounded px-2.5 py-1 transition-colors ${
                  zoneFilter === "warmup"
                    ? "bg-card font-medium text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Warmup
              </button>
            </div>
          </div>
        </div>

        {/* Frame Table */}
        <div className="max-h-[460px] overflow-x-auto rounded-lg border border-border">
          <table className="w-full border-collapse text-left font-mono text-xs">
            <thead className="sticky top-0 z-10 border-b border-border bg-muted/90 font-sans text-muted-foreground backdrop-blur-xs">
              <tr>
                <th className="px-3.5 py-2.5 font-medium">Game Frame</th>
                <th className="px-3.5 py-2.5 font-medium">Video Time</th>
                <th className="px-3.5 py-2.5 font-medium">Step #</th>
                <th className="px-3.5 py-2.5 font-medium">Frame Delta</th>
                <th className="px-3.5 py-2.5 font-medium">Interval (ms)</th>
                <th className="px-3.5 py-2.5 font-medium">
                  Instantaneous Cadence
                </th>
                <th className="px-3.5 py-2.5 font-medium">Zone</th>
                <th className="px-3.5 py-2.5 text-right font-medium">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {filteredFrameRecords.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="py-8 text-center font-sans text-xs text-muted-foreground"
                  >
                    No step frame records match the search or filter criteria.
                  </td>
                </tr>
              ) : (
                filteredFrameRecords.map((rec) => {
                  const isCurrent =
                    Math.abs(rec.frameNumber - currentFrame) <= 1
                  const z = EXCITEMENT_ZONES[rec.zone]

                  return (
                    <tr
                      key={`${rec.frameNumber}-${rec.stepNumber}`}
                      onClick={() => {
                        seekToTime(rec.videoTimeMs / 1000)
                      }}
                      className={`cursor-pointer transition-colors ${
                        isCurrent
                          ? "bg-accent/15 font-semibold text-accent"
                          : "text-foreground hover:bg-muted/30"
                      }`}
                    >
                      {/* Game Frame Number */}
                      <td className="px-3.5 py-2 font-bold">
                        <span className="flex items-center gap-1.5">
                          {isCurrent && (
                            <span className="size-1.5 animate-ping rounded-full bg-accent" />
                          )}
                          Frame #{rec.frameNumber}
                        </span>
                      </td>

                      {/* Video Time */}
                      <td className="px-3.5 py-2 text-muted-foreground tabular-nums">
                        {rec.videoTime}
                      </td>

                      {/* Absolute Controller Step Count */}
                      <td className="px-3.5 py-2 font-semibold">
                        Step #{rec.stepNumber}
                      </td>

                      {/* Step Delta on this frame */}
                      <td className="px-3.5 py-2">
                        <span className="rounded bg-emerald-500/10 px-1.5 py-0.5 font-medium text-emerald-600 dark:text-emerald-400">
                          +{rec.stepDelta} step{rec.stepDelta > 1 ? "s" : ""}
                        </span>
                      </td>

                      {/* Delta time from previous step */}
                      <td className="px-3.5 py-2 text-muted-foreground tabular-nums">
                        {rec.deltaMs} ms
                      </td>

                      {/* Instantaneous SPS */}
                      <td className="px-3.5 py-2 font-medium tabular-nums">
                        {rec.instantaneousSps} SPS (~
                        {Math.round(rec.instantaneousSps * 60)} SPM)
                      </td>

                      {/* Zone */}
                      <td className="px-3.5 py-2">
                        <span
                          className="inline-flex items-center gap-1 font-sans text-[11px] font-medium"
                          style={{ color: z.color }}
                        >
                          <span
                            className="size-1.5 rounded-full"
                            style={{ backgroundColor: z.color }}
                          />
                          {z.name}
                        </span>
                      </td>

                      {/* Jump to Frame Button */}
                      <td className="px-3.5 py-2 text-right font-sans">
                        <Button
                          variant="ghost"
                          size="xs"
                          onClick={(e) => {
                            e.stopPropagation()
                            seekToTime(rec.videoTimeMs / 1000)
                          }}
                          className="h-6 gap-1 text-[11px] hover:text-accent"
                        >
                          <Play className="size-2.5" />
                          <span>Jump</span>
                        </Button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
