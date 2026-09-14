import React, { useState } from "react"
import { Copy, Check, Code2, Send, FileCode, Terminal } from "lucide-react"
import type { BuildPlayerResponse } from "../types"

interface PayloadViewerProps {
  buildData: BuildPlayerResponse | null
  trackTitle: string
}

export const PayloadViewer: React.FC<PayloadViewerProps> = ({
  buildData,
  trackTitle
}) => {
  const [activeTab, setActiveTab] = useState<"baileys" | "zapo" | "json" | "html">("baileys")
  const [copiedTab, setCopiedTab] = useState<string | null>(null)

  const copyToClipboard = (text: string, tabName: string) => {
    navigator.clipboard.writeText(text)
    setCopiedTab(tabName)
    setTimeout(() => setCopiedTab(null), 2000)
  }

  const baileysSnippet = `import { BaileysRichHtmlSender, SnowKitWhatsAppPlayer } from "./src/index.js"

// Initialize player with Baileys socket instance
const sender = new BaileysRichHtmlSender(sock)
const player = new SnowKitWhatsAppPlayer(sender, {
  endpoint: process.env.SNOWKIT_ENDPOINT ?? "https://snow.kairogg.com.br",
  token: process.env.SNOWKIT_TOKEN!,
  market: "BR",
})

// Send rich interactive player to WhatsApp chat / contact
await player.send(jid, "${trackTitle || "music title or spotify url"}")
`

  const zapoSnippet = `import { SnowKitWhatsAppPlayer, ZapoRichHtmlSender } from "./src/index.js"

// Initialize player with Zapo provider
const sender = new ZapoRichHtmlSender(provider)
const player = new SnowKitWhatsAppPlayer(sender, {
  endpoint: process.env.SNOWKIT_ENDPOINT ?? "https://snow.kairogg.com.br",
  token: process.env.SNOWKIT_TOKEN!,
  market: "BR",
})

// Send player with optional quote context
await player.send(chatId, "${trackTitle || "music title or spotify url"}", quote)
`

  const jsonSnippet = buildData?.rawPayload
    ? JSON.stringify(buildData.rawPayload, null, 2)
    : "// Build player to see generated WhatsApp Rich Response payload"

  const htmlSnippet = buildData?.html || "// Build player to see generated HTML bundle"

  let currentContent = baileysSnippet
  if (activeTab === "zapo") currentContent = zapoSnippet
  else if (activeTab === "json") currentContent = jsonSnippet
  else if (activeTab === "html") currentContent = htmlSnippet

  return (
    <div className="bg-white rounded-xl border border-zinc-200 shadow-xs overflow-hidden">
      {/* Header & Tabs */}
      <div className="px-4 py-3 border-b border-zinc-200 bg-zinc-50 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Code2 className="w-4 h-4 text-emerald-600" />
          <span className="text-xs font-semibold text-zinc-900">
            WhatsApp Bot Integration & Payload Export
          </span>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex rounded-lg bg-zinc-200/80 p-0.5 text-xs">
            <button
              onClick={() => setActiveTab("baileys")}
              className={`px-2.5 py-1 rounded-md font-medium transition-all flex items-center gap-1 ${
                activeTab === "baileys"
                  ? "bg-white text-zinc-900 shadow-xs"
                  : "text-zinc-600 hover:text-zinc-900"
              }`}
            >
              <Send className="w-3 h-3 text-emerald-600" />
              <span>Baileys</span>
            </button>
            <button
              onClick={() => setActiveTab("zapo")}
              className={`px-2.5 py-1 rounded-md font-medium transition-all flex items-center gap-1 ${
                activeTab === "zapo"
                  ? "bg-white text-zinc-900 shadow-xs"
                  : "text-zinc-600 hover:text-zinc-900"
              }`}
            >
              <Terminal className="w-3 h-3 text-cyan-600" />
              <span>Zapo</span>
            </button>
            <button
              onClick={() => setActiveTab("json")}
              className={`px-2.5 py-1 rounded-md font-medium transition-all flex items-center gap-1 ${
                activeTab === "json"
                  ? "bg-white text-zinc-900 shadow-xs"
                  : "text-zinc-600 hover:text-zinc-900"
              }`}
            >
              <FileCode className="w-3 h-3 text-amber-600" />
              <span>Rich JSON</span>
            </button>
            <button
              onClick={() => setActiveTab("html")}
              className={`px-2.5 py-1 rounded-md font-medium transition-all flex items-center gap-1 ${
                activeTab === "html"
                  ? "bg-white text-zinc-900 shadow-xs"
                  : "text-zinc-600 hover:text-zinc-900"
              }`}
            >
              <span>Raw HTML</span>
            </button>
          </div>

          <button
            onClick={() => copyToClipboard(currentContent, activeTab)}
            className="px-2.5 py-1 text-xs font-medium text-zinc-700 bg-white border border-zinc-200 hover:bg-zinc-100 rounded-md transition-colors flex items-center gap-1.5 shadow-xs"
          >
            {copiedTab === activeTab ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-emerald-700">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-zinc-500" />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Code area */}
      <div className="p-4 bg-zinc-950 font-mono text-xs text-zinc-200 overflow-x-auto max-h-72">
        <pre className="whitespace-pre">{currentContent}</pre>
      </div>

      {/* Footer explanation */}
      <div className="px-4 py-2.5 bg-zinc-50 border-t border-zinc-200 text-[11px] text-zinc-500 flex items-center justify-between">
        <span>
          {activeTab === "baileys" && "Compatible with @whiskeysockets/baileys using relayMessage()"}
          {activeTab === "zapo" && "Compatible with Zapo provider using sendRawMessage()"}
          {activeTab === "json" && "Unified GenAI rich message payload accepted by WhatsApp client"}
          {activeTab === "html" && "Self-contained HTML with embedded WebP artwork, CSS & playback script"}
        </span>
        <span className="font-mono text-zinc-400">Masdik75 / SnowKit 3.2.0</span>
      </div>
    </div>
  )
}
