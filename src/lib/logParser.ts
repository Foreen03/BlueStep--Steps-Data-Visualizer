import type {
  RawStepRecord,
  SecondMetric,
  StepEvent,
  SessionAnalysis,
  ZoneSummary,
  ExcitementZoneId,
  GameFrameStepRecord,
} from "@/types/stepData"
import { EXCITEMENT_ZONES } from "@/types/stepData"

/**
 * Format seconds to MM:SS string
 */
export function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`
}

/**
 * Format milliseconds to MM:SS.mmm or HH:MM:SS.mmm
 */
export function formatVideoTime(ms: number): string {
  if (isNaN(ms) || ms < 0) ms = 0
  const totalSec = Math.floor(ms / 1000)
  const hours = Math.floor(totalSec / 3600)
  const mins = Math.floor((totalSec % 3600) / 60)
  const secs = totalSec % 60
  const remMs = Math.floor(ms % 1000)
  const msStr = remMs.toString().padStart(3, "0")

  if (hours > 0) {
    return `${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}.${msStr}`
  }
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}.${msStr}`
}

/**
 * Assign excitement zone based on SPS
 */
export function getExcitementZone(sps: number): ExcitementZoneId {
  if (sps <= 0.2) return "rest"
  if (sps <= 1.4) return "warmup"
  if (sps <= 2.4) return "active"
  if (sps <= 3.4) return "sprint"
  return "overdrive"
}

/**
 * Calculate dynamic excitement score (0 - 100)
 */
function calculateExcitementScore(
  sps: number,
  rollingSps: number,
  accel: number,
  comboStreak: number
): number {
  const cadenceScore = Math.min(100, (sps / 4) * 70)
  const sustainedScore = Math.min(100, (rollingSps / 4) * 15)
  const accelScore = accel > 0 ? Math.min(10, accel * 5) : 0
  const streakScore = Math.min(5, comboStreak * 1)

  return Math.min(
    100,
    Math.round(cadenceScore + sustainedScore + accelScore + streakScore)
  )
}

/**
 * Determines excitement tier based on session overall score
 */
function getExcitementTier(
  avgSps: number,
  maxSps: number,
  sprintRatio: number
) {
  const score = Math.round(
    Math.min(100, (avgSps / 3.5) * 45 + (maxSps / 5) * 35 + sprintRatio * 20)
  )

  if (score >= 80) {
    return {
      score,
      level: "S+",
      title: "Maximum Burst",
      color: "#c4242a",
      badge: "Frenzy Master",
      comment: "Peak cadence sustained across high-tempo gameplay segments.",
    }
  }
  if (score >= 65) {
    return {
      score,
      level: "A",
      title: "High Intensity",
      color: "#a86f0c",
      badge: "Sprint Specialist",
      comment:
        "Intense session with recurring sprint bursts and sustained engagement.",
    }
  }
  if (score >= 45) {
    return {
      score,
      level: "B",
      title: "Steady Rhythm",
      color: "#2f70bb",
      badge: "Rhythm Cruiser",
      comment: "Consistent aerobic cadence with balanced stamina pacing.",
    }
  }
  return {
    score,
    level: "C",
    title: "Casual Pacing",
    color: "#1b6c80",
    badge: "Light Pace",
    comment:
      "Relaxed pacing session, suitable for warmup or light exploration.",
  }
}

/**
 * Parse raw text into structured RawStepRecord array.
 * Supports:
 *  - PCServer recording _summary.json
 *  - PCServer recording _steps.txt (NDJSON with video_time_ms and video_time)
 *  - Subtitle .srt format with timestamps and step counts
 *  - Legacy JSON lines and CSV lines
 */
