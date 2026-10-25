import React from 'react'
import {
  Activity,
  Flame,
  Upload,
  Download,
  Moon,
  Sun,
  Gamepad2,
  FileText,
  ChevronDown,
  FileCode,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useTheme } from '@/components/theme-provider'
import type { PresetSession } from '@/data/mockSessions'
import { PRESET_SESSIONS } from '@/data/mockSessions'
import type { SessionAnalysis } from '@/types/stepData'

interface HeaderProps {
  currentSession: SessionAnalysis
  currentPresetId: string
  onSelectPreset: (preset: PresetSession) => void
  onOpenUpload: () => void
  onExportCsv: () => void
  onExportJson: () => void
}

export const Header: React.FC<HeaderProps> = ({
  currentSession,
  currentPresetId,
  onSelectPreset,
  onOpenUpload,
  onExportCsv,
  onExportJson,
}) => {
  const { theme, setTheme } = useTheme()
  const [dropdownOpen, setDropdownOpen] = React.useState(false)

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark')
  }

  const activePreset = PRESET_SESSIONS.find((p) => p.id === currentPresetId)

  return (
    <header className="sticky top-0 z-30 w-full border-b border-border/80 bg-background/85 backdrop-blur-md transition-colors">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-3 sm:px-6">
        {/* Brand & Title */}
        <div className="flex items-center gap-3">
          <div className="relative flex size-10 items-center justify-center rounded-xl bg-gradient-to-tr from-cyan-500 via-indigo-500 to-rose-500 shadow-md shadow-indigo-500/25">
            <Activity className="size-5 text-white animate-pulse" />
            <div className="absolute -top-1 -right-1 flex size-3">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-400 opacity-75" />
              <span className="relative inline-flex size-3 rounded-full bg-rose-500" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold tracking-tight text-foreground sm:text-xl">
                StepPulse
              </h1>
              <Badge
                variant="outline"
                className="hidden border-indigo-500/30 bg-indigo-500/10 text-[10px] font-semibold text-indigo-500 sm:inline-flex"
              >
                EXERGAMING ANALYTICS
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Second-by-second cadence (SPS) & gamer excitement visualizer
            </p>
          </div>
        </div>

        {/* Actions & Session Selector */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Preset Selector Dropdown */}
          <div className="relative">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="gap-2 border-border/80 bg-card/60 text-xs shadow-xs"
            >
              <Gamepad2 className="size-3.5 text-indigo-500" />
              <span className="max-w-[140px] truncate sm:max-w-none">
                {activePreset ? activePreset.title : currentSession.title}
              </span>
              <ChevronDown className="size-3.5 text-muted-foreground" />
            </Button>

            {dropdownOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setDropdownOpen(false)}
                />
                <div className="absolute right-0 z-50 mt-1.5 w-72 rounded-xl border border-border bg-card p-1.5 shadow-xl ring-1 ring-foreground/5">
                  <div className="px-2.5 py-1.5 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                    Select Game Session
                  </div>
                  <div className="space-y-0.5">
                    {PRESET_SESSIONS.map((preset) => {
                      const isSelected = preset.id === currentPresetId
                      return (
                        <button
                          key={preset.id}
                          onClick={() => {
                            onSelectPreset(preset)
                            setDropdownOpen(false)
                          }}
                          className={`flex w-full items-start gap-2.5 rounded-lg p-2 text-left text-xs transition-colors ${
                            isSelected
                              ? 'bg-primary/10 text-primary font-medium'
                              : 'text-foreground hover:bg-muted'
                          }`}
                        >
                          <div
                            className={`mt-0.5 rounded-md p-1 ${
                              isSelected
                                ? 'bg-primary/20 text-primary'
                                : 'bg-muted text-muted-foreground'
                            }`}
                          >
                            {preset.id.includes('boss') ? (
                              <Flame className="size-3.5 text-rose-500" />
                            ) : preset.id.includes('hiit') ? (
                              <Activity className="size-3.5 text-amber-500" />
                            ) : (
                              <FileText className="size-3.5 text-cyan-500" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="truncate font-medium">{preset.title}</div>
                            <div className="text-[11px] text-muted-foreground line-clamp-1">
                              {preset.description}
                            </div>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Upload / Custom Data Button */}
          <Button
            variant="default"
            size="sm"
            onClick={onOpenUpload}
            className="gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs"
          >
            <Upload className="size-3.5" />
            <span>Load Logs</span>
          </Button>

          {/* Export CSV */}
          <Button
            variant="outline"
            size="sm"
            onClick={onExportCsv}
            title="Export second-by-second data to CSV"
            className="size-8 p-0"
          >
            <Download className="size-3.5" />
          </Button>

          {/* Export JSON */}
          <Button
            variant="outline"
            size="sm"
            onClick={onExportJson}
            title="Export session analysis to JSON"
            className="size-8 p-0"
          >
            <FileCode className="size-3.5" />
          </Button>

          {/* Dark Mode Toggle */}
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleTheme}
            className="size-8 p-0 text-muted-foreground hover:text-foreground"
            title="Toggle theme (Press 'D')"
          >
            {theme === 'dark' ? (
              <Sun className="size-4 text-amber-400" />
            ) : (
              <Moon className="size-4 text-indigo-400" />
            )}
          </Button>
        </div>
      </div>
    </header>
  )
}
