import { useState, useMemo } from "react"
import { Film } from "lucide-react"
import { Header } from "@/components/Header"
import { SummaryCards } from "@/components/SummaryCards"
import { CadenceChart } from "@/components/CadenceChart"
import { ExcitementReplay } from "@/components/ExcitementReplay"
import { GameFramePlayer } from "@/components/GameFramePlayer"
import { ExcitementBreakdown } from "@/components/ExcitementBreakdown"
import { LogInspectorTable } from "@/components/LogInspectorTable"
import { UploadModal } from "@/components/UploadModal"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import type { PresetSession } from "@/data/mockSessions"
import { PRESET_SESSIONS } from "@/data/mockSessions"
import {
  parseRawLog,
  analyzeStepSession,
  parseRecordingSummaryFile,
} from "@/lib/logParser"
import type { SessionAnalysis } from "@/types/stepData"

function loadSessionFromPreset(preset: PresetSession): SessionAnalysis {
  try {
    const rawText = preset.getRawText()
    if (rawText.trim().startsWith("{")) {
      try {
        const parsed = JSON.parse(rawText.replace(/^\uFEFF/, ""))
        if (parsed && Array.isArray(parsed.records)) {
          return parseRecordingSummaryFile(
            parsed,
            preset.videoUrl,
            preset.fps || 30
          )
        }
      } catch {
        // continue
      }
    }
    const records = parseRawLog(rawText, preset.fps || 30)
    return analyzeStepSession(records, preset.title, `${preset.id}.txt`, {
      videoUrl: preset.videoUrl,
      fps: preset.fps || 30,
    })
  } catch (err) {
    console.error("Failed to parse preset:", err)
    return analyzeStepSession(
      [
        { steps: 0, timestamp: 1000 },
        { steps: 1, timestamp: 2000 },
      ],
      "Default",
      "log.txt"
    )
  }
}

