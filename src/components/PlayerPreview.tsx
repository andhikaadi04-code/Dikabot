import React, { useState } from "react"
import { Smartphone, Monitor, ExternalLink, RefreshCw, CheckCircle2, Bot } from "lucide-react"

interface PlayerPreviewProps {
  html: string
  title: string
  artist: string
  isBuilding: boolean
}

export const PlayerPreview: React.FC<PlayerPreviewProps> = ({
  html,
  title,
  artist,
  isBuilding
}) => {
  const [viewMode, setViewMode] = useState<"phone" | "fullscreen">("phone")
  const [iframeKey, setIframeKey] = useState(0)

  const reloadIframe = () => {
    setIframeKey((prev) => prev + 1)
  }

  return (
    <div className="bg-white rounded-xl border border-zinc-200 shadow-xs overflow-hidden flex flex-col h-full">
      {/* Top toolbar */}
      <div className="px-4 py-3 border-b border-zinc-200 bg-zinc-50 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 font-medium text-xs text-zinc-900">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Live Interactive Player</span>
          </div>
          <span className="text-zinc-300">|</span>
          <span className="text-xs text-zinc-500 truncate max-w-[180px]">
            {title} - {artist}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={reloadIframe}
            title="Reload player state"
            className="p-1.5 text-zinc-500 hover:text-zinc-800 rounded-md hover:bg-zinc-200/60 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>

          <div className="flex rounded-lg bg-zinc-200/80 p-0.5 text-xs">
            <button
              onClick={() => setViewMode("phone")}
              className={`px-2.5 py-1 rounded-md font-medium transition-all flex items-center gap-1 ${
                viewMode === "phone"
                  ? "bg-white text-zinc-900 shadow-xs"
                  : "text-zinc-600 hover:text-zinc-900"
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>Mobile Frame</span>
            </button>
            <button
              onClick={() => setViewMode("fullscreen")}
              className={`px-2.5 py-1 rounded-md font-medium transition-all flex items-center gap-1 ${
                viewMode === "fullscreen"
                  ? "bg-white text-zinc-900 shadow-xs"
                  : "text-zinc-600 hover:text-zinc-900"
              }`}
            >
              <Monitor className="w-3.5 h-3.5" />
              <span>Expanded</span>
            </button>
          </div>
        </div>
      </div>

      {/* Preview container */}
      <div className="flex-1 bg-zinc-900/95 p-4 sm:p-6 flex flex-col items-center justify-center overflow-auto min-h-[580px]">
        {isBuilding ? (
          <div className="text-center py-12">
            <RefreshCw className="w-8 h-8 text-emerald-400 animate-spin mx-auto mb-3" />
            <div className="text-sm font-medium text-white">Compiling SnowKit Player HTML...</div>
            <div className="text-xs text-zinc-400 mt-1">Inlining WebP artwork & bundling assets</div>
          </div>
        ) : !html ? (
          <div className="text-center py-12 text-zinc-400 text-xs">
            No player generated yet. Click "Build Player HTML".
          </div>
        ) : viewMode === "phone" ? (
          /* Phone Frame */
          <div className="w-full max-w-[390px] bg-zinc-950 rounded-[38px] p-3 shadow-2xl border-4 border-zinc-800 ring-1 ring-white/10 relative">
            {/* Phone notch */}
            <div className="h-5 w-28 bg-zinc-800 rounded-b-xl mx-auto mb-2 flex items-center justify-center">
              <div className="w-2.5 h-2.5 rounded-full bg-zinc-900 mr-2"></div>
              <div className="w-8 h-1 rounded-full bg-zinc-700"></div>
            </div>

            {/* WhatsApp simulated chat header */}
            <div className="bg-[#1f2c34] text-white px-3 py-2 rounded-t-2xl flex items-center justify-between border-b border-zinc-700/50">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-emerald-600 flex items-center justify-center text-[10px] font-bold">
                  <Bot className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-semibold flex items-center gap-1">
                    <span>Dyno Music Bot</span>
                    <CheckCircle2 className="w-3 h-3 text-emerald-400 fill-emerald-400/20" />
                  </div>
                  <div className="text-[10px] text-emerald-400">verified bot</div>
                </div>
              </div>
              <span className="text-[10px] text-zinc-400">Rich Response</span>
            </div>

            {/* WhatsApp message bubble containing player */}
            <div className="bg-[#121b22] p-1.5 rounded-b-2xl overflow-hidden relative">
              <div className="w-full h-[590px] rounded-xl overflow-hidden bg-[#111114] relative shadow-inner">
                <iframe
                  key={iframeKey}
                  srcDoc={html}
                  title="SnowKit WhatsApp Player Preview"
                  className="w-full h-full border-0"
                  sandbox="allow-scripts allow-same-origin"
                />
              </div>
            </div>
          </div>
        ) : (
          /* Expanded container */
          <div className="w-full h-full max-w-2xl min-h-[600px] rounded-2xl overflow-hidden border border-zinc-800 shadow-2xl bg-[#111114]">
            <iframe
              key={iframeKey}
              srcDoc={html}
              title="SnowKit WhatsApp Player Expanded"
              className="w-full h-full min-h-[600px] border-0"
              sandbox="allow-scripts allow-same-origin"
            />
          </div>
        )}

        {/* Feature hint badges */}
        <div className="mt-4 flex flex-wrap items-center justify-center gap-3 text-[11px] text-zinc-400">
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            Real-time audio streaming
          </span>
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            Synchronized karaoke lyrics
          </span>
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            Rewind & Fast-forward 15s
          </span>
        </div>
      </div>
    </div>
  )
}
