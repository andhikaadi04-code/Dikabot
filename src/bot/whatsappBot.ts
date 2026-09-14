import {
  makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  type WASocket,
  type proto,
} from "@whiskeysockets/baileys"
import pino from "pino"
import path from "node:path"
import fs from "node:fs"
import { BaileysRichHtmlSender } from "../adapters/BaileysRichHtmlSender.js"
import { SnowKitWhatsAppPlayer } from "../player/SnowKitWhatsAppPlayer.js"

let currentSocket: WASocket | null = null
let isConnecting = false
let reconnectTimer: NodeJS.Timeout | null = null

// Mencegah process Node.js crash akibat error WebSocket atau Unhandled Promise
if (!(globalThis as any).__WA_GLOBAL_HANDLERS__) {
  ;(globalThis as any).__WA_GLOBAL_HANDLERS__ = true
  process.on("unhandledRejection", (reason) => {
    console.error("[WhatsApp Bot] ⚠️ Unhandled Promise Rejection:", reason)
  })
  process.on("uncaughtException", (error) => {
    console.error("[WhatsApp Bot] ⚠️ Uncaught Exception:", error)
  })
}

export function getWhatsAppSocket(): WASocket | null {
  return currentSocket
}

/**
 * Ekstraksi teks dari berbagai tipe pesan WhatsApp (normal, caption, reply, interactive, dll)
 */
function extractMessageText(message: proto.IMessage | null | undefined): string {
  if (!message) return ""

  // Unwrap message wrappers
  if (message.ephemeralMessage?.message) {
    return extractMessageText(message.ephemeralMessage.message)
  }
  if (message.viewOnceMessage?.message) {
    return extractMessageText(message.viewOnceMessage.message)
  }
  if (message.viewOnceMessageV2?.message) {
    return extractMessageText(message.viewOnceMessageV2.message)
  }
  if (message.documentWithCaptionMessage?.message) {
    return extractMessageText(message.documentWithCaptionMessage.message)
  }
  if (message.editedMessage?.message) {
    return extractMessageText(message.editedMessage.message)
  }

  // Direct text fields
  if (message.conversation) return message.conversation
  if (message.extendedTextMessage?.text) return message.extendedTextMessage.text
  if (message.imageMessage?.caption) return message.imageMessage.caption
  if (message.videoMessage?.caption) return message.videoMessage.caption
  if (message.documentMessage?.caption) return message.documentMessage.caption

  // Interactive buttons / lists / template replies
  if (message.buttonsResponseMessage?.selectedDisplayText) {
    return message.buttonsResponseMessage.selectedDisplayText
  }
  if (message.buttonsResponseMessage?.selectedButtonId) {
    return message.buttonsResponseMessage.selectedButtonId
  }
  if (message.templateButtonReplyMessage?.selectedId) {
    return message.templateButtonReplyMessage.selectedId
  }
  if (message.listResponseMessage?.title) {
    return message.listResponseMessage.title
  }
  if (message.listResponseMessage?.singleSelectReply?.selectedRowId) {
    return message.listResponseMessage.singleSelectReply.selectedRowId
  }
  if (message.interactiveResponseMessage?.body?.text) {
    return message.interactiveResponseMessage.body.text
  }

  return ""
}

/**
 * Memulai bot WhatsApp Baileys dengan heartbeat / keepAlive stabil
 */
