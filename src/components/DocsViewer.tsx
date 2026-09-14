import React, { useState, useEffect } from "react"
import { BookOpen, FileText, Code2, Globe2, ShieldCheck, KeyRound } from "lucide-react"
import type { DocsResponse } from "../types"

export const DocsViewer: React.FC = () => {
  const [docs, setDocs] = useState<DocsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [docLang, setDocLang] = useState<"id" | "pt">("id")

  useEffect(() => {
    fetch("/api/docs")
      .then((res) => res.json())
      .then((data) => {
        setDocs(data)
        setLoading(false)
      })
      .catch((err) => {
        console.error("Failed to load docs:", err)
        setLoading(false)
      })
  }, [])

  return (
    <div className="bg-white rounded-xl border border-zinc-200 shadow-xs overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-zinc-200 bg-zinc-50 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-emerald-600" />
          <div>
            <h2 className="text-sm font-semibold text-zinc-900">
              Documentation & Architecture Guide
            </h2>
            <p className="text-xs text-zinc-500">
              Extracted and organized from Dyno <code className="text-zinc-700">/player</code> using <code className="text-zinc-700">@luanxdd/snowkit</code>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Globe2 className="w-3.5 h-3.5 text-zinc-400" />
          <div className="flex rounded-lg bg-zinc-200/80 p-0.5 text-xs">
            <button
              onClick={() => setDocLang("id")}
              className={`px-3 py-1 rounded-md font-medium transition-all ${
                docLang === "id"
                  ? "bg-white text-zinc-900 shadow-xs"
                  : "text-zinc-600 hover:text-zinc-900"
              }`}
            >
              Bahasa Indonesia (ID)
            </button>
            <button
              onClick={() => setDocLang("pt")}
              className={`px-3 py-1 rounded-md font-medium transition-all ${
                docLang === "pt"
                  ? "bg-white text-zinc-900 shadow-xs"
                  : "text-zinc-600 hover:text-zinc-900"
              }`}
            >
              Português (BR)
            </button>
          </div>
        </div>
      </div>

      {/* Quick Architecture cards */}
      <div className="p-5 grid grid-cols-1 md:grid-cols-3 gap-4 border-b border-zinc-200 bg-zinc-50/50">
        <div className="p-3.5 bg-white rounded-lg border border-zinc-200 shadow-xs">
          <div className="flex items-center gap-2 text-xs font-semibold text-zinc-900 mb-1.5">
            <KeyRound className="w-4 h-4 text-emerald-600" />
            <span>SnowKit SDK 3.2.0</span>
          </div>
          <p className="text-xs text-zinc-600 leading-relaxed">
            Direct integration with <code className="bg-zinc-100 px-1 py-0.5 rounded text-[11px]">@luanxdd/snowkit</code> and <code className="bg-zinc-100 px-1 py-0.5 rounded text-[11px]">@luanxdd/snowkit/player</code> for music discovery and session resolution.
          </p>
        </div>

        <div className="p-3.5 bg-white rounded-lg border border-zinc-200 shadow-xs">
          <div className="flex items-center gap-2 text-xs font-semibold text-zinc-900 mb-1.5">
            <ShieldCheck className="w-4 h-4 text-teal-600" />
            <span>Secure Architecture</span>
          </div>
          <p className="text-xs text-zinc-600 leading-relaxed">
            API token is strictly protected on server-side. Only temporary signed <code className="bg-zinc-100 px-1 py-0.5 rounded text-[11px]">socketUrl</code> is sent to clients for WebSocket audio.
          </p>
        </div>

        <div className="p-3.5 bg-white rounded-lg border border-zinc-200 shadow-xs">
          <div className="flex items-center gap-2 text-xs font-semibold text-zinc-900 mb-1.5">
            <Code2 className="w-4 h-4 text-cyan-600" />
            <span>Bot Adapters</span>
          </div>
          <p className="text-xs text-zinc-600 leading-relaxed">
            Ready-to-use senders for WhatsApp: <code className="bg-zinc-100 px-1 py-0.5 rounded text-[11px]">BaileysRichHtmlSender</code> and <code className="bg-zinc-100 px-1 py-0.5 rounded text-[11px]">ZapoRichHtmlSender</code>.
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="p-5 max-w-4xl mx-auto">
        {loading ? (
          <div className="py-12 text-center text-xs text-zinc-400">
            Loading documentation...
          </div>
        ) : (
          <div className="prose prose-zinc prose-sm max-w-none">
            <div className="bg-zinc-950 text-zinc-200 p-5 rounded-xl font-mono text-xs overflow-x-auto whitespace-pre-wrap leading-relaxed shadow-inner">
              {docLang === "id" ? docs?.readmeId : docs?.readmePt}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