export function App() {
  const [currentPresetId, setCurrentPresetId] = useState<string>(
    PRESET_SESSIONS[0].id
  )
  const [isUploadOpen, setIsUploadOpen] = useState(false)
  const [selectedSecond, setSelectedSecond] = useState<number>(0)
  const [activeTab, setActiveTab] = useState<string>("frames")

  // Initialize session from default preset (PCServer recording session)
  const initialSession = useMemo(() => {
    return loadSessionFromPreset(PRESET_SESSIONS[0])
  }, [])

  const [session, setSession] = useState<SessionAnalysis>(initialSession)

  const handleSelectPreset = (preset: PresetSession) => {
    try {
      const analyzed = loadSessionFromPreset(preset)
      setSession(analyzed)
      setCurrentPresetId(preset.id)
      setSelectedSecond(0)
    } catch (err) {
      console.error("Failed to load preset:", err)
    }
  }

  const handleCustomSessionLoaded = (newSession: SessionAnalysis) => {
    setSession(newSession)
    setCurrentPresetId("custom")
    setSelectedSecond(0)
    if (
      newSession.hasVideo ||
      (newSession.frameRecords && newSession.frameRecords.length > 0)
    ) {
      setActiveTab("frames")
    }
  }

  const handleAttachVideo = (videoUrl: string, fileName?: string) => {
    setSession((prev) => ({
      ...prev,
      hasVideo: true,
      videoUrl,
      videoFileName: fileName || prev.videoFileName,
    }))
  }

  const handleExportCsv = () => {
    const headers = [
      "Second",
      "Time",
      "StepsInSecond(SPS)",
      "CumulativeSteps",
      "Rolling3sSPS",
      "Acceleration",
      "ExcitementZone",
      "ExcitementScore",
    ]
    const rows = session.secondsData.map((d) => [
      d.second,
      d.timeFormatted,
      d.sps,
      d.steps,
      d.rollingSps3s,
      d.acceleration,
      d.zone,
      d.excitementScore,
    ])
    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n")
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement("a")
    link.setAttribute("href", encodedUri)
    link.setAttribute(
      "download",
      `${session.fileName.replace(/\.[^/.]+$/, "")}_cadence.csv`
    )
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleExportJson = () => {
    const dataStr =
      "data:text/json;charset=utf-8," +
      encodeURIComponent(JSON.stringify(session, null, 2))
    const link = document.createElement("a")
    link.setAttribute("href", dataStr)
    link.setAttribute(
      "download",
      `${session.fileName.replace(/\.[^/.]+$/, "")}_summary.json`
    )
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground antialiased">
      {/* Top Header */}
      <Header
        currentSession={session}
        currentPresetId={currentPresetId}
        onSelectPreset={handleSelectPreset}
        onOpenUpload={() => setIsUploadOpen(true)}
        onExportCsv={handleExportCsv}
        onExportJson={handleExportJson}
      />

      {/* Main Sheet Container */}
      <main className="mx-auto w-full max-w-7xl flex-1 space-y-6 px-4 py-6 sm:px-6">
        {/* Title and Screen Finding Row */}
        <div className="flex flex-col gap-2 border-b border-border pb-4 sm:flex-row sm:items-baseline sm:justify-between">
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
              {session.title}
            </h1>
            <p className="mt-1 text-[13px] text-muted-foreground tabular-nums">
              Session finding: Cadence averaged {session.avgSps} sps (~
              {Math.round(session.avgSps * 60)} SPM), peaking at{" "}
              {session.maxSps} sps at {session.peakTimeFormatted} (
              {session.durationFormatted} total,{" "}
              {session.rawRecordCount.toLocaleString()} telemetry samples).
            </p>
          </div>
          <div className="font-mono text-[13px] text-muted-foreground tabular-nums">
            Scope: {session.fileName}
          </div>
        </div>

        {/* Unified KPI Row */}
        <SummaryCards session={session} />

        {/* View Tabs */}
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="space-y-6"
        >
          <div className="border-b border-border">
            <TabsList className="flex h-auto flex-wrap gap-4 bg-transparent p-0 sm:flex-nowrap">
              <TabsTrigger
                value="dashboard"
                className="rounded-none border-b-2 border-transparent px-2.5 py-2 text-sm font-medium data-[state=active]:border-accent data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none"
              >
                Overview
              </TabsTrigger>
              <TabsTrigger
                value="frames"
                className="flex items-center gap-1.5 rounded-none border-b-2 border-transparent px-2.5 py-2 text-sm font-medium data-[state=active]:border-accent data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none"
              >
                <Film className="size-3.5 text-accent" />
                <span>Game Frames & Video</span>
                {session.frameRecords && session.frameRecords.length > 0 && (
                  <span className="py-0.2 rounded-full bg-accent/20 px-1.5 font-mono text-[10px] font-medium text-accent">
                    {session.frameRecords.length}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger
                value="replay"
                className="rounded-none border-b-2 border-transparent px-2.5 py-2 text-sm font-medium data-[state=active]:border-accent data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none"
              >
                Speedometer
              </TabsTrigger>
              <TabsTrigger
                value="breakdown"
                className="rounded-none border-b-2 border-transparent px-2.5 py-2 text-sm font-medium data-[state=active]:border-accent data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none"
              >
                Breakdown
              </TabsTrigger>
              <TabsTrigger
                value="inspector"
                className="rounded-none border-b-2 border-transparent px-2.5 py-2 text-sm font-medium data-[state=active]:border-accent data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none"
              >
                Telemetry
              </TabsTrigger>
            </TabsList>
          </div>

          {/* 1. Dashboard Tab */}
          <TabsContent value="dashboard" className="mt-0 space-y-6">
            <CadenceChart
              session={session}
              highlightedSecond={selectedSecond}
              onSelectSecond={(sec) => setSelectedSecond(sec)}
            />
            <ExcitementReplay
              session={session}
              currentSecond={selectedSecond}
              onSecondChange={setSelectedSecond}
            />
            <ExcitementBreakdown session={session} />
          </TabsContent>

          {/* 2. Game Frames & Video Sync Tab */}
          <TabsContent value="frames" className="mt-0 space-y-6">
            <GameFramePlayer
              session={session}
              highlightedSecond={selectedSecond}
              onSelectSecond={(sec) => setSelectedSecond(sec)}
              onAttachVideo={handleAttachVideo}
            />
            <CadenceChart
              session={session}
              highlightedSecond={selectedSecond}
              onSelectSecond={(sec) => setSelectedSecond(sec)}
            />
          </TabsContent>

          {/* 3. Replay Simulator Tab */}
          <TabsContent value="replay" className="mt-0 space-y-6">
            <ExcitementReplay
              session={session}
              currentSecond={selectedSecond}
              onSecondChange={setSelectedSecond}
            />
            <CadenceChart
              session={session}
              highlightedSecond={selectedSecond}
              onSelectSecond={(sec) => setSelectedSecond(sec)}
            />
          </TabsContent>

          {/* 4. Cadence Breakdown Tab */}
          <TabsContent value="breakdown" className="mt-0 space-y-6">
            <ExcitementBreakdown session={session} />
            <CadenceChart
              session={session}
              highlightedSecond={selectedSecond}
              onSelectSecond={(sec) => setSelectedSecond(sec)}
            />
          </TabsContent>

          {/* 5. Telemetry Inspector Tab */}
          <TabsContent value="inspector" className="mt-0 space-y-6">
            <LogInspectorTable
              session={session}
              onSelectSecond={(sec) => setSelectedSecond(sec)}
              selectedSecond={selectedSecond}
            />
          </TabsContent>
        </Tabs>
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-card/40 py-4 text-xs text-muted-foreground">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 px-4 sm:flex-row sm:px-6">
          <span>BlueStep Data Visualizer • Precision exergaming analysis</span>
          <span>Press D to toggle dark theme</span>
        </div>
      </footer>

      {/* Upload/Paste Modal */}
      <UploadModal
        open={isUploadOpen}
        onOpenChange={setIsUploadOpen}
        onSessionLoaded={handleCustomSessionLoaded}
      />
    </div>
  )
}

export default App
