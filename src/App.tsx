import { useState, useMemo } from 'react'
import {
  Activity,
  Gauge,
  PieChart,
  TableProperties,
  Sparkles,
  Info,
} from 'lucide-react'
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
      // Fallback empty session
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
    <div className="min-h-screen bg-background text-foreground flex flex-col antialiased selection:bg-indigo-500 selection:text-white">
      {/* Top Header */}
      <Header
        currentSession={session}
        currentPresetId={currentPresetId}
        onSelectPreset={handleSelectPreset}
        onOpenUpload={() => setIsUploadOpen(true)}
        onExportCsv={handleExportCsv}
        onExportJson={handleExportJson}
      />

      {/* Main Container */}
      <main className="flex-1 mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 space-y-6">
        {/* Session Banner Info */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-indigo-500/20 bg-gradient-to-r from-indigo-500/10 via-cyan-500/5 to-rose-500/10 p-4 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-indigo-500/20 p-2 text-indigo-500">
              <Sparkles className="size-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-bold text-foreground">
                  {session.title}
                </h2>
                <span className="text-xs font-mono text-muted-foreground">
                  ({session.fileName})
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Processed <strong>{session.rawRecordCount.toLocaleString()}</strong> raw telemetry samples over{' '}
                <strong>{session.durationFormatted}</strong> ({session.durationSec}s).
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="text-right hidden sm:block">
              <span className="text-[11px] text-muted-foreground block">Peak Moment</span>
              <span className="text-xs font-bold font-mono text-rose-500">
                {session.maxSps} SPS at {session.peakTimeFormatted}
              </span>
            </div>
          </div>
        </div>

        {/* Top KPI Cards */}
        <SummaryCards session={session} />

        {/* View Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-muted/50 p-1 rounded-xl border border-border/80">
            <TabsTrigger value="dashboard" className="gap-2 text-xs">
              <Activity className="size-3.5" />
              <span>Overview & Chart</span>
            </TabsTrigger>
            <TabsTrigger value="replay" className="gap-2 text-xs">
              <Gauge className="size-3.5" />
              <span>Live Simulator</span>
            </TabsTrigger>
            <TabsTrigger value="breakdown" className="gap-2 text-xs">
              <PieChart className="size-3.5" />
              <span>Excitement Breakdown</span>
            </TabsTrigger>
            <TabsTrigger value="inspector" className="gap-2 text-xs">
              <TableProperties className="size-3.5" />
              <span>Telemetry Inspector</span>
            </TabsTrigger>
          </TabsList>

          {/* 1. Dashboard Tab: Cadence Chart + Replay Simulator */}
          <TabsContent value="dashboard" className="space-y-6">
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

          {/* 2. Replay Simulator Dedicated Tab */}
          <TabsContent value="replay" className="space-y-6">
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

          {/* 3. Excitement Breakdown Tab */}
          <TabsContent value="breakdown" className="space-y-6">
            <ExcitementBreakdown session={session} />
            <CadenceChart
              session={session}
              highlightedSecond={selectedSecond}
              onSelectSecond={(sec) => setSelectedSecond(sec)}
            />
          </TabsContent>

          {/* 4. Telemetry Inspector Tab */}
          <TabsContent value="inspector" className="space-y-6">
            <LogInspectorTable
              session={session}
              onSelectSecond={(sec) => setSelectedSecond(sec)}
              selectedSecond={selectedSecond}
            />
          </TabsContent>
        </Tabs>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/60 bg-muted/20 py-6 text-center text-xs text-muted-foreground">
        <div className="mx-auto max-w-7xl px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <Info className="size-3.5 text-indigo-500" />
            <span>StepPulse • Built with React 19, Vite, shadcn UI & Tailwind CSS</span>
          </div>
          <div>
            Tip: Press <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px]">D</kbd> to toggle Dark Mode
          </div>
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