export function parseRawLog(rawText: string, fps = 30): RawStepRecord[] {
  const cleanText = rawText.replace(/^\uFEFF/, "").trim()
  const records: RawStepRecord[] = []

  // 1. Check if whole text is a PCServer summary JSON object
  if (cleanText.startsWith("{") && cleanText.endsWith("}")) {
    try {
      const obj = JSON.parse(cleanText)
      if (obj && Array.isArray(obj.records) && obj.records.length > 0) {
        for (const item of obj.records) {
          if (typeof item.steps === "number") {
            const timestamp =
              typeof item.timestamp === "number" ? item.timestamp : 0
            const videoTimeMs =
              item.videoTimeMs ??
              item.video_time_ms ??
              (obj.startTimeMs ? timestamp - obj.startTimeMs : undefined)
            const videoTime =
              item.videoTime ??
              item.video_time ??
              (videoTimeMs !== undefined
                ? formatVideoTime(videoTimeMs)
                : undefined)
            const frameNumber =
              videoTimeMs !== undefined
                ? Math.round((videoTimeMs / 1000) * fps)
                : undefined

            records.push({
              steps: Math.round(item.steps),
              timestamp,
              videoTimeMs,
              videoTime,
              frameNumber,
            })
          }
        }
        if (records.length > 0) {
          records.sort((a, b) => a.timestamp - b.timestamp)
          return records
        }
      }
    } catch {
      // Continue to line parsing
    }
  }

  // 2. Check if whole text is a JSON array
  if (cleanText.startsWith("[") && cleanText.endsWith("]")) {
    try {
      const arr = JSON.parse(cleanText)
      if (Array.isArray(arr)) {
        for (const item of arr) {
          if (typeof item.steps === "number") {
            const timestamp =
              typeof item.timestamp === "number" ? item.timestamp : 0
            const videoTimeMs =
              item.videoTimeMs ?? item.video_time_ms ?? undefined
            const videoTime =
              item.videoTime ??
              item.video_time ??
              (videoTimeMs !== undefined
                ? formatVideoTime(videoTimeMs)
                : undefined)
            const frameNumber =
              videoTimeMs !== undefined
                ? Math.round((videoTimeMs / 1000) * fps)
                : undefined

            records.push({
              steps: Math.round(item.steps),
              timestamp,
              videoTimeMs,
              videoTime,
              frameNumber,
            })
          }
        }
        if (records.length > 0) {
          records.sort((a, b) => a.timestamp - b.timestamp)
          return records
        }
      }
    } catch {
      // Continue to line parsing
    }
  }

  // 3. Line by line parsing
  const lines = cleanText.split(/\r?\n/)

  // 3a. Detect and parse SRT subtitle format
  const isSrt =
    lines.length > 2 &&
    lines.some((l) => l.includes("-->")) &&
    lines.some((l) => l.toLowerCase().includes("steps:"))

  if (isSrt) {
    let currentStartMs = 0
    let currentVideoTime = ""
    for (const line of lines) {
      const trimmed = line.trim()
      if (trimmed.includes("-->")) {
        const timePart = trimmed.split("-->")[0].trim()
        const match = timePart.match(/(\d{2}):(\d{2}):(\d{2})[,.](\d{3})/)
        if (match) {
          const hours = parseInt(match[1], 10)
          const mins = parseInt(match[2], 10)
          const secs = parseInt(match[3], 10)
          const ms = parseInt(match[4], 10)
          currentStartMs = (hours * 3600 + mins * 60 + secs) * 1000 + ms
          currentVideoTime = `${match[1]}:${match[2]}:${match[3]}.${match[4]}`
        }
      } else if (trimmed.toLowerCase().startsWith("steps:")) {
        const stepNum = parseInt(trimmed.replace(/^[Ss]teps:\s*/, ""), 10)
        if (!isNaN(stepNum)) {
          records.push({
            steps: stepNum,
            timestamp: currentStartMs,
            videoTimeMs: currentStartMs,
            videoTime: currentVideoTime || formatVideoTime(currentStartMs),
            frameNumber: Math.round((currentStartMs / 1000) * fps),
          })
        }
      }
    }
    if (records.length > 0) {
      records.sort((a, b) => (a.videoTimeMs ?? 0) - (b.videoTimeMs ?? 0))
      return records
    }
  }

  // 3b. Line by line JSON / CSV
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) continue

    if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
      try {
        const parsed = JSON.parse(trimmed)
        if (typeof parsed.steps === "number") {
          const timestamp =
            typeof parsed.timestamp === "number" ? parsed.timestamp : 0
          const videoTimeMs =
            parsed.video_time_ms ?? parsed.videoTimeMs ?? undefined
          const videoTime =
            parsed.video_time ??
            parsed.videoTime ??
            (videoTimeMs !== undefined
              ? formatVideoTime(videoTimeMs)
              : undefined)
          const frameNumber =
            videoTimeMs !== undefined
              ? Math.round((videoTimeMs / 1000) * fps)
              : undefined

          records.push({
            steps: Math.round(parsed.steps),
            timestamp,
            videoTimeMs,
            videoTime,
            frameNumber,
          })
        }
      } catch {
        // continue
      }
    } else if (trimmed.includes(",")) {
      const parts = trimmed.split(",").map((p) => p.trim())
      if (parts.length >= 2) {
        const num1 = Number(parts[0])
        const num2 = Number(parts[1])
        if (!isNaN(num1) && !isNaN(num2)) {
          if (num1 > 1e9) {
            records.push({ timestamp: num1, steps: num2 })
          } else if (num2 > 1e9) {
            records.push({ timestamp: num2, steps: num1 })
          }
        }
      }
    }
  }

  records.sort((a, b) => a.timestamp - b.timestamp)
  return records
}

