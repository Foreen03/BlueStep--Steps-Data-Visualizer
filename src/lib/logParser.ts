import type {
  RawStepRecord,
  SecondMetric,
  StepEvent,
  SessionAnalysis,
  ZoneSummary,
  ExcitementZoneId,
} from '@/types/stepData'
import { EXCITEMENT_ZONES } from '@/types/stepData'

/**
 * Format seconds to MM:SS string
 */
export function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}

/**
 * Assign excitement zone based on SPS
 */
export function getExcitementZone(sps: number): ExcitementZoneId {
  if (sps <= 0.2) return 'rest'
  if (sps <= 1.4) return 'warmup'
  if (sps <= 2.4) return 'active'
  if (sps <= 3.4) return 'sprint'
  return 'overdrive'
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

  return Math.min(100, Math.round(cadenceScore + sustainedScore + accelScore + streakScore))
}

/**
 * Determines excitement tier based on session overall score
 */
function getExcitementTier(avgSps: number, maxSps: number, sprintRatio: number) {
  const score = Math.round(
    Math.min(100, (avgSps / 3.5) * 45 + (maxSps / 5) * 35 + sprintRatio * 20)
  )

  if (score >= 80) {
    return {
      score,
      level: 'S+',
      title: 'Maximum Burst',
      color: '#c4242a',
      badge: 'Frenzy Master',
      comment: 'Peak cadence sustained across high-tempo gameplay segments.',
    }
  }
  if (score >= 65) {
    return {
      score,
      level: 'A',
      title: 'High Intensity',
      color: '#a86f0c',
      badge: 'Sprint Specialist',
      comment: 'Intense session with recurring sprint bursts and sustained engagement.',
    }
  }
  if (score >= 45) {
    return {
      score,
      level: 'B',
      title: 'Steady Rhythm',
      color: '#2f70bb',
      badge: 'Rhythm Cruiser',
      comment: 'Consistent aerobic cadence with balanced stamina pacing.',
    }
  }
  return {
    score,
    level: 'C',
    title: 'Casual Pacing',
    color: '#1b6c80',
    badge: 'Light Pace',
    comment: 'Relaxed pacing session, suitable for warmup or light exploration.',
  }
}

/**
 * Parse raw text into structured RawStepRecord array
 */
export function parseRawLog(rawText: string): RawStepRecord[] {
  const records: RawStepRecord[] = []
  const lines = rawText.split(/\r?\n/)

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) continue

    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      try {
        const parsed = JSON.parse(trimmed)
        if (typeof parsed.steps === 'number' && typeof parsed.timestamp === 'number') {
          records.push({ steps: Math.round(parsed.steps), timestamp: parsed.timestamp })
        }
      } catch {
        // continue
      }
    } else if (trimmed.includes(',')) {
      const parts = trimmed.split(',').map((p) => p.trim())
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

  if (records.length === 0 && rawText.trim().startsWith('[') && rawText.trim().endsWith(']')) {
    try {
      const arr = JSON.parse(rawText)
      if (Array.isArray(arr)) {
        for (const item of arr) {
          if (typeof item.steps === 'number' && typeof item.timestamp === 'number') {
            records.push({ steps: Math.round(item.steps), timestamp: item.timestamp })
          }
        }
      }
    } catch {
      // ignore
    }
  }

  records.sort((a, b) => a.timestamp - b.timestamp)

  return records
}

/**
 * Main analysis function converting raw log records into rich session telemetry
 */
