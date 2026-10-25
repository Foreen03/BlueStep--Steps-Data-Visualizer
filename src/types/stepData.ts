export type ExcitementZoneId = 'rest' | 'warmup' | 'active' | 'sprint' | 'overdrive'

export interface ExcitementZoneInfo {
  id: ExcitementZoneId
  name: string
  spsRange: string
  color: string
  accentColor: string
  bgLight: string
  bgDark: string
  textColor: string
  description: string
  minSps: number
  maxSps: number
}

export const EXCITEMENT_ZONES: Record<ExcitementZoneId, ExcitementZoneInfo> = {
  rest: {
    id: 'rest',
    name: 'Rest / Idle',
    spsRange: '0 SPS',
    color: '#94a3b8',
    accentColor: '#64748b',
    bgLight: 'bg-slate-100',
    bgDark: 'dark:bg-slate-800/40',
    textColor: 'text-slate-500 dark:text-slate-400',
    description: 'Idle pause, cutscene, or brief recovery',
    minSps: 0,
    maxSps: 0.5,
  },
  warmup: {
    id: 'warmup',
    name: 'Warmup / Light',
    spsRange: '1 SPS',
    color: '#10b981',
    accentColor: '#059669',
    bgLight: 'bg-emerald-50',
    bgDark: 'dark:bg-emerald-950/40',
    textColor: 'text-emerald-600 dark:text-emerald-400',
    description: 'Casual rhythmic stepping, 60 SPM equivalent',
    minSps: 0.5,
    maxSps: 1.5,
  },
  active: {
    id: 'active',
    name: 'Active Groove',
    spsRange: '2 SPS',
    color: '#06b6d4',
    accentColor: '#0891b2',
    bgLight: 'bg-cyan-50',
    bgDark: 'dark:bg-cyan-950/40',
    textColor: 'text-cyan-600 dark:text-cyan-400',
    description: 'Steady energetic stepping, 120 SPM tempo',
    minSps: 1.5,
    maxSps: 2.5,
  },
  sprint: {
    id: 'sprint',
    name: 'High Intensity',
    spsRange: '3 SPS',
    color: '#f59e0b',
    accentColor: '#d97706',
    bgLight: 'bg-amber-50',
    bgDark: 'dark:bg-amber-950/40',
    textColor: 'text-amber-600 dark:text-amber-400',
    description: 'Fast rapid steps, 180 SPM gaming sprint',
    minSps: 2.5,
    maxSps: 3.5,
  },
  overdrive: {
    id: 'overdrive',
    name: 'Overdrive Frenzy',
    spsRange: '4+ SPS',
    color: '#ef4444',
    accentColor: '#dc2626',
    bgLight: 'bg-rose-50',
    bgDark: 'dark:bg-rose-950/40',
    textColor: 'text-rose-600 dark:text-rose-400',
    description: 'Max excitement bursts! 240+ SPM peak effort',
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