export interface SessionAnalysisOptions {
  fps?: number
  videoUrl?: string
  videoFileName?: string
  startTimeMs?: number
  endTimeMs?: number
  durationMs?: number
  sessionId?: string
  startTimeUtc?: string
  endTimeUtc?: string
  initialSteps?: number
  finalSteps?: number
}

/**
 * Main analysis function converting raw log records into rich session telemetry
 */
export function analyzeStepSession(
  rawRecords: RawStepRecord[],
  title = "Game Session",
  fileName = "step_logs.txt",
  options?: SessionAnalysisOptions
): SessionAnalysis {
  if (rawRecords.length === 0) {
    throw new Error("No valid step records found in log.")
  }

  const fps = options?.fps ?? 30
  const hasVideoTimes = rawRecords.some((r) => r.videoTimeMs !== undefined)
  const initialSteps = options?.initialSteps ?? rawRecords[0].steps
  const finalSteps =
    options?.finalSteps ?? rawRecords[rawRecords.length - 1].steps
  const totalSteps = Math.max(0, finalSteps - initialSteps)

  // Determine timeline anchoring and duration
  const t0 = rawRecords[0].timestamp
  const tEnd = rawRecords[rawRecords.length - 1].timestamp

  let durationSec: number
  let videoBaseTimeMs: number

  if (options?.durationMs && options.durationMs > 0) {
    durationSec = options.durationMs / 1000
    videoBaseTimeMs =
      options.startTimeMs ?? t0 - (rawRecords[0].videoTimeMs ?? 0)
  } else if (hasVideoTimes) {
    const maxVideoMs = Math.max(...rawRecords.map((r) => r.videoTimeMs ?? 0))
    durationSec = Math.max(1, maxVideoMs / 1000)
    videoBaseTimeMs =
      options?.startTimeMs ?? t0 - (rawRecords[0].videoTimeMs ?? 0)
  } else {
    durationSec = Math.max(1, (tEnd - t0) / 1000)
    videoBaseTimeMs = t0
  }

  // Build step events & frame records
  const stepEvents: StepEvent[] = []
  const frameRecords: GameFrameStepRecord[] = []
  let previousStepVal = initialSteps
  let previousStepTime = hasVideoTimes ? videoBaseTimeMs : t0

  for (let i = 0; i < rawRecords.length; i++) {
    const record = rawRecords[i]
    if (record.steps > previousStepVal) {
      const deltaSteps = record.steps - previousStepVal
      const recordVideoMs =
        record.videoTimeMs ??
        (record.timestamp >= videoBaseTimeMs
          ? record.timestamp - videoBaseTimeMs
          : record.timestamp - t0)
      const deltaMs = Math.max(20, record.timestamp - previousStepTime)
      const instantaneousSps =
        Math.round(((deltaSteps * 1000) / deltaMs) * 10) / 10
      const frameNumber =
        record.frameNumber ??
        Math.max(0, Math.round((recordVideoMs / 1000) * fps))
      const videoTime = record.videoTime ?? formatVideoTime(recordVideoMs)

      const event: StepEvent = {
        stepNumber: record.steps,
        stepDelta: deltaSteps,
        timestamp: record.timestamp,
        elapsedMs: recordVideoMs,
        deltaMs,
        instantaneousSps,
        videoTimeMs: recordVideoMs,
        videoTime,
        frameNumber,
      }

      stepEvents.push(event)

      frameRecords.push({
        frameNumber,
        videoTimeMs: recordVideoMs,
        videoTime,
        stepNumber: record.steps,
        stepDelta: deltaSteps,
        cumulativeDelta: record.steps - initialSteps,
        deltaMs,
        instantaneousSps,
        zone: getExcitementZone(instantaneousSps),
      })

      previousStepVal = record.steps
      previousStepTime = record.timestamp
    }
  }

  const totalSeconds = Math.max(1, Math.ceil(durationSec))
  const secondsData: SecondMetric[] = []

  let prevWindowSteps = initialSteps
  let cursorIndex = 0
  let maxSps = 0
  let peakTimeSec = 0

  for (let s = 1; s <= totalSeconds; s++) {
    const secondStartMs = (s - 1) * 1000
    const secondEndMs = s * 1000

    let stepAtSecond = prevWindowSteps

    if (hasVideoTimes) {
      while (
        cursorIndex < rawRecords.length &&
        (rawRecords[cursorIndex].videoTimeMs ??
          rawRecords[cursorIndex].timestamp - videoBaseTimeMs) <= secondEndMs
      ) {
        stepAtSecond = rawRecords[cursorIndex].steps
        cursorIndex++
      }
    } else {
      const windowEndTimestamp = t0 + s * 1000
      while (
        cursorIndex < rawRecords.length &&
        rawRecords[cursorIndex].timestamp <= windowEndTimestamp
      ) {
        stepAtSecond = rawRecords[cursorIndex].steps
        cursorIndex++
      }
    }

    const sps = Math.max(0, stepAtSecond - prevWindowSteps)
    if (sps > maxSps) {
      maxSps = sps
      peakTimeSec = s - 1
    }

    const zoneId = getExcitementZone(sps)
    const zoneInfo = EXCITEMENT_ZONES[zoneId]

    secondsData.push({
      second: s - 1,
      timestamp: hasVideoTimes
        ? videoBaseTimeMs + secondStartMs
        : t0 + secondStartMs,
      timeFormatted: formatTime(s - 1),
      steps: stepAtSecond - initialSteps,
      rawSteps: stepAtSecond,
      sps,
      rollingSps3s: sps,
      rollingSps5s: sps,
      acceleration: 0,
      zone: zoneId,
      zoneName: zoneInfo.name,
      zoneColor: zoneInfo.color,
      excitementScore: 0,
      isPeak: false,
      videoTimeMs: secondStartMs,
      videoTime: formatTime(s - 1),
      frameStart: (s - 1) * fps,
      frameEnd: s * fps - 1,
    })

    prevWindowSteps = stepAtSecond
  }

  let longestSprintSec = 0
  let currentSprintStreak = 0
  let sprintBurstCount = 0
  let inBurst = false

  for (let i = 0; i < secondsData.length; i++) {
    const current = secondsData[i]
    const prev = i > 0 ? secondsData[i - 1] : null
    const next = i < secondsData.length - 1 ? secondsData[i + 1] : null

    const sps3 =
      ((prev ? prev.sps : current.sps) +
        current.sps +
        (next ? next.sps : current.sps)) /
      3
    current.rollingSps3s = Math.round(sps3 * 100) / 100

    let windowSum = 0
    let count = 0
    for (
      let w = Math.max(0, i - 2);
      w <= Math.min(secondsData.length - 1, i + 2);
      w++
    ) {
      windowSum += secondsData[w].sps
      count++
    }
    current.rollingSps5s = Math.round((windowSum / count) * 100) / 100

    current.acceleration = prev ? current.sps - prev.sps : 0

    if (current.sps === maxSps && maxSps > 0) {
      current.isPeak = true
    }

    if (current.sps >= 3) {
      currentSprintStreak++
      if (currentSprintStreak > longestSprintSec) {
        longestSprintSec = currentSprintStreak
      }
      if (!inBurst) {
        inBurst = true
        sprintBurstCount++
      }
    } else {
      currentSprintStreak = 0
      inBurst = false
    }

    current.excitementScore = calculateExcitementScore(
      current.sps,
      current.rollingSps3s,
      current.acceleration,
      currentSprintStreak
    )
  }

  const zoneCounts: Record<
    ExcitementZoneId,
    { seconds: number; steps: number }
  > = {
    rest: { seconds: 0, steps: 0 },
    warmup: { seconds: 0, steps: 0 },
    active: { seconds: 0, steps: 0 },
    sprint: { seconds: 0, steps: 0 },
    overdrive: { seconds: 0, steps: 0 },
  }

  for (const s of secondsData) {
    zoneCounts[s.zone].seconds++
    zoneCounts[s.zone].steps += s.sps
  }

  const zoneSummaries: ZoneSummary[] = (
    Object.keys(EXCITEMENT_ZONES) as ExcitementZoneId[]
  ).map((zoneId) => {
    const info = EXCITEMENT_ZONES[zoneId]
    const count = zoneCounts[zoneId]
    const percentage =
      secondsData.length > 0
        ? Math.round((count.seconds / secondsData.length) * 100)
        : 0

    return {
      zone: zoneId,
      name: info.name,
      color: info.color,
      seconds: count.seconds,
      percentage,
      stepCount: count.steps,
    }
  })

  const midPoint = Math.floor(secondsData.length / 2)
  const firstHalf = secondsData.slice(0, midPoint)
  const secondHalf = secondsData.slice(midPoint)

  const firstHalfAvgSps =
    firstHalf.length > 0
      ? firstHalf.reduce((acc, cur) => acc + cur.sps, 0) / firstHalf.length
      : 0
  const secondHalfAvgSps =
    secondHalf.length > 0
      ? secondHalf.reduce((acc, cur) => acc + cur.sps, 0) / secondHalf.length
      : 0

  let fatigueTrend: "increasing" | "steady" | "exhausted" = "steady"
  if (secondHalfAvgSps > firstHalfAvgSps * 1.15) {
    fatigueTrend = "increasing"
  } else if (secondHalfAvgSps < firstHalfAvgSps * 0.85) {
    fatigueTrend = "exhausted"
  }

  const avgSps =
    durationSec > 0 ? Math.round((totalSteps / durationSec) * 100) / 100 : 0
  const intensityMultiplier = 1 + (avgSps > 2.5 ? 0.3 : avgSps > 1.8 ? 0.15 : 0)
  const caloriesBurned =
    Math.round(totalSteps * 0.045 * intensityMultiplier * 10) / 10

  const highIntensitySeconds =
    zoneCounts.sprint.seconds + zoneCounts.overdrive.seconds
  const sprintRatio =
    secondsData.length > 0 ? highIntensitySeconds / secondsData.length : 0

  const excitementTier = getExcitementTier(avgSps, maxSps, sprintRatio)

  const hasVideo = !!(options?.videoUrl || options?.videoFileName)

  return {
    id: options?.sessionId ?? `session_${Date.now()}`,
    title,
    fileName,
    totalSteps,
    durationSec: Math.round(durationSec),
    durationFormatted: formatTime(durationSec),
    avgSps,
    maxSps,
    peakTimeSec,
    peakTimeFormatted: formatTime(peakTimeSec),
    caloriesBurned,
    overallExcitementScore: excitementTier.score,
    excitementTier,
    longestSprintSec,
    sprintBurstCount,
    firstHalfAvgSps: Math.round(firstHalfAvgSps * 100) / 100,
    secondHalfAvgSps: Math.round(secondHalfAvgSps * 100) / 100,
    fatigueTrend,
    zoneSummaries,
    secondsData,
    stepEvents,
    rawRecordCount: rawRecords.length,
    hasVideo,
    videoUrl: options?.videoUrl,
    videoFileName: options?.videoFileName,
    fps,
    sessionId: options?.sessionId,
    startTimeUtc: options?.startTimeUtc,
    endTimeUtc: options?.endTimeUtc,
    startTimeMs: options?.startTimeMs ?? videoBaseTimeMs,
    endTimeMs: options?.endTimeMs,
    initialSteps,
    finalSteps,
    rawRecords,
    frameRecords,
  }
}

