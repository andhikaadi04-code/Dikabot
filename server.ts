import express from "express"
import path from "node:path"
import fs from "node:fs"
import { readFile } from "node:fs/promises"
import { createServer as createViteServer } from "vite"
import dotenv from "dotenv"

// Load env variables
dotenv.config()

import { SnowKitMusic } from "./src/snowkit/SnowKitClient"
import { inlineArtwork } from "./src/player/Artwork"
import { buildPlayerHtml } from "./src/player/PlayerHtml"
import { createRichHtmlPayload } from "./src/rich/RichHtmlPayload"
import { startWhatsAppBot } from "./src/bot/whatsappBot"

const PORT = process.env.SERVER_PORT ? Number(process.env.SERVER_PORT) : 3000

// Demo tracks with synchronized lyrics for immediate interactive testing & preview
const DEMO_TRACKS = [
  {
    id: "demo-track-nina",
    title: "Nina",
    artist: ".Feast",
    durationMs: 278000,
    artworkUrl: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80",
    lyrics: [
      { startMs: 0, endMs: 8000, text: "Saat dewasa kau 'kan mengerti" },
      { startMs: 8000, endMs: 16000, text: "Kerasnya hidup di dunia ini" },
      { startMs: 16000, endMs: 25000, text: "Tapi tenanglah, kau tak sendiri" },
      { startMs: 25000, endMs: 36000, text: "Ada pelukan yang selalu menanti" },
      { startMs: 36000, endMs: 48000, text: "Tumbuhlah jadi yang kau mau, Nina..." }
    ]
  },
  {
    id: "demo-track-1",
    title: "Hati-Hati di Jalan",
    artist: "Tulus",
    durationMs: 242000,
    artworkUrl: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600&auto=format&fit=crop&q=80",
    lyrics: [
      { startMs: 0, endMs: 8000, text: "Kukira kita akan bersama" },
      { startMs: 8000, endMs: 16000, text: "Begitu banyak yang sama" },
      { startMs: 16000, endMs: 24000, text: "Latarmu dan latarku" },
      { startMs: 24000, endMs: 33000, text: "Kukira takkan ada kendala" },
      { startMs: 33000, endMs: 42000, text: "Kukira ini kan mudah" },
      { startMs: 42000, endMs: 50000, text: "Kau aku jadi kita" },
      { startMs: 50000, endMs: 59000, text: "Kukira kita akan bersama" },
      { startMs: 59000, endMs: 70000, text: "Hati-hati di jalan..." }
    ]
  },
  {
    id: "demo-track-2",
    title: "Garota de Ipanema",
    artist: "Antônio Carlos Jobim & Vinicius de Moraes",
    durationMs: 195000,
    artworkUrl: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=600&auto=format&fit=crop&q=80",
    lyrics: [
      { startMs: 0, endMs: 10000, text: "Olha que coisa mais linda, mais cheia de graça" },
      { startMs: 10000, endMs: 19000, text: "É ela, menina, que vem e que passa" },
      { startMs: 19000, endMs: 29000, text: "Num doce balanço a caminho do mar" },
      { startMs: 29000, endMs: 38000, text: "Moça do corpo dourado do sol de Ipanema" },
      { startMs: 38000, endMs: 48000, text: "O seu balançado é mais que um poema" },
      { startMs: 48000, endMs: 60000, text: "É a coisa mais linda que eu já vi passar..." }
    ]
  },
  {
    id: "demo-track-3",
    title: "Blinding Lights",
    artist: "The Weeknd",
    durationMs: 200000,
    artworkUrl: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80",
    lyrics: [
      { startMs: 0, endMs: 12000, text: "Yeah..." },
      { startMs: 12000, endMs: 24000, text: "I've been tryna call" },
      { startMs: 24000, endMs: 34000, text: "I've been on my own for long enough" },
      { startMs: 34000, endMs: 45000, text: "Maybe you can show me how to love, maybe" },
      { startMs: 45000, endMs: 56000, text: "I'm going through withdrawals" },
      { startMs: 56000, endMs: 68000, text: "You don't even have to do too much" },
      { startMs: 68000, endMs: 80000, text: "I said, ooh, I'm blinded by the lights!" }
    ]
  }
]

