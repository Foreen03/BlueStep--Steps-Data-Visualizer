export type ExcitementZoneId = 'rest' | 'warmup' | 'active' | 'sprint' | 'overdrive'

export interface ExcitementZoneInfo {
  id: ExcitementZoneId
  name: string
  spsRange: string
  color: string
  accentColor: string
  description: string
  minSps: number
  maxSps: number
}

export const EXCITEMENT_ZONES: Record<ExcitementZoneId, ExcitementZoneInfo> = {
  rest: {
    id: 'rest',
    name: 'Rest',
    spsRange: '0 SPS',
    color: '#94a3b8',
    accentColor: '#64748b',
    description: 'Idle pause or recovery',
    minSps: 0,
    maxSps: 0.5,
  },
  warmup: {
    id: 'warmup',
    name: 'Warmup',
    spsRange: '1 SPS',
    color: '#1b6c80',
    accentColor: '#155767',
    description: 'Casual rhythmic stepping (~60 SPM)',
    minSps: 0.5,
    maxSps: 1.5,
  },
  active: {
    id: 'active',
    name: 'Active',
    spsRange: '2 SPS',
    color: '#2f70bb',
    accentColor: '#245690',
    description: 'Steady energetic stepping (~120 SPM)',
    minSps: 1.5,
    maxSps: 2.5,
  },
  sprint: {
    id: 'sprint',
    name: 'Sprint',
    spsRange: '3 SPS',
    color: '#a86f0c',
    accentColor: '#8a5c0a',
    description: 'Fast rapid steps (~180 SPM)',
    minSps: 2.5,
    maxSps: 3.5,
  },
  overdrive: {
    id: 'overdrive',
    name: 'Burst',
    spsRange: '4+ SPS',
    color: '#c4242a',
    accentColor: '#9f1d22',
    description: 'Maximum exertion burst (240+ SPM)',
    minSps: 3.5,
    maxSps: 99,
  },
}

export interface RawStepRecord {
  steps: number
  timestamp: number
}

export interface StepEvent {
  stepNumber: number
  timestamp: number
  elapsedMs: number
  deltaMs: number
  instantaneousSps: number
}

export interface SecondMetric {
  second: number
  timestamp: number
  timeFormatted: string
  steps: number
  sps: number // Steps in this 1s interval
  rollingSps3s: number
  rollingSps5s: number
  acceleration: number // Delta SPS vs previous second
  zone: ExcitementZoneId
  zoneName: string
  zoneColor: string
  excitementScore: number // 0-100 calculated intensity
  isPeak: boolean
}

export interface ZoneSummary {
  zone: ExcitementZoneId
  name: string
  color: string
  seconds: number
  percentage: number
  stepCount: number
}

export interface SessionAnalysis {
  id: string
  title: string
  fileName: string
  totalSteps: number
  durationSec: number
  durationFormatted: string
  avgSps: number
  maxSps: number
  peakTimeSec: number
  peakTimeFormatted: string
  caloriesBurned: number
  overallExcitementScore: number
  excitementTier: {
    level: string
    title: string
    color: string
    badge: string
    comment: string
  }
  longestSprintSec: number
  sprintBurstCount: number
  firstHalfAvgSps: number
  secondHalfAvgSps: number
  fatigueTrend: 'increasing' | 'steady' | 'exhausted'
  zoneSummaries: ZoneSummary[]
  secondsData: SecondMetric[]
  stepEvents: StepEvent[]
  rawRecordCount: number
}
