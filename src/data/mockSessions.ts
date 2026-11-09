import defaultUserLog from "@/data/step_logs_20261025_103455.txt?raw"
import session20261109Summary from "@/data/session_20261109_142244_summary.json?raw"

export interface PresetSession {
  id: string
  title: string
  description: string
  tag: string
  icon: string
  getRawText: () => string
  hasVideo?: boolean
  videoUrl?: string
  fps?: number
  isRecording?: boolean
}

export const PRESET_SESSIONS: PresetSession[] = [
  {
    id: "pcserver_recording_20261109",
    title: "PCServer Recording (session_20261109_142244)",
    description:
      "Direct recording from PCServer_YHY with 256 steps over 111 seconds synchronized with game screen recording at 30 FPS.",
    tag: "Game Screen Recording",
    icon: "Video",
    getRawText: () => session20261109Summary,
    hasVideo: true,
    videoUrl: "/api/recordings/session_20261109_142244/video",
    fps: 30,
    isRecording: true,
  },
  {
    id: "user_actual_log",
    title: "Actual Gamer Session (10:34:55)",
    description:
      "Recorded telemetry with 183 steps over 78 seconds featuring multi-step bursts up to 4 SPS.",
    tag: "Live Device Log",
    icon: "Gamepad2",
    getRawText: () => defaultUserLog,
  },
]