async function startServer() {
  const app = express()
  app.use(express.json({ limit: "10mb" }))

  // Static assets from ./assets (like player.css, player.js, player.html)
  app.use("/assets", express.static(path.resolve(process.cwd(), "assets")))

  // Download full project zip file (ensures binary zip, not html)
  app.get("/api/download-zip", (_req, res) => {
    const zipPath = path.resolve(process.cwd(), "public", "masdik75-whatsapp-player.zip")
    res.setHeader("Content-Type", "application/zip")
    res.setHeader("Content-Disposition", 'attachment; filename="masdik75-whatsapp-player.zip"')
    res.download(zipPath, "masdik75-whatsapp-player.zip", (err) => {
      if (err && !res.headersSent) {
        res.status(500).json({ error: "Could not send zip file" })
      }
    })
  })

  // JSON Base64 endpoint to bypass mobile browser download manager redirect
  app.get("/api/download-zip-base64", (_req, res) => {
    const zipPath = path.resolve(process.cwd(), "public", "masdik75-whatsapp-player.zip")
    if (fs.existsSync(zipPath)) {
      const fileBuffer = fs.readFileSync(zipPath)
      res.json({
        success: true,
        filename: "masdik75-whatsapp-player.zip",
        size: fileBuffer.length,
        base64: fileBuffer.toString("base64"),
      })
    } else {
      res.status(404).json({ error: "Zip not found" })
    }
  })

  // Health check
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", service: "SnowKit WhatsApp Player" })
  })

  // Configuration check (SnowKit Endpoint & Token status)
  app.get("/api/config", (_req, res) => {
    const endpoint = process.env.SNOWKIT_ENDPOINT || "https://snow.kairogg.com.br"
    const hasToken = Boolean(process.env.SNOWKIT_TOKEN && process.env.SNOWKIT_TOKEN.trim().length > 0 && process.env.SNOWKIT_TOKEN !== "cole_seu_token_aqui" && process.env.SNOWKIT_TOKEN !== "MY_SNOWKIT_TOKEN")
    res.json({
      endpoint,
      hasToken,
      defaultMarket: "BR"
    })
  })

  // List demo tracks
  app.get("/api/demo-tracks", (_req, res) => {
    res.json({ data: DEMO_TRACKS })
  })

  // Search or resolve song using SnowKitMusic SDK or demo fallback
  app.post("/api/player/resolve", async (req, res) => {
    try {
      const { input, endpoint, token, market } = req.body || {}
      const targetEndpoint = (endpoint || process.env.SNOWKIT_ENDPOINT || "https://snow.kairogg.com.br").trim()
      const targetToken = (token || process.env.SNOWKIT_TOKEN || "").trim()
      const targetMarket = (market || "BR").trim()

      const hasRealToken = targetToken.length > 0 && targetToken !== "cole_seu_token_aqui" && targetToken !== "MY_SNOWKIT_TOKEN"

      if (hasRealToken) {
        const client = new SnowKitMusic({
          endpoint: targetEndpoint,
          token: targetToken,
          market: targetMarket
        })
        const song = await client.resolve(input)
        return res.json({
          source: "snowkit",
          song: {
            id: song.id,
            title: song.title,
            artist: song.artists?.map((a: { name: string }) => a.name).join(", ") || "Unknown Artist",
            artworkUrl: song.artwork?.url || song.album?.images?.[0]?.url,
            durationMs: song.durationMs
          }
        })
      }

      // Demo fallback mode when real token is not yet configured
      const normalizedInput = (input || "").toLowerCase().trim()
      let matched = DEMO_TRACKS.find(t =>
        t.title.toLowerCase().includes(normalizedInput) ||
        t.artist.toLowerCase().includes(normalizedInput)
      )
      if (!matched) {
        // If searching a query without match, generate a realistic response or use first demo
        matched = {
          ...DEMO_TRACKS[0],
          id: `demo-${Date.now()}`,
          title: input ? input.slice(0, 40) : DEMO_TRACKS[0].title
        }
      }

      res.json({
        source: "demo",
        isDemo: true,
        message: "Demo track resolved (SnowKit API token not set, using simulated preview session)",
        song: matched
      })
    } catch (err: unknown) {
      console.error("Resolve error:", err)
      const message = err instanceof Error ? err.message : String(err)
      res.status(400).json({ error: message })
    }
  })

  // Build full Player HTML & WhatsApp payload
  app.post("/api/player/build", async (req, res) => {
    try {
      const {
        title,
        artist,
        durationMs,
        artworkUrl,
        lyrics = [],
        socketUrl,
        mimeType = "audio/mp4",
        disclaimer = "SnowKit WhatsApp Player",
        botJid = "867051314767696@bot",
        trustedSources = ["snowkit"]
      } = req.body || {}

      // Generate inlined webp base64 artwork if URL provided
      let imageDataUrl = ""
      if (artworkUrl) {
        try {
          imageDataUrl = await inlineArtwork(artworkUrl)
        } catch (artErr) {
          console.warn("Artwork inline failed, continuing without base64:", artErr)
        }
      }

      // Format lyrics properly
      const formattedLyrics = Array.isArray(lyrics)
        ? lyrics.map((l: { startMs?: number; start_ms?: number; endMs?: number; end_ms?: number; text?: string }) => ({
            startMs: Number(l.startMs ?? l.start_ms ?? 0),
            endMs: l.endMs != null || l.end_ms != null ? Number(l.endMs ?? l.end_ms) : null,
            text: String(l.text ?? "")
          }))
        : []

      // Build standalone HTML bundle
      const html = await buildPlayerHtml({
        title: title || "Unknown Title",
        artist: artist || "Unknown Artist",
        durationMs: durationMs || 180000,
        socketUrl: socketUrl || "wss://snow.kairogg.com.br/ws/player/demo",
        mimeType,
        imageDataUrl,
        lyrics: formattedLyrics
      })

      // Generate Rich HTML payload for WhatsApp providers
      const payloadOptions = {
        html,
        title: `🎵 ${title || "Music"} — ${artist || "Artist"}`,
        id: "snowkit-music-player",
        disclaimer,
        trustedSources,
        botJid
      }

      const rawPayload = createRichHtmlPayload(payloadOptions)

      res.json({
        html,
        title,
        artist,
        durationMs,
        imageDataUrl,
        rawPayload,
        payloadOptions
      })
    } catch (err: unknown) {
      console.error("Build player error:", err)
      const message = err instanceof Error ? err.message : String(err)
      res.status(500).json({ error: message })
    }
  })

  // Documentation and examples content
  app.get("/api/docs", async (_req, res) => {
    try {
      const [readmeId, readmePt, zapoExample, baileysExample] = await Promise.all([
        readFile(path.resolve(process.cwd(), "README.id-ID.md"), "utf8").catch(() => ""),
        readFile(path.resolve(process.cwd(), "README.pt-BR.md"), "utf8").catch(() => ""),
        readFile(path.resolve(process.cwd(), "examples/zapo.ts"), "utf8").catch(() => ""),
        readFile(path.resolve(process.cwd(), "examples/baileys.ts"), "utf8").catch(() => ""),
      ])
      res.json({
        readmeId,
        readmePt,
        examples: {
          zapo: zapoExample,
          baileys: baileysExample
        }
      })
    } catch (err: unknown) {
      res.status(500).json({ error: String(err) })
    }
  })

  // Vite integration
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    })
    app.use(vite.middlewares)
  } else {
    const distPath = path.resolve(process.cwd(), "dist")
    app.use(express.static(distPath))
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"))
    })
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`SnowKit WhatsApp Player running on http://0.0.0.0:${PORT}`)
    // Start automated WhatsApp bot if BOT_NUMBER is configured in .env
    startWhatsAppBot().catch((err) => {
      console.error("[WhatsApp Bot] Gagal memulai bot:", err)
    })
  })
}

startServer()