export function analyzeStepSession(
  rawRecords: RawStepRecord[],
  title = 'Game Session',
  fileName = 'step_logs.txt'
): SessionAnalysis {
  if (rawRecords.length === 0) {
    throw new Error('No valid step records found in log.')
  }

  const t0 = rawRecords[0].timestamp
  const tEnd = rawRecords[rawRecords.length - 1].timestamp
  const durationSec = Math.max(1, (tEnd - t0) / 1000)
  const initialSteps = rawRecords[0].steps
  const finalSteps = rawRecords[rawRecords.length - 1].steps
  const totalSteps = Math.max(0, finalSteps - initialSteps)

  const stepEvents: StepEvent[] = []
  let previousStepVal = initialSteps
  let previousStepTime = t0

  for (let i = 0; i < rawRecords.length; i++) {
    const record = rawRecords[i]
    if (record.steps > previousStepVal) {
      const deltaSteps = record.steps - previousStepVal
      const deltaMs = Math.max(50, record.timestamp - previousStepTime)
      const instantaneousSps = Math.round(((deltaSteps * 1000) / deltaMs) * 10) / 10

      stepEvents.push({
        stepNumber: record.steps,
        timestamp: record.timestamp,
        elapsedMs: record.timestamp - t0,
        deltaMs,
        instantaneousSps,
      })

      previousStepVal = record.steps
      previousStepTime = record.timestamp
    }
  }

  const totalSeconds = Math.ceil(durationSec)
  const secondsData: SecondMetric[] = []

  let prevWindowSteps = initialSteps
  let cursorIndex = 0
  let maxSps = 0
  let peakTimeSec = 0
  let comboStreak = 0

  for (let s = 1; s <= totalSeconds; s++) {
    const windowEndTimestamp = t0 + s * 1000

    let stepAtSecond = prevWindowSteps
    while (cursorIndex < rawRecords.length && rawRecords[cursorIndex].timestamp <= windowEndTimestamp) {
      stepAtSecond = rawRecords[cursorIndex].steps
      cursorIndex++
    }

    const sps = Math.max(0, stepAtSecond - prevWindowSteps)
    if (sps > maxSps) {
      maxSps = sps
      peakTimeSec = s - 1
    }

    if (sps >= 3) {
      comboStreak++
    } else {
      comboStreak = 0
    }

    const zoneId = getExcitementZone(sps)
    const zoneInfo = EXCITEMENT_ZONES[zoneId]

    secondsData.push({
      second: s - 1,
      timestamp: windowEndTimestamp - 1000,
      timeFormatted: formatTime(s - 1),
      steps: stepAtSecond - initialSteps,
      sps,
      rollingSps3s: sps,
      rollingSps5s: sps,
      acceleration: 0,
      zone: zoneId,
      zoneName: zoneInfo.name,
      zoneColor: zoneInfo.color,
      excitementScore: 0,
      isPeak: false,
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

    const sps3 = (
      (prev ? prev.sps : current.sps) +
      current.sps +
      (next ? next.sps : current.sps)
    ) / 3
    current.rollingSps3s = Math.round(sps3 * 100) / 100

    let windowSum = 0
    let count = 0
    for (let w = Math.max(0, i - 2); w <= Math.min(secondsData.length - 1, i + 2); w++) {
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

  const zoneCounts: Record<ExcitementZoneId, { seconds: number; steps: number }> = {
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
      secondsData.length > 0 ? Math.round((count.seconds / secondsData.length) * 100) : 0

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

  let fatigueTrend: 'increasing' | 'steady' | 'exhausted' = 'steady'
  if (secondHalfAvgSps > firstHalfAvgSps * 1.15) {
    fatigueTrend = 'increasing'
  } else if (secondHalfAvgSps < firstHalfAvgSps * 0.85) {
    fatigueTrend = 'exhausted'
  }

  const avgSps = durationSec > 0 ? Math.round((totalSteps / durationSec) * 100) / 100 : 0

  const intensityMultiplier = 1 + (avgSps > 2.5 ? 0.3 : avgSps > 1.8 ? 0.15 : 0)
  const caloriesBurned = Math.round(totalSteps * 0.045 * intensityMultiplier * 10) / 10

  const highIntensitySeconds =
    zoneCounts.sprint.seconds + zoneCounts.overdrive.seconds
  const sprintRatio = secondsData.length > 0 ? highIntensitySeconds / secondsData.length : 0

  const excitementTier = getExcitementTier(avgSps, maxSps, sprintRatio)

  return {
    id: `session_${Date.now()}`,
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
  }
}
