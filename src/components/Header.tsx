import React from 'react'
import {
  Upload,
  Download,
  Moon,
  Sun,
  ChevronDown,
  FileCode,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
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
    <header className="sticky top-0 z-30 w-full border-b border-border bg-background/95 backdrop-blur-xs transition-colors">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-3 sm:px-6">
        {/* Brand & Mark */}
        <div className="flex items-center gap-2.5">
          {/* Authentic cadence waveform logo mark */}
          <svg
            className="size-6 text-accent shrink-0"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="2 12 6 12 9 4 13 20 16 10 19 14 22 12" />
          </svg>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base font-semibold tracking-tight text-foreground">
                BlueStep
              </span>
              <span className="text-[13px] text-muted-foreground hidden sm:inline">
                Data Visualizer
              </span>
            </div>
            <p className="text-[13px] text-muted-foreground">
              Second-by-second step rate analysis and gamer excitement
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
              className="h-8 gap-2 border-border bg-card text-[13px] font-normal"
            >
              <span className="max-w-[150px] truncate sm:max-w-none text-foreground">
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
                <div className="absolute right-0 z-50 mt-1.5 w-72 rounded-lg border border-border bg-card p-1.5 shadow-md">
                  <div className="px-2.5 py-1.5 text-[13px] font-medium text-muted-foreground">
                    Select game session
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
                          className={`flex w-full items-start gap-2.5 rounded-md p-2 text-left text-[13px] transition-colors ${
                            isSelected
                              ? 'bg-muted text-foreground font-medium'
                              : 'text-foreground hover:bg-muted/60'
                          }`}
                        >
                          <div className="flex-1 min-w-0">
                            <div className="truncate font-medium">{preset.title}</div>
                            <div className="text-[13px] text-muted-foreground line-clamp-1">
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

          {/* Primary Action Button */}
          <Button
            variant="default"
            size="sm"
            onClick={onOpenUpload}
            className="h-8 gap-1.5 px-3 text-[13px] bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <Upload className="size-3.5" />
            <span>Load log</span>
          </Button>

          {/* Export CSV */}
          <Button
            variant="outline"
            size="sm"
            onClick={onExportCsv}
            className="h-8 px-2.5 text-[13px] gap-1.5 border-border"
          >
            <Download className="size-3.5" />
            <span className="hidden sm:inline">CSV</span>
          </Button>

          {/* Export JSON */}
          <Button
            variant="outline"
            size="sm"
            onClick={onExportJson}
            className="h-8 px-2.5 text-[13px] gap-1.5 border-border"
          >
            <FileCode className="size-3.5" />
            <span className="hidden sm:inline">JSON</span>
          </Button>

          {/* Theme Toggle */}
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleTheme}
            className="h-8 px-2 text-[13px] gap-1.5 text-muted-foreground hover:text-foreground"
            title="Toggle theme (Press 'D')"
          >
            {theme === 'dark' ? (
              <Sun className="size-3.5" />
            ) : (
              <Moon className="size-3.5" />
            )}
            <span className="hidden sm:inline">Theme</span>
          </Button>
        </div>
      </div>
    </header>
  )
}
