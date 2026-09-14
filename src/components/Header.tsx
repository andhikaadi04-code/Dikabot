import React, { useState } from "react"
import { Music, Radio, Sparkles, BookOpen, Key, Download, CheckCircle2, Loader2, AlertCircle } from "lucide-react"

interface HeaderProps {
  endpoint: string
  hasToken: boolean
  activeView: "preview" | "docs"
  setActiveView: (view: "preview" | "docs") => void
}

export const Header: React.FC<HeaderProps> = ({
  endpoint,
  hasToken,
  activeView,
  setActiveView
}) => {
  const [downloading, setDownloading] = useState(false)
  const [downloadStatus, setDownloadStatus] = useState<string | null>(null)
  const [isSuccess, setIsSuccess] = useState(false)

  const handleDownloadZip = async () => {
    try {
      setDownloading(true)
      setDownloadStatus("Membuat zip binary...")
      setIsSuccess(false)

      const res = await fetch("/api/download-zip-base64")
      if (!res.ok) throw new Error("Gagal mengambil file dari server")
      
      const data = await res.json()
      if (!data.base64) throw new Error("Data zip tidak ditemukan")

      // Decode base64 to real binary bytes in browser memory
      const binaryStr = window.atob(data.base64)
      const len = binaryStr.length
      const bytes = new Uint8Array(len)
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryStr.charCodeAt(i)
      }

      // Check ZIP magic header (0x50 0x4b = 'PK')
      if (bytes[0] !== 0x50 || bytes[1] !== 0x4b) {
        throw new Error("Format file bukan ZIP valid")
      }

      // Create pure binary ZIP blob
      const blob = new Blob([bytes], { type: "application/zip" })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.style.display = "none"
      a.href = url
      a.download = data.filename || "masdik75-whatsapp-player.zip"
      document.body.appendChild(a)
      a.click()

      setTimeout(() => {
        window.URL.revokeObjectURL(url)
        a.remove()
      }, 2000)

      setIsSuccess(true)
      setDownloadStatus(`Tersimpan: ${data.filename} (${Math.round(len / 1024)} KB)`)
      setTimeout(() => {
        setDownloadStatus(null)
      }, 4000)
    } catch (err: any) {
      console.error("Download error:", err)
      setIsSuccess(false)
      setDownloadStatus(err.message || "Gagal mengunduh ZIP")
      setTimeout(() => {
        setDownloadStatus(null)
      }, 4000)
    } finally {
      setDownloading(false)
    }
  }

  return (
    <header className="border-b border-zinc-200 bg-white sticky top-0 z-30 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-sm">
            <Music className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-zinc-900 tracking-tight">
                SnowKit WhatsApp Player
              </h1>
              <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                v3.2.0
              </span>
            </div>
            <p className="text-xs text-zinc-500">
              Interactive Rich HTML Music Player for WhatsApp Bots (Baileys & Zapo)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Endpoint badge */}
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-100 border border-zinc-200 text-xs text-zinc-600">
            <Radio className="w-3.5 h-3.5 text-zinc-500" />
            <span className="truncate max-w-[150px] font-mono">{endpoint}</span>
          </div>

          {/* Token Status */}
          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border ${
            hasToken
              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
              : "bg-amber-50 text-amber-700 border-amber-200"
          }`}>
            <Key className="w-3.5 h-3.5" />
            <span>{hasToken ? "API Token Active" : "Simulated / Demo Mode"}</span>
          </div>

          {/* Navigation view toggle */}
          <div className="flex rounded-lg bg-zinc-100 p-0.5 border border-zinc-200">
            <button
              onClick={() => setActiveView("preview")}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors flex items-center gap-1.5 ${
                activeView === "preview"
                  ? "bg-white text-zinc-900 shadow-xs"
                  : "text-zinc-600 hover:text-zinc-900"
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Studio & Test</span>
            </button>
            <button
              onClick={() => setActiveView("docs")}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors flex items-center gap-1.5 ${
                activeView === "docs"
                  ? "bg-white text-zinc-900 shadow-xs"
                  : "text-zinc-600 hover:text-zinc-900"
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Docs & Code</span>
            </button>
          </div>

          {/* Direct ZIP Download */}
          <button
            onClick={handleDownloadZip}
            disabled={downloading}
            className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
            title="Download file ZIP proyek asli"
          >
            {downloading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
            ) : (
              <Download className="w-3.5 h-3.5 text-emerald-100" />
            )}
            <span>{downloading ? "Mengunduh..." : "Download ZIP"}</span>
          </button>
        </div>
      </div>

      {/* Download Status Toast / Notification */}
      {downloadStatus && (
        <div className={`px-4 py-2 border-t text-xs flex items-center justify-between ${
          isSuccess 
            ? "bg-emerald-50 text-emerald-800 border-emerald-200" 
            : "bg-amber-50 text-amber-800 border-amber-200"
        }`}>
          <div className="max-w-7xl mx-auto w-full flex items-center justify-between">
            <div className="flex items-center gap-2">
              {isSuccess ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              ) : (
                <AlertCircle className="w-4 h-4 text-amber-600" />
              )}
              <span className="font-medium">{downloadStatus}</span>
            </div>
            <span className="text-[11px] text-zinc-500">Binary ZIP Header: PK (0x50 0x4B)</span>
          </div>
        </div>
      )}
    </header>
  )
}
