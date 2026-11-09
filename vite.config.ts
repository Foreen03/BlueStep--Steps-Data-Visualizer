import fs from "node:fs"
import path from "node:path"
import { resolve } from "node:path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig, type Plugin } from "vite"

interface ServerSessionEntry {
  sessionId: string
  title: string
  createdTime: number
  hasVideo: boolean
  hasSummary: boolean
  hasSteps: boolean
  hasSrt: boolean
  videoFile: string | null
  summaryFile: string | null
  stepsFile: string | null
  srtFile: string | null
  videoUrl?: string
  summaryUrl?: string
  stepsUrl?: string
  srtUrl?: string
  durationMs?: number
  duration?: string
  totalRecords?: number
  initialSteps?: number
  finalSteps?: number
  deltaSteps?: number
  startTimeUtc?: string
  endTimeUtc?: string
}

function pcServerRecordingsPlugin(): Plugin {
  const defaultRecordingsDir =
    "C:\\Program Files (x86)\\PCServer_YHY\\recordings"

  return {
    name: "pcserver-recordings-server",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (!req.url) {
          return next()
        }

        const urlObj = new URL(
          req.url,
          `http://${req.headers.host || "localhost"}`
        )
        const pathname = urlObj.pathname

        if (pathname === "/api/recordings" || pathname === "/api/recordings/") {
          const dir = urlObj.searchParams.get("dir") || defaultRecordingsDir
          if (!fs.existsSync(dir)) {
            res.writeHead(200, { "Content-Type": "application/json" })
            res.end(
              JSON.stringify({
                directory: dir,
                sessions: [],
                error: "Directory not found",
              })
            )
            return
          }

          try {
            const files = fs.readdirSync(dir)
            const sessionMap = new Map<string, ServerSessionEntry>()

            for (const file of files) {
              const fullPath = path.join(dir, file)
              const stat = fs.statSync(fullPath)
              if (stat.isDirectory()) continue

              let sessionId = ""
              if (file.endsWith(".mp4")) {
                sessionId = file.replace(/\.mp4$/, "")
              } else if (file.endsWith("_summary.json")) {
                sessionId = file.replace(/_summary\.json$/, "")
              } else if (file.endsWith("_steps.txt")) {
                sessionId = file.replace(/_steps\.txt$/, "")
              } else if (file.endsWith(".srt")) {
                sessionId = file.replace(/\.srt$/, "")
              }

              if (!sessionId) continue

              if (!sessionMap.has(sessionId)) {
                sessionMap.set(sessionId, {
                  sessionId,
                  title: sessionId
                    .replace(/^session_/, "Session ")
                    .replace(/_/, " "),
                  createdTime: stat.mtimeMs,
                  hasVideo: false,
                  hasSummary: false,
                  hasSteps: false,
                  hasSrt: false,
                  videoFile: null,
                  summaryFile: null,
                  stepsFile: null,
                  srtFile: null,
                })
              }

              const entry = sessionMap.get(sessionId)
              if (!entry) continue

              if (file.endsWith(".mp4")) {
                entry.hasVideo = true
                entry.videoFile = file
                entry.videoUrl = `/api/recordings/${sessionId}/video`
              } else if (file.endsWith("_summary.json")) {
                entry.hasSummary = true
                entry.summaryFile = file
                entry.summaryUrl = `/api/recordings/${sessionId}/summary`
                try {
                  const summaryText = fs
                    .readFileSync(fullPath, "utf8")
                    .replace(/^\uFEFF/, "")
                  const summaryJson = JSON.parse(summaryText)
                  entry.durationMs = summaryJson.durationMs
                  entry.duration = summaryJson.duration
                  entry.totalRecords = summaryJson.totalRecords
                  entry.initialSteps = summaryJson.initialSteps
                  entry.finalSteps = summaryJson.finalSteps
                  entry.deltaSteps = summaryJson.deltaSteps
                  entry.startTimeUtc = summaryJson.startTimeUtc
                  entry.endTimeUtc = summaryJson.endTimeUtc
                } catch {
                  // ignore
                }
              } else if (file.endsWith("_steps.txt")) {
                entry.hasSteps = true
                entry.stepsFile = file
                entry.stepsUrl = `/api/recordings/${sessionId}/steps`
              } else if (file.endsWith(".srt")) {
                entry.hasSrt = true
                entry.srtFile = file
                entry.srtUrl = `/api/recordings/${sessionId}/srt`
              }
            }

            const sessions = Array.from(sessionMap.values()).sort(
              (a, b) => b.createdTime - a.createdTime
            )
            res.writeHead(200, { "Content-Type": "application/json" })
            res.end(JSON.stringify({ directory: dir, sessions }))
            return
          } catch (err: unknown) {
            const message = err instanceof Error ? err.message : String(err)
            res.writeHead(500, { "Content-Type": "application/json" })
            res.end(JSON.stringify({ error: message }))
            return
          }
        }

        const match = pathname.match(
          /^\/api\/recordings\/([^/]+)\/(video|summary|steps|srt)$/
        )
        if (match) {
          const [, sessionId, fileType] = match
          const dir = urlObj.searchParams.get("dir") || defaultRecordingsDir

          let targetFile = ""
          let contentType = "application/octet-stream"

          if (fileType === "video") {
            targetFile = path.join(dir, `${sessionId}.mp4`)
            contentType = "video/mp4"
          } else if (fileType === "summary") {
            targetFile = path.join(dir, `${sessionId}_summary.json`)
            contentType = "application/json; charset=utf-8"
          } else if (fileType === "steps") {
            targetFile = path.join(dir, `${sessionId}_steps.txt`)
            contentType = "text/plain; charset=utf-8"
          } else if (fileType === "srt") {
            targetFile = path.join(dir, `${sessionId}.srt`)
            contentType = "text/plain; charset=utf-8"
          }

          if (!fs.existsSync(targetFile)) {
            res.writeHead(404, { "Content-Type": "text/plain" })
            res.end(`File not found: ${targetFile}`)
            return
          }

          const stat = fs.statSync(targetFile)
          const fileSize = stat.size

          if (fileType === "video") {
            const range = req.headers.range
            if (range) {
              const parts = range.replace(/bytes=/, "").split("-")
              const start = parseInt(parts[0], 10)
              const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1
              const chunkSize = end - start + 1
              const fileStream = fs.createReadStream(targetFile, { start, end })

              res.writeHead(206, {
                "Content-Range": `bytes ${start}-${end}/${fileSize}`,
                "Accept-Ranges": "bytes",
                "Content-Length": chunkSize,
                "Content-Type": contentType,
              })
              fileStream.pipe(res)
              return
            } else {
              res.writeHead(200, {
                "Content-Length": fileSize,
                "Content-Type": contentType,
                "Accept-Ranges": "bytes",
              })
              fs.createReadStream(targetFile).pipe(res)
              return
            }
          } else {
            const content = fs
              .readFileSync(targetFile, "utf8")
              .replace(/^\uFEFF/, "")
            res.writeHead(200, {
              "Content-Type": contentType,
              "Content-Length": Buffer.byteLength(content, "utf8"),
            })
            res.end(content)
            return
          }
        }

        next()
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), pcServerRecordingsPlugin()],
  resolve: {
    alias: {
      "@": resolve(import.meta.dirname, "./src"),
    },
  },
})