export async function startWhatsAppBot() {
  const botNumberRaw = process.env.BOT_NUMBER || ""
  const enableBot = process.env.ENABLE_WHATSAPP_BOT === "true" || botNumberRaw.trim().length > 0

  if (!enableBot) {
    console.log("\n=======================================================")
    console.log("ℹ️  WHATSAPP BOT BELUM DIAKTIFKAN")
    console.log("Untuk mengaktifkan bot WhatsApp dan mendapatkan PAIRING CODE:")
    console.log("Edit file .env di menu Files Senzhosting, tambahkan:")
    console.log('BOT_NUMBER="628xxxxxxxxxx"   (Nomor WhatsApp bot Anda, diawali 62)')
    console.log("Lalu klik Restart di panel Console.")
    console.log("=======================================================\n")
    return
  }

  if (isConnecting) {
    console.log("[WhatsApp Bot] ⏳ Proses koneksi sedang berjalan, mengabaikan panggilan duplikat...")
    return
  }
  isConnecting = true

  if (reconnectTimer) {
    clearTimeout(reconnectTimer)
    reconnectTimer = null
  }

  // Bersihkan socket lama jika ada
  if (currentSocket) {
    try {
      console.log("[WhatsApp Bot] Menutup koneksi socket sebelumnya...")
      currentSocket.ev.removeAllListeners("connection.update")
      currentSocket.ev.removeAllListeners("messages.upsert")
      currentSocket.ev.removeAllListeners("creds.update")
      currentSocket.end?.(new Error("Reconnecting Baileys"))
    } catch {
      // Ignore
    }
    currentSocket = null
  }

  const cleanedNumber = botNumberRaw.replace(/[^0-9]/g, "")
  if (!cleanedNumber) {
    isConnecting = false
    console.error("❌ BOT_NUMBER tidak valid. Masukkan nomor HP dengan format angka (contoh: 6281234567890).")
    return
  }

  const sessionDir = path.resolve(process.cwd(), "auth_session")
  if (!fs.existsSync(sessionDir)) {
    fs.mkdirSync(sessionDir, { recursive: true })
  }

  try {
    const { state, saveCreds } = await useMultiFileAuthState(sessionDir)
    const { version, isLatest } = await fetchLatestBaileysVersion().catch(() => ({
      version: [2, 3000, 1017531287] as [number, number, number],
      isLatest: false,
    }))

    console.log(`[WhatsApp Bot] Memulai Baileys (WA Version: ${version.join(".")}, isLatest: ${isLatest})...`)

    const sock = makeWASocket({
      version,
      auth: state,
      logger: pino({ level: "silent" }) as any,
      printQRInTerminal: false,
      browser: ["Ubuntu", "Chrome", "20.0.04"],
      // Opsi kestabilan jaringan & anti-zombie connection
      syncFullHistory: false,
      emitOwnEvents: true, // Wajib agar pesan dari HP sendiri (fromMe) juga diproses
      markOnlineOnConnect: true,
      keepAliveIntervalMs: 25_000, // Ping WhatsApp setiap 25 detik agar koneksi tidak drop/idle timeout
      connectTimeoutMs: 60_000,
      defaultQueryTimeoutMs: 60_000,
      retryRequestDelayMs: 500,
      maxMsgRetryCount: 5,
      generateHighQualityLinkPreview: true,
    })

    currentSocket = sock
    isConnecting = false

    // Inisialisasi SnowKit Player
    const sender = new BaileysRichHtmlSender(sock)
    const player = new SnowKitWhatsAppPlayer(sender, {
      endpoint: process.env.SNOWKIT_ENDPOINT ?? "https://snow.kairogg.com.br",
      token: process.env.SNOWKIT_TOKEN ?? "",
      market: "ID",
    })

    // Pairing code request jika sesi belum terdaftar
    if (!sock.authState.creds.registered) {
      setTimeout(async () => {
        try {
          console.log(`[WhatsApp Bot] Meminta pairing code untuk nomor: ${cleanedNumber}...`)
          const code = await sock.requestPairingCode(cleanedNumber)
          console.log("\n=======================================================")
          console.log("🔥 WHATSAPP PAIRING CODE ANDA: 🔥")
          console.log(`           >>>  ${code}  <<<`)
          console.log("=======================================================")
          console.log("👉 Cara Menghubungkan:")
          console.log("1. Buka WhatsApp di HP Anda.")
          console.log("2. Buka menu Perangkat Tertaut (Linked Devices).")
          console.log("3. Pilih 'Tautkan dengan nomor telepon' (Link with phone number instead).")
          console.log(`4. Masukkan kode di atas: ${code}`)
          console.log("=======================================================\n")
        } catch (err: any) {
          console.error("❌ Gagal mendapatkan pairing code:", err?.message || err)
          console.log("Pastikan nomor diawali kode negara (misal 62) tanpa spasi atau strip.")
        }
      }, 4000)
    }

    sock.ev.on("creds.update", saveCreds)

    sock.ev.on("connection.update", (update) => {
      const { connection, lastDisconnect } = update

      if (connection === "close") {
        const error = lastDisconnect?.error as any
        const statusCode = error?.output?.statusCode ?? error?.statusCode
        const isLoggedOut = statusCode === DisconnectReason.loggedOut // 401
        const reasonStr = DisconnectReason[statusCode] || `Code ${statusCode}`

        console.log(`[WhatsApp Bot] ⚠️ Koneksi terputus: ${reasonStr} (${statusCode}). Auto-reconnect: ${!isLoggedOut}`)

        if (!isLoggedOut) {
          const delay = statusCode === DisconnectReason.restartRequired ? 2000 : 5000
          reconnectTimer = setTimeout(() => {
            startWhatsAppBot().catch((err) => {
              console.error("[WhatsApp Bot] Gagal menghubungkan ulang:", err)
            })
          }, delay)
        } else {
          console.log("❌ Sesi WhatsApp telah Logout (401). Hapus folder auth_session untuk pairing ulang.")
        }
      } else if (connection === "open") {
        console.log("\n=======================================================")
        console.log("✅ WHATSAPP BOT BERHASIL TERHUBUNG & AKTIF!")
        console.log(`Nomor Bot: ${sock.user?.id?.split(":")[0] || cleanedNumber}`)
        console.log("Status: Siap menerima perintah (.play <lagu>, .menu, .ping)")
        console.log("=======================================================\n")
      }
    })

    // Handler pesan masuk
    sock.ev.on("messages.upsert", async (m) => {
      try {
        const messages = m.messages || []
        for (const msg of messages) {
          if (!msg || !msg.message) continue

          const jid = msg.key.remoteJid
          if (!jid || jid === "status@broadcast") continue

          const rawText = extractMessageText(msg.message)
          const trimmed = rawText.trim()
          if (!trimmed) continue

          // Abaikan jika ini adalah respon yang dibuat otomatis oleh bot sendiri
          if (
            trimmed.startsWith("🎵 Mencari & memutar") ||
            trimmed.startsWith("🎧 *DIKADEV") ||
            trimmed.startsWith("🎧 *SNOWKIT") ||
            trimmed.startsWith("⚠️ *Gagal memutar") ||
            trimmed.startsWith("🏓 *Pong!*")
          ) {
            continue
          }

          // Periksa apakah pesan ini merupakan perintah (.play, .menu, .help, .ping, dll)
          const isCommand = /^[.#!/](play|menu|help|bot|ping)\b/i.test(trimmed)

          // Jika pesan dari diri sendiri (fromMe: true), jalankan HANYA jika berupa perintah
          if (msg.key.fromMe && !isCommand) {
            continue
          }

          // Tandai pesan sudah terbaca (centang biru)
          try {
            await sock.readMessages([msg.key])
          } catch {
            // Ignore
          }

          console.log(`[WhatsApp Bot] 📩 Pesan diterima dari ${jid} (fromMe: ${Boolean(msg.key.fromMe)}): "${trimmed}"`)

          // 1. Perintah .ping
          if (/^[.#!/]ping$/i.test(trimmed)) {
            const start = Date.now()
            await sock.sendMessage(
              jid,
              { text: `🏓 *Pong!*\n• Status: Online & Aktif\n• Latensi: ${Date.now() - start}ms\n• Player: DikaDev Lock Screen` },
              { quoted: msg }
            )
            continue
          }

          // 2. Perintah .play <lagu>
          const playMatch = trimmed.match(/^[.#!/]play\s+(.+)$/i)
          if (playMatch) {
            const query = playMatch[1].trim()
            console.log(`[WhatsApp Bot] 🎵 Memproses pemutaran lagu: "${query}" untuk ${jid}`)

            // Kirim pesan status awal bahwa bot sedang memproses
            await sock.sendMessage(
              jid,
              {
                text: `🎵 Mencari & memutar: *${query}*...\n_Tunggu sebentar sedang menyiapkan player interaktif DikaDev..._`,
              },
              { quoted: msg }
            )

            try {
              // Timeout guard 45 detik agar jika SnowKit lambat, bot tidak diam membisu
              const sendPromise = player.send(jid, query, msg)
              const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error("Timeout: SnowKit membutuhkan waktu lebih dari 45 detik")), 45000)
              )

              await Promise.race([sendPromise, timeoutPromise])
              console.log(`[WhatsApp Bot] ✅ Sukses mengirim player untuk query "${query}" ke ${jid}`)
            } catch (err: any) {
              console.error(`[WhatsApp Bot] ❌ Gagal mengirim player:`, err?.message || err)
              await sock.sendMessage(
                jid,
                {
                  text:
                    `⚠️ *Gagal memutar lagu:*\n${err?.message || "Koneksi ke endpoint musik gagal"}\n\n` +
                    `💡 *Solusi:*\n` +
                    `1. Coba judul lagu lain atau sertakan nama penyanyi (contoh: \`.play Kelingan Mantan NDX\`).\n` +
                    `2. Pastikan \`SNOWKIT_ENDPOINT\` di file \`.env\` aktif dan dapat diakses.`,
                },
                { quoted: msg }
              )
            }
            continue
          }

          // 3. Perintah .menu / .help / .bot
          if (/^[.#!/](menu|help|bot)$/i.test(trimmed)) {
            console.log(`[WhatsApp Bot] 📖 Mengirim menu ke ${jid}`)
            const helpText =
              `🎧 *DIKADEV WHATSAPP MUSIC PLAYER*\n\n` +
              `Hai! Bot ini memutar lagu dengan UI player interaktif ala Apple Lock Screen langsung di WhatsApp.\n\n` +
              `*Daftar Perintah:*\\n` +
              `• *.play <judul lagu atau link spotify>*\n` +
              `  _Contoh:_ \`.play Kelingan Mantan NDX\`\n` +
              `  _Contoh:_ \`.play Nina .Feast\`\n` +
              `  _Contoh:_ \`.play Bohemian Rhapsody\`\n\n` +
              `• *.ping*\n` +
              `  _Cek status keaktifan & latensi bot_\n\n` +
              `• *.menu* atau *.help*\n` +
              `  _Menampilkan bantuan ini_\n\n` +
              `_Output Audio: DikaDev AirPlay_ 🚀`

            await sock.sendMessage(jid, { text: helpText }, { quoted: msg })
            continue
          }
        }
      } catch (e) {
        console.error("[WhatsApp Bot] Error saat menangani pesan masuk:", e)
      }
    })
  } catch (err) {
    isConnecting = false
    console.error("[WhatsApp Bot] ❌ Gagal menginisialisasi Baileys:", err)
    reconnectTimer = setTimeout(() => {
      startWhatsAppBot().catch(() => {})
    }, 10000)
  }
}
