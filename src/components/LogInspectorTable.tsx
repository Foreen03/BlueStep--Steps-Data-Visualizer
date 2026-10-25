import React, { useState, useMemo } from 'react'
import {
  Search,
  Download,
  ArrowUpDown,
  ExternalLink,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { SessionAnalysis, ExcitementZoneId } from '@/types/stepData'
import { EXCITEMENT_ZONES } from '@/types/stepData'

interface LogInspectorTableProps {
  session: SessionAnalysis
  onSelectSecond: (second: number) => void
  selectedSecond: number
}

export const LogInspectorTable: React.FC<LogInspectorTableProps> = ({
  session,
  onSelectSecond,
  selectedSecond,
}) => {
  const [searchTerm, setSearchTerm] = useState('')
  const [zoneFilter, setZoneFilter] = useState<ExcitementZoneId | 'all'>('all')
  const [sortField, setSortField] = useState<'second' | 'sps' | 'steps' | 'acceleration'>('second')
  const [sortAsc, setSortAsc] = useState(true)

  const filteredData = useMemo(() => {
    return session.secondsData
      .filter((row) => {
        const matchesSearch =
          row.timeFormatted.includes(searchTerm) ||
          row.second.toString().includes(searchTerm)
        const matchesZone = zoneFilter === 'all' || row.zone === zoneFilter
        return matchesSearch && matchesZone
      })
      .sort((a, b) => {
        let valA = a[sortField]
        let valB = b[sortField]
        return sortAsc ? valA - valB : valB - valA
      })
  }, [session.secondsData, searchTerm, zoneFilter, sortField, sortAsc])

  const toggleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc)
    } else {
      setSortField(field)
      setSortAsc(false)
    }
  }

  const exportCsv = () => {
    const headers = [
      'Second',
      'TimeFormatted',
      'TimestampMs',
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
      d.timestamp,
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

  return (
    <div className="rounded-lg border border-border bg-card p-4 sm:p-6 space-y-4">
      {/* Table Header */}
      <div className="flex flex-col gap-3 pb-3 border-b border-border sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-base font-semibold text-foreground">
            Second-by-second telemetry records
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Binned telemetry stream with instantaneous cadence and acceleration
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={exportCsv}
          className="h-8 gap-1.5 text-xs border-border"
        >
          <Download className="size-3.5" />
          <span>Download CSV</span>
        </Button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative min-w-[200px] max-w-xs">
          <Search className="absolute left-2.5 top-2.5 size-3.5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Filter second (e.g. 00:15 or 15)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="h-8 w-full rounded-md border border-border bg-background pl-8 pr-3 text-[13px] outline-none focus:border-accent"
          />
        </div>

        {/* Zone Filter Chips */}
        <div className="flex items-center gap-1.5 flex-wrap text-[13px]">
          <span className="text-muted-foreground mr-1">Zone:</span>
          <button
            onClick={() => setZoneFilter('all')}
            className={`px-2 py-0.5 rounded-sm transition-colors ${
              zoneFilter === 'all'
                ? 'bg-muted text-foreground font-medium'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            All ({session.secondsData.length})
          </button>
          {(Object.keys(EXCITEMENT_ZONES) as ExcitementZoneId[]).map((zoneId) => {
            const count = session.secondsData.filter((s) => s.zone === zoneId).length
            if (count === 0) return null
            const info = EXCITEMENT_ZONES[zoneId]
            const isSelected = zoneFilter === zoneId

            return (
              <button
                key={zoneId}
                onClick={() => setZoneFilter(zoneId)}
                className={`flex items-center gap-1.5 px-2 py-0.5 rounded-sm transition-colors ${
                  isSelected
                    ? 'bg-muted text-foreground font-medium'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <span className="size-2 rounded-xs" style={{ backgroundColor: info.color }} />
                <span>{info.name}</span>
                <span className="text-muted-foreground font-mono tabular-nums">({count})</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Table Element */}
      <div className="rounded-md border border-border overflow-hidden">
        <div className="max-h-96 overflow-y-auto">
          <table className="w-full text-left text-[13px] tabular-nums">
            <thead className="sticky top-0 z-10 border-b border-border bg-muted text-muted-foreground text-[13px] font-normal">
              <tr>
                <th
                  className="p-2.5 font-medium cursor-pointer hover:text-foreground"
                  onClick={() => toggleSort('second')}
                >
                  <div className="flex items-center gap-1">
                    Time (s)
                    <ArrowUpDown className="size-3" />
                  </div>
                </th>
                <th
                  className="p-2.5 font-medium text-right cursor-pointer hover:text-foreground"
                  onClick={() => toggleSort('sps')}
                >
                  <div className="flex items-center justify-end gap-1">
                    Cadence (sps)
                    <ArrowUpDown className="size-3" />
                  </div>
                </th>
                <th
                  className="p-2.5 font-medium text-right cursor-pointer hover:text-foreground"
                  onClick={() => toggleSort('steps')}
                >
                  <div className="flex items-center justify-end gap-1">
                    Cumulative steps
                    <ArrowUpDown className="size-3" />
                  </div>
                </th>
                <th
                  className="p-2.5 font-medium text-right cursor-pointer hover:text-foreground"
                  onClick={() => toggleSort('acceleration')}
                >
                  <div className="flex items-center justify-end gap-1">
                    Acceleration
                    <ArrowUpDown className="size-3" />
                  </div>
                </th>
                <th className="p-2.5 font-medium">Zone</th>
                <th className="p-2.5 font-medium text-right">Scrub</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60 bg-card">
              {filteredData.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-muted-foreground">
                    No records matched your search filter.
                  </td>
                </tr>
              ) : (
                filteredData.map((row) => {
                  const zone = EXCITEMENT_ZONES[row.zone]
                  const isSelected = selectedSecond === row.second

                  return (
                    <tr
                      key={row.second}
                      onClick={() => onSelectSecond(row.second)}
                      className={`transition-colors cursor-pointer hover:bg-muted/40 ${
                        isSelected ? 'bg-muted/70 font-medium' : ''
                      }`}
                    >
                      <td className="p-2.5 font-mono">
                        <span className="text-foreground">{row.timeFormatted}</span>
                        <span className="ml-1 text-muted-foreground">({row.second}s)</span>
                      </td>
                      <td className="p-2.5 text-right font-mono font-medium" style={{ color: zone.color }}>
                        {row.sps}
                      </td>
                      <td className="p-2.5 text-right font-mono text-muted-foreground">
                        {row.steps}
                      </td>
                      <td className="p-2.5 text-right font-mono">
                        <span
                          className={
                            row.acceleration > 0
                              ? 'text-foreground'
                              : row.acceleration < 0
                              ? 'text-destructive'
                              : 'text-muted-foreground'
                          }
                        >
                          {row.acceleration > 0 ? `+${row.acceleration}` : row.acceleration}
                        </span>
                      </td>
                      <td className="p-2.5">
                        <div className="flex items-center gap-1.5">
                          <span className="size-1.5 rounded-full" style={{ backgroundColor: zone.color }} />
                          <span>{zone.name}</span>
                        </div>
                      </td>
                      <td className="p-2.5 text-right">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            onSelectSecond(row.second)
                          }}
                          className="text-muted-foreground hover:text-foreground inline-flex items-center p-1"
                          title="Jump to this second in simulator"
                        >
                          <ExternalLink className="size-3.5" />
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>Showing {filteredData.length} of {session.secondsData.length} records</span>
        <span>Click row to jump playback to that second</span>
      </div>
    </div>
  )
}