export interface RecordingSummaryJson {
  sessionId?: string
  startTimeUtc?: string
  endTimeUtc?: string
  startTimeMs?: number
  endTimeMs?: number
  durationMs?: number
  duration?: string
  totalRecords?: number
  initialSteps?: number
  finalSteps?: number
  deltaSteps?: number
  videoFile?: string
  stepsFile?: string
  subtitleFile?: string
  records?: Array<{
    steps: number
    timestamp: number
    videoTimeMs?: number
    video_time_ms?: number
    videoTime?: string
    video_time?: string
  }>
}

/**
 * Helper to parse a PCServer summary.json file directly into SessionAnalysis
 */
export function parseRecordingSummaryFile(
  summaryJsonOrText: string | RecordingSummaryJson,
  videoUrl?: string,
  fps = 30
): SessionAnalysis {
  let summary: RecordingSummaryJson
  if (typeof summaryJsonOrText === "string") {
    const clean = summaryJsonOrText.replace(/^\uFEFF/, "").trim()
    summary = JSON.parse(clean) as RecordingSummaryJson
  } else {
    summary = summaryJsonOrText
  }

  const rawRecords = parseRawLog(JSON.stringify(summary), fps)
  const title = summary.sessionId
    ? `PCServer Recording (${summary.sessionId.replace(/^session_/, "")})`
    : "PCServer Recording Session"

  return analyzeStepSession(
    rawRecords,
    title,
    summary.stepsFile || "session_steps.txt",
    {
      fps,
      videoUrl:
        videoUrl ||
        (summary.videoFile
          ? `/api/recordings/${summary.sessionId}/video`
          : undefined),
      videoFileName: summary.videoFile,
      startTimeMs: summary.startTimeMs,
      endTimeMs: summary.endTimeMs,
      durationMs: summary.durationMs,
      sessionId: summary.sessionId,
      startTimeUtc: summary.startTimeUtc,
      endTimeUtc: summary.endTimeUtc,
      initialSteps: summary.initialSteps,
      finalSteps: summary.finalSteps,
    }
  )
}

