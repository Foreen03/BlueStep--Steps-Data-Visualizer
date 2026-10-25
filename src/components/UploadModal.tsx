import React, { useState, useId } from 'react'
import {
  Upload,
  FileText,
  AlertCircle,
  CheckCircle2,
  FileCode,
  Sparkles,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { parseRawLog, analyzeStepSession } from '@/lib/logParser'
import type { SessionAnalysis } from '@/types/stepData'

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
  const [activeTab, setActiveTab] = useState<'upload' | 'paste'>('upload')
  const [rawText, setRawText] = useState('')
  const [fileName, setFileName] = useState('')
  const [isDragging, setIsDragging] = useState(false)
  const [parseError, setParseError] = useState<string | null>(null)
  const [previewStats, setPreviewStats] = useState<{
    count: number
    durationSec: number
    totalSteps: number
  } | null>(null)

  const fileInputId = useId()

  const handleTextChange = (text: string, name = 'custom_log.txt') => {
    setRawText(text)
    setFileName(name)
    setParseError(null)

    if (!text.trim()) {
      setPreviewStats(null)
      return
    }

    try {
      const records = parseRawLog(text)
      if (records.length < 2) {
        setParseError('Log must contain at least 2 valid timestamped step records.')
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
      })
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to parse log file format.'
      setParseError(message)
      setPreviewStats(null)
    }
  }

  const handleFileUpload = (file: File) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const content = e.target?.result as string
      handleTextChange(content, file.name)
    }
    reader.onerror = () => {
      setParseError('Failed to read file.')
    }
    reader.readAsText(file)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0])
    }
  }

  const handleConfirm = () => {
    try {
      const records = parseRawLog(rawText)
      const session = analyzeStepSession(
        records,
        fileName ? fileName.replace(/\.[^/.]+$/, '') : 'Custom Game Session',
        fileName || 'custom_log.txt'
      )
      onSessionLoaded(session)
      onOpenChange(false)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error generating session telemetry.'
      setParseError(message)
    }
  }

  const loadExampleSnippet = () => {
    const now = Date.now()
    const sample = Array.from({ length: 40 }, (_, i) => {
      const steps = Math.floor(i * 1.8)
      const timestamp = now + i * 250
      return JSON.stringify({ steps, timestamp })
    }).join('\n')

    setActiveTab('paste')
    handleTextChange(sample, 'sample_burst.txt')
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Upload className="size-5 text-indigo-500" />
            Import Step Log Telemetry
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Upload your exercise game step logs to compute second-by-second cadence and visualize gamer excitement.
          </DialogDescription>
        </DialogHeader>

        {/* Tab switch */}
        <div className="flex border-b border-border/80">
          <button
            onClick={() => setActiveTab('upload')}
            className={`flex items-center gap-2 border-b-2 px-4 py-2 text-xs font-medium transition-colors ${
              activeTab === 'upload'
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <FileText className="size-3.5" />
            Upload File
          </button>
          <button
            onClick={() => setActiveTab('paste')}
            className={`flex items-center gap-2 border-b-2 px-4 py-2 text-xs font-medium transition-colors ${
              activeTab === 'paste'
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <FileCode className="size-3.5" />
            Paste Raw Log
          </button>
        </div>

        {/* Content Body */}
        <div className="space-y-4 py-2">
          {activeTab === 'upload' ? (
            <div
              onDragOver={(e) => {
                e.preventDefault()
                setIsDragging(true)
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              className={`flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-6 text-center transition-all ${
                isDragging
                  ? 'border-primary bg-primary/10'
                  : 'border-border/80 bg-muted/20 hover:border-border'
              }`}
            >
              <div className="rounded-full bg-primary/10 p-3 text-primary">
                <Upload className="size-6" />
              </div>
              <h4 className="mt-2 text-sm font-semibold text-foreground">
                Drag and drop your step log file here
              </h4>
              <p className="mt-1 text-xs text-muted-foreground">
                Supports .txt, .json, .log, and .csv with step & timestamp telemetry
              </p>

              <div className="mt-4">
                <input
                  type="file"
                  id={fileInputId}
                  className="hidden"
                  accept=".txt,.json,.log,.csv"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleFileUpload(e.target.files[0])
                    }
                  }}
                />
                <label htmlFor={fileInputId}>
                  <Button
                    variant="outline"
                    size="sm"
                    type="button"
                    className="cursor-pointer"
                    onClick={() => document.getElementById(fileInputId)?.click()}
                  >
                    Browse Files
                  </Button>
                </label>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Paste newline-delimited JSON or CSV lines:</span>
                <Button
                  variant="ghost"
                  size="xs"
                  onClick={loadExampleSnippet}
                  className="h-6 text-[11px] text-indigo-500 hover:text-indigo-600 gap-1"
                >
                  <Sparkles className="size-3" />
                  Load Sample Snippet
                </Button>
              </div>
              <textarea
                value={rawText}
                onChange={(e) => handleTextChange(e.target.value, 'pasted_log.txt')}
                placeholder={`{"steps": 0, "timestamp": 1792895611119}\n{"steps": 1, "timestamp": 1792895611245}\n{"steps": 2, "timestamp": 1792895612645}`}
                className="h-44 w-full rounded-xl border border-border bg-background p-3 font-mono text-xs outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              />
            </div>
          )}

          {/* Validation Feedback & Preview */}
          {parseError && (
            <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-2.5 text-xs text-destructive">
              <AlertCircle className="size-4 shrink-0" />
              <span>{parseError}</span>
            </div>
          )}

          {previewStats && (
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs space-y-1.5">
              <div className="flex items-center gap-1.5 font-semibold text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="size-4" />
                <span>Log parsed successfully!</span>
                {fileName && (
                  <Badge variant="outline" className="text-[10px] ml-auto">
                    {fileName}
                  </Badge>
                )}
              </div>
              <div className="grid grid-cols-3 gap-2 pt-1 font-mono text-muted-foreground text-[11px]">
                <div>Samples: <strong className="text-foreground">{previewStats.count}</strong></div>
                <div>Steps: <strong className="text-foreground">{previewStats.totalSteps}</strong></div>
                <div>Duration: <strong className="text-foreground">{previewStats.durationSec}s</strong></div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex flex-row items-center justify-end gap-2 pt-2">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            size="sm"
            disabled={!previewStats}
            onClick={handleConfirm}
            className="bg-indigo-600 hover:bg-indigo-700 text-white"
          >
            Load & Visualize
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
