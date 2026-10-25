import React, { useState, useMemo } from 'react'
import {
  Search,
  Filter,
  Download,
  Flame,
  ArrowUpDown,
  ExternalLink,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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
    link.setAttribute('download', `${session.fileName.replace(/\.[^/.]+$/, '')}_1s_cadence.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <Card className="border-border/80 bg-card/80 backdrop-blur-sm shadow-sm">
      <CardHeader className="flex flex-col gap-3 pb-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle className="text-base flex items-center gap-2">
            Second-by-Second Telemetry Inspector
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Complete high-resolution telemetry log binned into exact 1.0-second intervals
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={exportCsv}
            className="gap-1.5 text-xs border-border"
          >
            <Download className="size-3.5" />
            <span>Download CSV</span>
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Search & Filters */}
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          {/* Search box */}
          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <Search className="absolute left-2.5 top-2.5 size-3.5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search time (e.g. 00:15 or 15)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-8 w-full rounded-lg border border-border bg-background pl-8 pr-3 text-xs outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </div>

          {/* Zone filter */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] font-medium text-muted-foreground flex items-center gap-1">
              <Filter className="size-3" />
              Zone:
            </span>
            <Button
              variant={zoneFilter === 'all' ? 'default' : 'ghost'}
              size="xs"
              onClick={() => setZoneFilter('all')}
              className="text-[10px] h-6 px-2"
            >
              All ({session.secondsData.length})
            </Button>
            {(Object.keys(EXCITEMENT_ZONES) as ExcitementZoneId[]).map((zoneId) => {
              const count = session.secondsData.filter((s) => s.zone === zoneId).length
              if (count === 0) return null
              const info = EXCITEMENT_ZONES[zoneId]
              const isSelected = zoneFilter === zoneId

              return (
                <Button
                  key={zoneId}
                  variant={isSelected ? 'default' : 'outline'}
                  size="xs"
                  onClick={() => setZoneFilter(zoneId)}
                  className="text-[10px] h-6 px-2 gap-1 border-border/80"
                  style={{
                    backgroundColor: isSelected ? info.color : undefined,
                    color: isSelected ? '#ffffff' : undefined,
                  }}
                >
                  <span
                    className="size-1.5 rounded-full"
                    style={{ backgroundColor: isSelected ? '#ffffff' : info.color }}
                  />
                  <span>{info.name.split('/')[0]}</span>
                  <span className="opacity-75">({count})</span>
                </Button>
              )
            })}
          </div>
        </div>

        {/* Data Table */}
        <div className="rounded-xl border border-border overflow-hidden">
          <div className="max-h-96 overflow-y-auto">
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 z-10 border-b border-border bg-muted/80 backdrop-blur-sm text-muted-foreground uppercase text-[10px] tracking-wider">
                <tr>
                  <th
                    className="p-2.5 font-semibold cursor-pointer hover:text-foreground"
                    onClick={() => toggleSort('second')}
                  >
                    <div className="flex items-center gap-1">
                      Time (s)
                      <ArrowUpDown className="size-3" />
                    </div>
                  </th>
                  <th
                    className="p-2.5 font-semibold cursor-pointer hover:text-foreground"
                    onClick={() => toggleSort('sps')}
                  >
                    <div className="flex items-center gap-1">
                      Cadence (SPS)
                      <ArrowUpDown className="size-3" />
                    </div>
                  </th>
                  <th
                    className="p-2.5 font-semibold cursor-pointer hover:text-foreground"
                    onClick={() => toggleSort('steps')}
                  >
                    <div className="flex items-center gap-1">
                      Cumulative
                      <ArrowUpDown className="size-3" />
                    </div>
                  </th>
                  <th
                    className="p-2.5 font-semibold cursor-pointer hover:text-foreground"
                    onClick={() => toggleSort('acceleration')}
                  >
                    <div className="flex items-center gap-1">
                      Acceleration
                      <ArrowUpDown className="size-3" />
                    </div>
                  </th>
                  <th className="p-2.5 font-semibold">Excitement Zone</th>
                  <th className="p-2.5 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50 bg-card/40">
                {filteredData.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-6 text-center text-muted-foreground">
                      No seconds matched your search or filter.
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
                        className={`transition-colors cursor-pointer hover:bg-muted/50 ${
                          isSelected ? 'bg-primary/10 font-medium' : ''
                        }`}
                      >
                        <td className="p-2.5 font-mono">
                          <span className="font-semibold text-foreground">{row.timeFormatted}</span>
                          <span className="ml-1 text-[10px] text-muted-foreground">({row.second}s)</span>
                        </td>
                        <td className="p-2.5">
                          <div className="flex items-center gap-1.5">
                            <span
                              className="font-mono text-sm font-bold"
                              style={{ color: zone.color }}
                            >
                              {row.sps}
                            </span>
                            <span className="text-[10px] text-muted-foreground">steps/s</span>
                            {row.sps >= 4 && (
                              <Flame className="size-3 text-rose-500 animate-pulse" />
                            )}
                          </div>
                        </td>
                        <td className="p-2.5 font-mono text-muted-foreground">
                          <strong className="text-foreground">{row.steps}</strong> steps
                        </td>
                        <td className="p-2.5 font-mono text-[11px]">
                          <span
                            className={
                              row.acceleration > 0
                                ? 'text-emerald-500 font-semibold'
                                : row.acceleration < 0
                                ? 'text-rose-400 font-medium'
                                : 'text-muted-foreground'
                            }
                          >
                            {row.acceleration > 0 ? `+${row.acceleration}` : row.acceleration} SPS/s
                          </span>
                        </td>
                        <td className="p-2.5">
                          <Badge
                            variant="outline"
                            className="text-[10px] border"
                            style={{
                              borderColor: `${zone.color}50`,
                              backgroundColor: `${zone.color}15`,
                              color: zone.color,
                            }}
                          >
                            {zone.name}
                          </Badge>
                        </td>
                        <td className="p-2.5 text-right">
                          <Button
                            variant="ghost"
                            size="icon-xs"
                            onClick={(e) => {
                              e.stopPropagation()
                              onSelectSecond(row.second)
                            }}
                            title="Scrub to this second in Replay"
                          >
                            <ExternalLink className="size-3 text-muted-foreground hover:text-foreground" />
                          </Button>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex items-center justify-between text-[11px] text-muted-foreground px-1">
          <span>Showing {filteredData.length} of {session.secondsData.length} seconds</span>
          <span>Click any row to scrub replay simulator</span>
        </div>
      </CardContent>
    </Card>
  )
}
