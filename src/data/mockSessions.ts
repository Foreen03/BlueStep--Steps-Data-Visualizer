import defaultUserLog from '@/data/step_logs_20261025_103455.txt?raw'
import type { RawStepRecord } from '@/types/stepData'

export interface PresetSession {
  id: string
  title: string
  description: string
  tag: string
  icon: string
  getRawText: () => string
}

/**
 * Generates synthetic realistic step logs for comparative gaming scenarios
 */
function generateSyntheticLog(
  pattern: 'boss_fight' | 'hiit' | 'steady_flow',
  durationSeconds: number = 90
): string {
  const records: RawStepRecord[] = []
  let currentSteps = 0
  const t0 = 1792900000000
  let currentTimestamp = t0

  const sampleIntervalMs = 40 // ~25Hz telemetry logging like real device
  const totalSamples = Math.floor((durationSeconds * 1000) / sampleIntervalMs)

  let targetSps = 1
  let stepAccumulator = 0

  for (let i = 0; i < totalSamples; i++) {
    const elapsedSec = (i * sampleIntervalMs) / 1000

    if (pattern === 'boss_fight') {
      if (elapsedSec < 10) {
        targetSps = 1.2
      } else if (elapsedSec >= 15 && elapsedSec < 28) {
        targetSps = 4.8
      } else if (elapsedSec >= 28 && elapsedSec < 35) {
        targetSps = 0.5
      } else if (elapsedSec >= 35 && elapsedSec < 50) {
        targetSps = 3.8
      } else if (elapsedSec >= 50 && elapsedSec < 58) {
        targetSps = 1.0
      } else if (elapsedSec >= 58 && elapsedSec < 80) {
        targetSps = 5.2
      } else {
        targetSps = 1.5
      }
    } else if (pattern === 'hiit') {
      const cycle = Math.floor(elapsedSec / 12) % 2
      targetSps = cycle === 0 ? 4.2 : 0.8
    } else {
      targetSps = 1.5 + (elapsedSec / durationSeconds) * 1.8 + Math.sin(elapsedSec / 4) * 0.4
    }

    stepAccumulator += (targetSps * sampleIntervalMs) / 1000
    if (stepAccumulator >= 1) {
      currentSteps += Math.floor(stepAccumulator)
      stepAccumulator -= Math.floor(stepAccumulator)
    }

    records.push({
      steps: currentSteps,
      timestamp: currentTimestamp,
    })

    currentTimestamp += sampleIntervalMs
  }

  return records.map((r) => JSON.stringify(r)).join('\n')
}

export const PRESET_SESSIONS: PresetSession[] = [
  {
    id: 'user_actual_log',
    title: 'Actual Gamer Session (10:34:55)',
    description: 'Recorded telemetry with 183 steps over 78 seconds featuring multi-step bursts up to 4 SPS.',
    tag: 'Live Device Log',
    icon: 'Gamepad2',
    getRawText: () => defaultUserLog,
  },
  {
    id: 'boss_fight_rush',
    title: 'Boss Battle Overdrive (90s)',
    description: 'High-octane boss encounter with extreme enrage bursts reaching 5+ steps per second.',
    tag: 'Boss Fight',
    icon: 'Flame',
    getRawText: () => generateSyntheticLog('boss_fight', 85),
  },
  {
    id: 'hiit_intervals',
    title: 'HIIT Rhythm Intervals (72s)',
    description: 'Interval workout alternating 12-second max sprints with rapid active recovery valleys.',
    tag: 'Intervals',
    icon: 'Zap',
    getRawText: () => generateSyntheticLog('hiit', 72),
  },
  {
    id: 'steady_endurance',
    title: 'Endurance Groove Marathon (90s)',
    description: 'Continuous progressive cadence test building from a rhythmic stroll to a steady 3.2 SPS trot.',
    tag: 'Endurance',
    icon: 'Activity',
    getRawText: () => generateSyntheticLog('steady_flow', 90),
  },
]
