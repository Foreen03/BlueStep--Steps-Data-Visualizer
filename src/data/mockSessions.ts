import defaultUserLog from '@/data/step_logs_20261025_103455.txt?raw'

export interface PresetSession {
  id: string
  title: string
  description: string
  tag: string
  icon: string
  getRawText: () => string
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
]
