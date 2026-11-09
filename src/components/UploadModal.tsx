import React, { useState, useEffect, useId } from "react"
import {
  Upload,
  FileText,
  AlertCircle,
  CheckCircle2,
  FileCode,
  Sparkles,
  Video,
  Film,
  HardDrive,
  RefreshCw,
  FolderOpen,
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  parseRawLog,
  analyzeStepSession,
  parseRecordingSummaryFile,
} from "@/lib/logParser"
import type { SessionAnalysis, PCServerSessionMeta } from "@/types/stepData"

interface UploadModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSessionLoaded: (session: SessionAnalysis) => void
}

export const UploadModal: React.FC<UploadModalProps> = ({
  open,
  onOpenChange,
  onSessionLoaded,
}) => {
  const [activeTab, setActiveTab] = useState<"recordings" | "upload" | "paste">(
    "recordings"
  )
  const [rawText, setRawText] = useState("")
  const [fileName, setFileName] = useState("")
  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [parseError, setParseError] = useState<string | null>(null)
  const [previewStats, setPreviewStats] = useState<{
    count: number
    durationSec: number
    totalSteps: number
    hasVideo?: boolean
    videoName?: string
  } | null>(null)

  // Local recordings from /api/recordings
  const [recordingsList, setRecordingsList] = useState<PCServerSessionMeta[]>(
    []
  )
  const [recordingsDir, setRecordingsDir] = useState<string>(
    "C:\\Program Files (x86)\\PCServer_YHY\\recordings"
  )
  const [isLoadingRecordings, setIsLoadingRecordings] = useState(false)
  const [recordingsError, setRecordingsError] = useState<string | null>(null)

  const fileInputId = useId()

  const fetchLocalRecordings = async () => {
    setIsLoadingRecordings(true)
    setRecordingsError(null)
    try {
      const res = await fetch("/api/recordings")
      if (!res.ok) {
        throw new Error(`Failed to query recordings API (${res.status})`)
      }
      const data = await res.json()
      if (data.directory) {
        setRecordingsDir(data.directory)
      }
      if (Array.isArray(data.sessions)) {
        setRecordingsList(data.sessions)
      } else {
        setRecordingsList([])
      }
    } catch (_err: unknown) {
      setRecordingsError(
        "PCServer recording dev server not responding. You can still upload files directly below."
      )
    } finally {
      setIsLoadingRecordings(false)
    }
  }

  // Fetch local recordings on open
  useEffect(() => {
    if (open) {
      void fetchLocalRecordings()
    }
  }, [open])

  const handleLoadServerSession = async (meta: PCServerSessionMeta) => {
    try {
      setIsLoadingRecordings(true)
      setParseError(null)

      let parsedSession: SessionAnalysis

      if (meta.hasSummary && meta.summaryUrl) {
        const res = await fetch(meta.summaryUrl)
        const summaryJson = await res.json()
        const videoUrl = meta.hasVideo ? meta.videoUrl : undefined
        parsedSession = parseRecordingSummaryFile(summaryJson, videoUrl)
      } else if (meta.hasSteps && meta.stepsUrl) {
        const res = await fetch(meta.stepsUrl)
        const stepsText = await res.text()
        const records = parseRawLog(stepsText)
        const videoUrl = meta.hasVideo ? meta.videoUrl : undefined
        parsedSession = analyzeStepSession(
          records,
          meta.title,
          meta.stepsFile || "steps.txt",
          {
            videoUrl,
            videoFileName: meta.videoFile || undefined,
            sessionId: meta.sessionId,
          }
        )
      } else {
        throw new Error(
          "No summary or step telemetry file found for this session."
        )
      }

      onSessionLoaded(parsedSession)
      onOpenChange(false)
    } catch (err: unknown) {
      setParseError(
        err instanceof Error
          ? err.message
          : "Failed to load session from server."
      )
    } finally {
      setIsLoadingRecordings(false)
    }
  }

  const handleTextChange = (
    text: string,
    name = "custom_log.txt",
    attachedVideo?: File
  ) => {
    setRawText(text)
    setFileName(name)
    setParseError(null)

    if (attachedVideo) {
      setVideoFile(attachedVideo)
    }

    if (!text.trim()) {
      setPreviewStats(null)
      return
    }

    try {
      // Check if it's PCServer summary JSON
      if (text.trim().startsWith("{")) {
        try {
          const parsed = JSON.parse(text.replace(/^\uFEFF/, ""))
          if (parsed && Array.isArray(parsed.records)) {
            const records = parseRawLog(text)
            setPreviewStats({
              count: records.length,
              durationSec: parsed.durationMs
                ? Math.round(parsed.durationMs / 1000)
                : 0,
              totalSteps:
                parsed.deltaSteps ??
                records[records.length - 1].steps - records[0].steps,
              hasVideo: !!attachedVideo || !!parsed.videoFile,
              videoName: attachedVideo ? attachedVideo.name : parsed.videoFile,
            })
            return
          }
        } catch {
          // continue
        }
      }

      const records = parseRawLog(text)
      if (records.length < 2) {
        setParseError(
          "Log must contain at least 2 valid timestamped step records."
        )
        setPreviewStats(null)
        return
      }
      const t0 = records[0].timestamp
      const tEnd = records[records.length - 1].timestamp
      const durationSec = Math.round((tEnd - t0) / 1000)
      const totalSteps = records[records.length - 1].steps - records[0].steps

      setPreviewStats({
        count: records.length,
        durationSec,
        totalSteps,
        hasVideo: !!attachedVideo,
        videoName: attachedVideo ? attachedVideo.name : undefined,
      })
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to parse log file format."
      setParseError(message)
      setPreviewStats(null)
    }
  }

  const handleFileUpload = (files: FileList | File[]) => {
    let logFile: File | null = null
    let foundVideo: File | null = null

    for (let i = 0; i < files.length; i++) {
      const f = files[i]
      if (f.name.endsWith(".mp4") || f.type.startsWith("video/")) {
        foundVideo = f
      } else if (
        f.name.endsWith(".json") ||
        f.name.endsWith(".txt") ||
        f.name.endsWith(".log") ||
        f.name.endsWith(".csv") ||
        f.name.endsWith(".srt")
      ) {
        logFile = f
      }
    }

    if (foundVideo) {
      setVideoFile(foundVideo)
    }

    if (logFile) {
      const reader = new FileReader()
      reader.onload = (e) => {
        const content = e.target?.result as string
        handleTextChange(content, logFile!.name, foundVideo || undefined)
      }
      reader.onerror = () => {
        setParseError("Failed to read log file.")
      }
      reader.readAsText(logFile)
    } else if (foundVideo) {
      // User only selected a video
      setParseError(
        "Please also select the corresponding .json, .txt, or .srt step log file for this video."
      )
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileUpload(e.dataTransfer.files)
    }
  }

  const handleConfirm = () => {
    try {
      let session: SessionAnalysis
      let videoUrl: string | undefined = undefined

      if (videoFile) {
        videoUrl = URL.createObjectURL(videoFile)
      }

      // Check if rawText is summary JSON
      if (rawText.trim().startsWith("{")) {
        try {
          const parsed = JSON.parse(rawText.replace(/^\uFEFF/, ""))
          if (parsed && Array.isArray(parsed.records)) {
            session = parseRecordingSummaryFile(parsed, videoUrl)
            if (videoFile) {
              session.videoFileName = videoFile.name
            }
            onSessionLoaded(session)
            onOpenChange(false)
            return
          }
        } catch {
          // ignore
        }
      }

      const records = parseRawLog(rawText)
      session = analyzeStepSession(
        records,
        fileName ? fileName.replace(/\.[^/.]+$/, "") : "Custom Game Session",
        fileName || "custom_log.txt",
        {
          videoUrl,
          videoFileName: videoFile ? videoFile.name : undefined,
        }
      )

      onSessionLoaded(session)
      onOpenChange(false)
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : "Error generating session telemetry."
      setParseError(message)
    }
  }

  const loadExampleSnippet = () => {
    const now = Date.now()
    const sample = Array.from({ length: 40 }, (_, i) => {
      const steps = Math.floor(i * 1.8)
      const timestamp = now + i * 250
      const video_time_ms = i * 250
      const video_time = `00:00:0${Math.floor(i / 4)}.${(i % 4) * 250}`
      return JSON.stringify({ steps, timestamp, video_time_ms, video_time })
    }).join("\n")

    setActiveTab("paste")
    handleTextChange(sample, "sample_frame_burst.txt")
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Upload className="size-4 text-accent" />
            Import Game Controller Recording & Step Telemetry
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Synchronize game frame screen recordings (.mp4) with step cadence
            logs from PCServer.
          </DialogDescription>
        </DialogHeader>

        {/* Tab switcher */}
        <div className="flex border-b border-border/80 text-xs">
          <button
            onClick={() => setActiveTab("recordings")}
            className={`flex items-center gap-2 border-b-2 px-3.5 py-2 font-medium transition-colors ${
              activeTab === "recordings"
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <HardDrive className="size-3.5" />
            PCServer Folder
          </button>
          <button
            onClick={() => setActiveTab("upload")}
            className={`flex items-center gap-2 border-b-2 px-3.5 py-2 font-medium transition-colors ${
              activeTab === "upload"
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <FileText className="size-3.5" />
            Upload File(s)
          </button>
          <button
            onClick={() => setActiveTab("paste")}
            className={`flex items-center gap-2 border-b-2 px-3.5 py-2 font-medium transition-colors ${
              activeTab === "paste"
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <FileCode className="size-3.5" />
            Paste Log
          </button>
        </div>

        {/* Tab 1: PCServer Folder Recordings */}
        {activeTab === "recordings" && (
          <div className="space-y-4 py-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span className="flex max-w-md items-center gap-1.5 truncate font-mono">
                <FolderOpen className="size-3.5 shrink-0 text-accent" />
                <span>{recordingsDir}</span>
              </span>
              <Button
                variant="ghost"
                size="xs"
                onClick={fetchLocalRecordings}
                disabled={isLoadingRecordings}
                className="h-6 gap-1 text-xs"
              >
                <RefreshCw
                  className={`size-3 ${isLoadingRecordings ? "animate-spin" : ""}`}
                />
                <span>Scan</span>
              </Button>
            </div>

            {recordingsList.length === 0 ? (
              <div className="space-y-2 rounded-xl border border-dashed border-border p-6 text-center">
                <div className="mx-auto flex size-10 items-center justify-center rounded-full bg-muted">
                  <Film className="size-5 text-muted-foreground" />
                </div>
                <h4 className="text-sm font-medium text-foreground">
                  {isLoadingRecordings
                    ? "Scanning recordings..."
                    : "No recordings detected yet"}
                </h4>
                <p className="mx-auto max-w-sm text-xs text-muted-foreground">
                  Start an exercise session in PCServer with recording enabled,
                  or browse files manually in the Upload tab.
                </p>
                {recordingsError && (
                  <p className="pt-1 text-xs text-destructive">
                    {recordingsError}
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <div className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                  Available Recording Sessions ({recordingsList.length})
                </div>

                <div className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
                  {recordingsList.map((rec) => (
                    <div
                      key={rec.sessionId}
                      className="flex flex-col justify-between gap-3 p-3.5 transition-colors hover:bg-muted/30 sm:flex-row sm:items-center"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-semibold text-foreground">
                            {rec.sessionId}
                          </span>
                          {rec.hasVideo && (
                            <Badge
                              variant="default"
                              className="bg-emerald-600 text-[10px]"
                            >
                              MP4 Video
                            </Badge>
                          )}
                          {rec.hasSummary && (
                            <Badge variant="outline" className="text-[10px]">
                              Summary JSON
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-3 font-mono text-xs text-muted-foreground">
                          {rec.duration && (
                            <span>Duration: {rec.duration}</span>
                          )}
                          {rec.deltaSteps !== undefined && (
                            <span>
                              Steps: +{rec.deltaSteps} steps ({rec.initialSteps}{" "}
                              → {rec.finalSteps})
                            </span>
                          )}
                        </div>
                      </div>

                      <Button
                        size="sm"
                        disabled={isLoadingRecordings}
                        onClick={() => handleLoadServerSession(rec)}
                        className="h-8 shrink-0 bg-primary text-xs text-primary-foreground hover:bg-primary/90"
                      >
                        Load Session
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Upload Files */}
        {activeTab === "upload" && (
          <div className="space-y-4 py-2">
            <div
              onDragOver={(e) => {
                e.preventDefault()
                setIsDragging(true)
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              className={`flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-6 text-center transition-all ${
                isDragging
                  ? "border-primary bg-primary/10"
                  : "border-border/80 bg-muted/20 hover:border-border"
              }`}
            >
              <div className="rounded-full bg-primary/10 p-3 text-primary">
                <Upload className="size-6" />
              </div>
              <h4 className="mt-2 text-sm font-semibold text-foreground">
                Drag and drop your recording files here
              </h4>
              <p className="mt-1 text-xs text-muted-foreground">
                Drop your <strong>_summary.json</strong> or{" "}
                <strong>_steps.txt</strong>, along with your{" "}
                <strong>.mp4</strong> video!
              </p>

              <div className="mt-4 flex flex-wrap justify-center gap-2">
                <input
                  type="file"
                  id={fileInputId}
                  multiple
                  className="hidden"
                  accept=".txt,.json,.log,.csv,.srt,.mp4,video/*"
                  onChange={(e) => {
                    if (e.target.files && e.target.files.length > 0) {
                      handleFileUpload(e.target.files)
                    }
                  }}
                />
                <Button
                  variant="outline"
                  size="sm"
                  type="button"
                  className="cursor-pointer text-xs"
                  onClick={() => document.getElementById(fileInputId)?.click()}
                >
                  Browse Files (.json, .txt, .mp4)
                </Button>
              </div>
            </div>

            {/* Attached Video indicator */}
            {videoFile && (
              <div className="flex items-center gap-2 rounded-lg border border-border bg-card p-2.5 text-xs">
                <Video className="size-4 shrink-0 text-accent" />
                <span className="text-muted-foreground">
                  Synchronized Video:
                </span>
                <span className="truncate font-mono font-medium text-foreground">
                  {videoFile.name}
                </span>
                <Badge variant="outline" className="ml-auto text-[10px]">
                  {Math.round(videoFile.size / (1024 * 1024))} MB
                </Badge>
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Paste Log */}
        {activeTab === "paste" && (
          <div className="space-y-2 py-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Paste NDJSON lines or summary JSON:</span>
              <Button
                variant="ghost"
                size="xs"
                onClick={loadExampleSnippet}
                className="h-6 gap-1 text-xs text-accent hover:text-accent/80"
              >
                <Sparkles className="size-3" />
                Load sample snippet
              </Button>
            </div>
            <textarea
              value={rawText}
              onChange={(e) =>
                handleTextChange(e.target.value, "pasted_log.txt")
              }
              placeholder={`{"steps": 668, "timestamp": 1794205381583, "video_time_ms": 16741, "video_time": "00:00:16.741"}\n{"steps": 669, "timestamp": 1794205382370, "video_time_ms": 17528, "video_time": "00:00:17.528"}`}
              className="h-44 w-full rounded-xl border border-border bg-background p-3 font-mono text-xs outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </div>
        )}

        {/* Validation & Preview Feedback */}
        {parseError && (
          <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-2.5 text-xs text-destructive">
            <AlertCircle className="size-4 shrink-0" />
            <span>{parseError}</span>
          </div>
        )}

        {previewStats && (
          <div className="space-y-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs">
            <div className="flex items-center gap-1.5 font-semibold text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="size-4" />
              <span>Log parsed successfully!</span>
              {fileName && (
                <Badge variant="outline" className="ml-auto text-xs">
                  {fileName}
                </Badge>
              )}
            </div>
            <div className="grid grid-cols-3 gap-2 pt-1 font-mono text-xs text-muted-foreground">
              <div>
                Samples:{" "}
                <strong className="text-foreground">
                  {previewStats.count}
                </strong>
              </div>
              <div>
                Steps:{" "}
                <strong className="text-foreground">
                  +{previewStats.totalSteps}
                </strong>
              </div>
              <div>
                Duration:{" "}
                <strong className="text-foreground">
                  {previewStats.durationSec}s
                </strong>
              </div>
            </div>
            {previewStats.hasVideo && (
              <div className="flex items-center gap-1 pt-0.5 font-mono text-[11px] text-emerald-600 dark:text-emerald-400">
                <Video className="size-3" />
                <span>
                  Video attached: {previewStats.videoName || "MP4 Stream"}
                </span>
              </div>
            )}
          </div>
        )}

        <DialogFooter className="flex flex-row items-center justify-end gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          {activeTab !== "recordings" && (
            <Button
              size="sm"
              disabled={!previewStats}
              onClick={handleConfirm}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              Load & Visualize
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
