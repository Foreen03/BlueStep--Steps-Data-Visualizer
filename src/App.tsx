import { useState, useMemo } from 'react'
import { Header } from '@/components/Header'
import { SummaryCards } from '@/components/SummaryCards'
import { CadenceChart } from '@/components/CadenceChart'
import { ExcitementReplay } from '@/components/ExcitementReplay'
import { ExcitementBreakdown } from '@/components/ExcitementBreakdown'
import { LogInspectorTable } from '@/components/LogInspectorTable'
import { UploadModal } from '@/components/UploadModal'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import type { PresetSession } from '@/data/mockSessions'
import { PRESET_SESSIONS } from '@/data/mockSessions'
import { parseRawLog, analyzeStepSession } from '@/lib/logParser'
import type { SessionAnalysis } from '@/types/stepData'

export function App() {
  const [currentPresetId, setCurrentPresetId] = useState<string>('user_actual_log')
  const [isUploadOpen, setIsUploadOpen] = useState(false)
  const [selectedSecond, setSelectedSecond] = useState<number>(0)
  const [activeTab, setActiveTab] = useState<string>('dashboard')

  // Initialize session from default user log
  const initialSession = useMemo(() => {
    try {
      const defaultPreset = PRESET_SESSIONS[0]
      const rawText = defaultPreset.getRawText()
      const records = parseRawLog(rawText)
      return analyzeStepSession(records, defaultPreset.title, 'step_logs_20261025_103455.txt')
    } catch {
      return analyzeStepSession(
        [
          { steps: 0, timestamp: 1000 },
          { steps: 1, timestamp: 2000 },
        ],
        'Default',
        'log.txt'
      )
    }
  }, [])

  const [session, setSession] = useState<SessionAnalysis>(initialSession)

  const handleSelectPreset = (preset: PresetSession) => {
    try {
      const rawText = preset.getRawText()
      const records = parseRawLog(rawText)
      const analyzed = analyzeStepSession(records, preset.title, `${preset.id}.txt`)
      setSession(analyzed)
      setCurrentPresetId(preset.id)
      setSelectedSecond(0)
    } catch (err) {
      console.error('Failed to load preset:', err)
    }
  }

  const handleCustomSessionLoaded = (newSession: SessionAnalysis) => {
    setSession(newSession)
    setCurrentPresetId('custom')
    setSelectedSecond(0)
  }

  const handleExportCsv = () => {
    const headers = [
      'Second',
      'Time',
      'StepsInSecond(SPS)',
      'CumulativeSteps',
      'Rolling3sSPS',
      'Acceleration',
      'ExcitementZone',
      'ExcitementScore',
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
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `${session.fileName.replace(/\.[^/.]+$/, '')}_cadence.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleExportJson = () => {
    const dataStr =
      'data:text/json;charset=utf-8,' +
      encodeURIComponent(JSON.stringify(session, null, 2))
    const link = document.createElement('a')
    link.setAttribute('href', dataStr)
    link.setAttribute('download', `${session.fileName.replace(/\.[^/.]+$/, '')}_summary.json`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col antialiased">
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
      <main className="flex-1 mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 space-y-6">
        {/* Title and Screen Finding Row */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-baseline sm:justify-between border-b border-border pb-4">
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
              {session.title}
            </h1>
            <p className="text-[13px] text-muted-foreground mt-1 tabular-nums">
              Session finding: Cadence averaged {session.avgSps} sps (~{Math.round(session.avgSps * 60)} SPM), peaking at {session.maxSps} sps at {session.peakTimeFormatted} ({session.durationFormatted} total, {session.rawRecordCount.toLocaleString()} telemetry samples).
            </p>
          </div>
          <div className="text-[13px] font-mono text-muted-foreground tabular-nums">
            Scope: {session.fileName}
          </div>
        </div>

        {/* Unified KPI Row */}
        <SummaryCards session={session} />

        {/* View Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <div className="border-b border-border">
            <TabsList className="bg-transparent p-0 h-auto gap-4 flex flex-wrap sm:flex-nowrap">
              <TabsTrigger
                value="dashboard"
                className="rounded-none border-b-2 border-transparent px-2.5 py-2 text-sm font-medium data-[state=active]:border-accent data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none"
              >
                Overview
              </TabsTrigger>
              <TabsTrigger
                value="replay"
                className="rounded-none border-b-2 border-transparent px-2.5 py-2 text-sm font-medium data-[state=active]:border-accent data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none"
              >
                Replay
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
          <TabsContent value="dashboard" className="space-y-6 mt-0">
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

          {/* 2. Replay Simulator Tab */}
          <TabsContent value="replay" className="space-y-6 mt-0">
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

          {/* 3. Cadence Breakdown Tab */}
          <TabsContent value="breakdown" className="space-y-6 mt-0">
            <ExcitementBreakdown session={session} />
            <CadenceChart
              session={session}
              highlightedSecond={selectedSecond}
              onSelectSecond={(sec) => setSelectedSecond(sec)}
            />
          </TabsContent>

          {/* 4. Telemetry Inspector Tab */}
          <TabsContent value="inspector" className="space-y-6 mt-0">
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
        <div className="mx-auto max-w-7xl px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>StepPulse telemetry engine • Precision exergaming analysis</span>
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
