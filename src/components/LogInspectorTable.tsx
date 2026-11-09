import React, { useState, useMemo } from "react"
import { Search, Download, ArrowUpDown, Clock, Film } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import type { SessionAnalysis, ExcitementZoneId } from "@/types/stepData"
import { EXCITEMENT_ZONES } from "@/types/stepData"

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
  const [viewMode, setViewMode] = useState<"frames" | "seconds">("frames")
  const [searchTerm, setSearchTerm] = useState("")
  const [zoneFilter, setZoneFilter] = useState<ExcitementZoneId | "all">("all")
  const [sortField, setSortField] = useState<
    "second" | "sps" | "steps" | "acceleration"
  >("second")
  const [sortAsc, setSortAsc] = useState(true)

  const filteredSecondsData = useMemo(() => {
    return session.secondsData
      .filter((row) => {
        const matchesSearch =
          row.timeFormatted.includes(searchTerm) ||
          row.second.toString().includes(searchTerm)
        const matchesZone = zoneFilter === "all" || row.zone === zoneFilter
        return matchesSearch && matchesZone
      })
      .sort((a, b) => {
        const valA = a[sortField]
        const valB = b[sortField]
        return sortAsc ? valA - valB : valB - valA
      })
  }, [session.secondsData, searchTerm, zoneFilter, sortField, sortAsc])

  const filteredFrameData = useMemo(() => {
    const records = session.frameRecords || []
    return records.filter((r) => {
      const matchesSearch =
        searchTerm === "" ||
        r.frameNumber.toString().includes(searchTerm) ||
        r.stepNumber.toString().includes(searchTerm) ||
        r.videoTime.includes(searchTerm)

      const matchesZone = zoneFilter === "all" || r.zone === zoneFilter
      return matchesSearch && matchesZone
    })
  }, [session.frameRecords, searchTerm, zoneFilter])

  const toggleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc)
    } else {
      setSortField(field)
    }
  }

  const exportCsv = () => {
    if (viewMode === "frames") {
      const headers = [
        "GameFrame",
        "VideoTime",
        "VideoTimeMs",
        "StepNumber",
        "StepDelta",
        "CumulativeDelta",
        "DeltaIntervalMs",
        "InstantaneousSPS",
        "ExcitementZone",
      ]
      const rows = (session.frameRecords || []).map((r) => [
        r.frameNumber,
        r.videoTime,
        r.videoTimeMs,
        r.stepNumber,
        r.stepDelta,
        r.cumulativeDelta,
        r.deltaMs,
        r.instantaneousSps,
        r.zone,
      ])
      const csvContent =
        "data:text/csv;charset=utf-8," +
        [headers.join(","), ...rows.map((e) => e.join(","))].join("\n")
      const encodedUri = encodeURI(csvContent)
      const link = document.createElement("a")
      link.setAttribute("href", encodedUri)
      link.setAttribute(
        "download",
        `${session.fileName.replace(/\.[^/.]+$/, "")}_game_frames.csv`
      )
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } else {
      const headers = [
        "Second",
        "TimeFormatted",
        "TimestampMs",
        "StepsInSecond(SPS)",
        "CumulativeSteps",
        "Rolling3sSPS",
        "Acceleration",
        "ExcitementZone",
        "ExcitementScore",
        "StartFrame",
        "EndFrame",
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
        d.frameStart ?? "",
        d.frameEnd ?? "",
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
  }

  return (
    <div className="space-y-4 rounded-lg border border-border bg-card p-4 sm:p-6">
      {/* Table Header */}
      <div className="flex flex-col gap-3 border-b border-border pb-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-semibold text-foreground">
              {viewMode === "frames"
                ? "Game frame step log"
                : "Second-by-second telemetry records"}
            </h3>
            <Badge variant="outline" className="font-mono text-xs">
              {viewMode === "frames"
                ? `${filteredFrameData.length} Frame Events`
                : `${filteredSecondsData.length} Seconds`}
            </Badge>
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {viewMode === "frames"
              ? "Exact video frames corresponding to controller step events"
              : "Binned 1.0-second telemetry stream with instantaneous cadence and acceleration"}
          </p>
        </div>

        {/* View Switcher & Export */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Mode toggle */}
          <div className="flex items-center rounded-md border border-border bg-muted/30 p-0.5 text-xs">
            <button
              onClick={() => setViewMode("frames")}
              className={`flex items-center gap-1.5 rounded px-2.5 py-1 font-medium transition-colors ${
                viewMode === "frames"
                  ? "bg-card text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Film className="size-3.5" />
              <span>Game Frames</span>
            </button>
            <button
              onClick={() => setViewMode("seconds")}
              className={`flex items-center gap-1.5 rounded px-2.5 py-1 font-medium transition-colors ${
                viewMode === "seconds"
                  ? "bg-card text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Clock className="size-3.5" />
              <span>1s Binned</span>
            </button>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={exportCsv}
            className="h-8 gap-1.5 border-border text-xs text-muted-foreground hover:text-foreground"
          >
            <Download className="size-3.5" />
            <span>Export CSV</span>
          </Button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex max-w-sm flex-1 items-center gap-2">
          <div className="relative w-full">
            <Search className="absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder={
                viewMode === "frames"
                  ? "Search frame #, step #, or time..."
                  : "Search seconds (e.g. 12 or 00:15)..."
              }
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-8 w-full rounded-md border border-border bg-background pr-3 pl-8 text-xs outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>

        {/* Zone Filters */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="mr-1 text-xs text-muted-foreground">Zone:</span>
          <button
            onClick={() => setZoneFilter("all")}
            className={`rounded px-2.5 py-1 text-xs transition-colors ${
              zoneFilter === "all"
                ? "bg-primary font-medium text-primary-foreground"
                : "bg-muted/40 text-muted-foreground hover:text-foreground"
            }`}
          >
            All
          </button>
          {(Object.keys(EXCITEMENT_ZONES) as ExcitementZoneId[]).map((zid) => {
            const z = EXCITEMENT_ZONES[zid]
            return (
              <button
                key={zid}
                onClick={() => setZoneFilter(zid)}
                className={`flex items-center gap-1 rounded px-2.5 py-1 text-xs transition-colors ${
                  zoneFilter === zid
                    ? "border border-border bg-card font-semibold text-foreground shadow-xs"
                    : "bg-muted/40 text-muted-foreground hover:text-foreground"
                }`}
              >
                <span
                  className="size-1.5 rounded-full"
                  style={{ backgroundColor: z.color }}
                />
                <span>{z.name}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* View 1: Game Frame Events Table */}
      {viewMode === "frames" && (
        <div className="max-h-[500px] overflow-x-auto rounded-lg border border-border">
          <table className="w-full border-collapse text-left font-mono text-xs">
            <thead className="sticky top-0 z-10 border-b border-border bg-muted/90 font-sans text-muted-foreground backdrop-blur-xs">
              <tr>
                <th className="px-3.5 py-2.5 font-medium">Game Frame #</th>
                <th className="px-3.5 py-2.5 font-medium">Video Time</th>
                <th className="px-3.5 py-2.5 font-medium">Step Count</th>
                <th className="px-3.5 py-2.5 font-medium">Frame Delta</th>
                <th className="px-3.5 py-2.5 font-medium">Interval (ms)</th>
                <th className="px-3.5 py-2.5 font-medium">Instantaneous SPS</th>
                <th className="px-3.5 py-2.5 font-medium">Excitement Zone</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {filteredFrameData.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="py-8 text-center font-sans text-xs text-muted-foreground"
                  >
                    No game frame step events match your search.
                  </td>
                </tr>
              ) : (
                filteredFrameData.map((rec) => {
                  const z = EXCITEMENT_ZONES[rec.zone]
                  const isCurrent =
                    Math.floor(rec.videoTimeMs / 1000) === selectedSecond

                  return (
                    <tr
                      key={`${rec.frameNumber}-${rec.stepNumber}`}
                      onClick={() =>
                        onSelectSecond(Math.floor(rec.videoTimeMs / 1000))
                      }
                      className={`cursor-pointer transition-colors ${
                        isCurrent
                          ? "bg-accent/15 font-semibold text-accent"
                          : "text-foreground hover:bg-muted/30"
                      }`}
                    >
                      <td className="px-3.5 py-2 font-bold">
                        Frame #{rec.frameNumber}
                      </td>
                      <td className="px-3.5 py-2 text-muted-foreground tabular-nums">
                        {rec.videoTime}
                      </td>
                      <td className="px-3.5 py-2 font-semibold">
                        Step #{rec.stepNumber}
                      </td>
                      <td className="px-3.5 py-2">
                        <span className="rounded bg-emerald-500/10 px-1.5 py-0.5 font-medium text-emerald-600 dark:text-emerald-400">
                          +{rec.stepDelta} step{rec.stepDelta > 1 ? "s" : ""}
                        </span>
                      </td>
                      <td className="px-3.5 py-2 text-muted-foreground tabular-nums">
                        {rec.deltaMs} ms
                      </td>
                      <td className="px-3.5 py-2 font-medium tabular-nums">
                        {rec.instantaneousSps} SPS (~
                        {Math.round(rec.instantaneousSps * 60)} SPM)
                      </td>
                      <td className="px-3.5 py-2">
                        <span
                          className="inline-flex items-center gap-1 font-sans text-[11px] font-medium"
                          style={{ color: z.color }}
                        >
                          <span
                            className="size-1.5 rounded-full"
                            style={{ backgroundColor: z.color }}
                          />
                          {z.name}
                        </span>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* View 2: Second-by-Second Binned Telemetry Table */}
      {viewMode === "seconds" && (
        <div className="max-h-[500px] overflow-x-auto rounded-lg border border-border">
          <table className="w-full border-collapse text-left font-mono text-xs">
            <thead className="sticky top-0 z-10 border-b border-border bg-muted/90 font-sans text-muted-foreground backdrop-blur-xs">
              <tr>
                <th
                  onClick={() => toggleSort("second")}
                  className="cursor-pointer px-3.5 py-2.5 font-medium hover:text-foreground"
                >
                  <div className="flex items-center gap-1">
                    <span>Second</span>
                    <ArrowUpDown className="size-3" />
                  </div>
                </th>
                <th className="px-3.5 py-2.5 font-medium">Video Time</th>
                <th className="px-3.5 py-2.5 font-medium">Frame Range</th>
                <th
                  onClick={() => toggleSort("sps")}
                  className="cursor-pointer px-3.5 py-2.5 font-medium hover:text-foreground"
                >
                  <div className="flex items-center gap-1">
                    <span>SPS (Steps)</span>
                    <ArrowUpDown className="size-3" />
                  </div>
                </th>
                <th
                  onClick={() => toggleSort("steps")}
                  className="cursor-pointer px-3.5 py-2.5 font-medium hover:text-foreground"
                >
                  <div className="flex items-center gap-1">
                    <span>Cumulative</span>
                    <ArrowUpDown className="size-3" />
                  </div>
                </th>
                <th className="px-3.5 py-2.5 font-medium">3s Moving SPS</th>
                <th
                  onClick={() => toggleSort("acceleration")}
                  className="cursor-pointer px-3.5 py-2.5 font-medium hover:text-foreground"
                >
                  <div className="flex items-center gap-1">
                    <span>Acceleration</span>
                    <ArrowUpDown className="size-3" />
                  </div>
                </th>
                <th className="px-3.5 py-2.5 font-medium">Excitement Zone</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {filteredSecondsData.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="py-8 text-center font-sans text-xs text-muted-foreground"
                  >
                    No seconds match your search criteria.
                  </td>
                </tr>
              ) : (
                filteredSecondsData.map((row) => {
                  const z = EXCITEMENT_ZONES[row.zone]
                  const isSelected = selectedSecond === row.second

                  return (
                    <tr
                      key={row.second}
                      onClick={() => onSelectSecond(row.second)}
                      className={`cursor-pointer transition-colors ${
                        isSelected
                          ? "bg-accent/15 font-semibold text-accent"
                          : "text-foreground hover:bg-muted/30"
                      }`}
                    >
                      <td className="px-3.5 py-2 font-medium">{row.second}s</td>
                      <td className="px-3.5 py-2 text-muted-foreground tabular-nums">
                        {row.timeFormatted}
                      </td>
                      <td className="px-3.5 py-2 text-muted-foreground tabular-nums">
                        {row.frameStart !== undefined
                          ? `Frames ${row.frameStart}-${row.frameEnd}`
                          : "-"}
                      </td>
                      <td className="px-3.5 py-2 font-semibold tabular-nums">
                        {row.sps} sps
                      </td>
                      <td className="px-3.5 py-2 text-muted-foreground tabular-nums">
                        {row.steps} steps
                      </td>
                      <td className="px-3.5 py-2 tabular-nums">
                        {row.rollingSps3s.toFixed(1)} sps
                      </td>
                      <td className="px-3.5 py-2 font-medium tabular-nums">
                        <span
                          className={
                            row.acceleration > 0
                              ? "text-foreground"
                              : row.acceleration < 0
                                ? "text-destructive"
                                : "text-muted-foreground"
                          }
                        >
                          {row.acceleration > 0
                            ? `+${row.acceleration}`
                            : row.acceleration}
                        </span>
                      </td>
                      <td className="px-3.5 py-2">
                        <span
                          className="inline-flex items-center gap-1 font-sans text-[11px] font-medium"
                          style={{ color: z.color }}
                        >
                          <span
                            className="size-1.5 rounded-full"
                            style={{ backgroundColor: z.color }}
                          />
                          {z.name}
                        </span>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