/**
 * Binary search to query the step count, frame, and step trigger status for any given video playback time
 */
export function getStepAtVideoTime(
  session: SessionAnalysis,
  currentTimeSec: number
): {
  stepCount: number
  cumulativeDelta: number
  frameNumber: number
  isStepChange: boolean
  currentSps: number
  zone: ExcitementZoneId
  lastStepEvent?: StepEvent
  nextStepEvent?: StepEvent
} {
  const fps = session.fps || 30
  const currentMs = Math.max(0, currentTimeSec * 1000)
  const frameNumber = Math.max(0, Math.floor(currentTimeSec * fps))

  const initial = session.initialSteps ?? 0
  let stepCount = initial
  let lastStepEvent: StepEvent | undefined
  let nextStepEvent: StepEvent | undefined
  let isStepChange = false

  // Find step status from stepEvents
  for (let i = 0; i < session.stepEvents.length; i++) {
    const ev = session.stepEvents[i]
    const evTimeMs = ev.videoTimeMs ?? ev.elapsedMs ?? 0
    if (evTimeMs <= currentMs + 30) {
      stepCount = ev.stepNumber
      lastStepEvent = ev
      if (Math.abs(evTimeMs - currentMs) <= 75) {
        isStepChange = true
      }
    } else {
      if (!nextStepEvent) {
        nextStepEvent = ev
      }
    }
  }

  const secondIndex = Math.min(
    session.secondsData.length - 1,
    Math.max(0, Math.floor(currentTimeSec))
  )
  const metric = session.secondsData[secondIndex] || session.secondsData[0]

  return {
    stepCount,
    cumulativeDelta: stepCount - initial,
    frameNumber,
    isStepChange,
    currentSps: metric ? metric.sps : 0,
    zone: metric ? metric.zone : "rest",
    lastStepEvent,
    nextStepEvent,
  }
}
