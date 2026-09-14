// server.ts
import express from "express";
import path3 from "node:path";
import fs2 from "node:fs";
import { readFile as readFile2 } from "node:fs/promises";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";

// src/snowkit/SnowKitClient.ts
import { SnowKit } from "@luanxdd/snowkit";
import { SnowKitPlayer } from "@luanxdd/snowkit/player";
var SnowKitMusic = class {
  #catalog;
  #player;
  #market;
  constructor(config) {
    const options = {
      baseUrl: config.endpoint,
      token: config.token
    };
    this.#catalog = new SnowKit(options);
    this.#player = new SnowKitPlayer(options);
    this.#market = config.market ?? "BR";
  }
  async resolve(input) {
    if (isSpotifyReference(input)) {
      return this.#catalog.catalog.resolve(input, { market: this.#market });
    }
    if (looksLikeUrl(input)) {
      throw new Error("unsupported_music_url");
    }
    const results = await this.#catalog.catalog.songs.search(input, {
      limit: 1,
      market: this.#market
    });
    const song = results.data[0];
    if (!song) throw new Error("song_not_found");
    return song;
  }
  ready(songId) {
    return this.#player.ready(songId, {
      market: this.#market,
      intervalMs: 1e3,
      timeoutMs: 5 * 6e4
    });
  }
};
function isSpotifyReference(input) {
  const normalized = input.trim();
  if (/^spotify:(?:track|album):/iu.test(normalized)) return true;
  try {
    const url = new URL(normalized);
    return url.protocol === "https:" && url.hostname.toLowerCase() === "open.spotify.com";
  } catch {
    return false;
  }
}
function looksLikeUrl(input) {
  try {
    new URL(input);
    return true;
  } catch {
    return false;
  }
}

// src/player/Artwork.ts
import sharp from "sharp";
var maxArtworkBytes = 8 * 1024 * 1024;
var artworkSize = 640;
async function inlineArtwork(url) {
  if (!url) return "";
  try {
    const response = await fetch(url, {
      headers: {
        Accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
        "User-Agent": "SnowKitPlayer/1.0"
      },
      redirect: "follow",
      signal: AbortSignal.timeout(1e4)
    });
    if (!response.ok) return "";
    const contentLength = Number(response.headers.get("content-length") ?? 0);
    if (contentLength > maxArtworkBytes) return "";
    const input = Buffer.from(await response.arrayBuffer());
    if (!input.length || input.length > maxArtworkBytes) return "";
    const image = await sharp(input, { failOn: "none" }).rotate().resize(artworkSize, artworkSize, { fit: "cover" }).webp({ quality: 80, effort: 2 }).toBuffer();
    return `data:image/webp;base64,${image.toString("base64")}`;
  } catch {
    return "";
  }
}

// src/player/PlayerHtml.ts
import { readFile } from "node:fs/promises";
import path from "node:path";
async function buildPlayerHtml(input) {
  const [template, styles, script] = await Promise.all([
    asset("player.html"),
    asset("player.css"),
    asset("player.js")
  ]);
  const title = escapeHtml(input.title || "Unknown");
  const artist = escapeHtml(input.artist || "Unknown");
  const image = input.imageDataUrl ?? "";
  const cover = image ? `<img class="player-cover" src="${escapeHtml(image)}" alt="${title}">` : `<div class="player-cover"></div>`;
  const backdrop = image ? `<img class="player-backdrop-image" src="${escapeHtml(image)}" alt="">` : "";
  const data = safeJson({
    socketUrl: input.socketUrl,
    mimeType: input.mimeType || "audio/mp4",
    lyrics: input.lyrics.map((line) => ({
      start_ms: line.startMs,
      end_ms: line.endMs,
      text: line.text
    }))
  });
  const body = template.replaceAll("{{BACKDROP}}", backdrop).replaceAll("{{COVER}}", cover).replaceAll("{{TITLE}}", title).replaceAll("{{ARTIST}}", artist).replaceAll("{{DURATION}}", formatDuration(input.durationMs));
  return `<style>
${styles}
</style>
${body}
<script>window.__SNOWKIT_PLAYER__=${data}</script>
<script>
${script}
</script>`;
}
async function asset(name) {
  try {
    const url = new URL(`../../assets/${name}`, import.meta.url);
    return await readFile(url, "utf8");
  } catch {
    try {
      const rootPath = path.resolve(process.cwd(), "assets", name);
      return await readFile(rootPath, "utf8");
    } catch {
      const distPath = path.resolve(process.cwd(), "dist", "assets", name);
      return await readFile(distPath, "utf8");
    }
  }
}
function formatDuration(durationMs) {
  const total = Math.max(0, Math.floor((durationMs ?? 0) / 1e3));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}
function escapeHtml(value) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}
function safeJson(value) {
  return JSON.stringify(value).replace(/</g, "\\u003c").replace(/>/g, "\\u003e").replace(/&/g, "\\u0026");
}

// src/rich/RichHtmlPayload.ts
import { randomUUID } from "node:crypto";
function createRichHtmlPayload(options) {
  const html = options.html.trim();
  const title = options.title.trim();
  if (!html || !title) throw new Error("Rich HTML exige HTML e t\xEDtulo n\xE3o vazios.");
  const responseId = `${options.id?.trim() || "snowkit-player"}-${randomUUID()}`;
  const trustedSources = [...new Set((options.trustedSources ?? ["snowkit"]).filter(Boolean))];
  const unified = {
    __typename: "GenAIUnifiedResponse",
    response_id: responseId,
    sections: [
      {
        __typename: "GenAIUnifiedResponseSection",
        view_model: {
          __typename: "GenAISingleLayoutViewModel",
          primitive: {
            __typename: "GenAIaeacdsnwHtmlPrimitive",
            payload: html,
            trusted_sources: trustedSources
          }
        }
      }
    ]
  };
  return {
    messageContextInfo: {
      deviceListMetadata: {},
      deviceListMetadataVersion: 2,
      botMetadata: {
        messageDisclaimerText: options.disclaimer ?? "",
        botResponseId: responseId
      }
    },
    botForwardedMessage: {
      message: {
        richResponseMessage: {
          messageType: 1,
          submessages: [{ messageType: 2, messageText: title }],
          unifiedResponse: {
            data: Buffer.from(JSON.stringify(unified), "utf8").toString("base64")
          },
          contextInfo: {
            forwardingScore: 1,
            isForwarded: true,
            forwardedAiBotMessageInfo: {
              botJid: options.botJid ?? process.env.WHATSAPP_BOT_JID ?? "867051314767696@bot"
            },
            forwardOrigin: 4
          }
        }
      }
    }
  };
}

// src/bot/whatsappBot.ts
import {
  makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion
} from "@whiskeysockets/baileys";
import pino from "pino";
import path2 from "node:path";
import fs from "node:fs";

// src/adapters/BaileysRichHtmlSender.ts
var BaileysRichHtmlSender = class {
  #socket;
  constructor(socket) {
    this.#socket = socket;
  }
  send(jid, options) {
    return this.#socket.relayMessage(jid, createRichHtmlPayload(options), {});
  }
};

// src/player/SnowKitWhatsAppPlayer.ts
var SnowKitWhatsAppPlayer = class {
  #music;
  #sender;
  constructor(sender, config) {
    this.#sender = sender;
    this.#music = new SnowKitMusic(config);
  }
  async send(chatId, input, quote) {
    const song = await this.#music.resolve(input);
    const session = await this.#music.ready(song.id);
    const artist = artistNames(song);
    const artwork = await inlineArtwork(artworkUrl(song));
    const html = await buildPlayerHtml({
      title: song.title,
      artist,
      durationMs: session.audio.durationMs ?? song.durationMs,
      socketUrl: session.audio.socketUrl,
      mimeType: session.audio.contentType,
      imageDataUrl: artwork,
      lyrics: session.lyrics.lines
    });
    await this.#sender.send(
      chatId,
      {
        html,
        title: `\u{1F3B5} ${song.title} \u2014 ${artist}`,
        id: "dikadev-player",
        disclaimer: process.env.PLAYER_DISCLAIMER || "DikaDev Player",
        trustedSources: []
      },
      quote
    );
  }
};
function artistNames(song) {
  return song.artists.map((artist) => artist.name).join(", ") || "artista desconhecido";
}
function artworkUrl(song) {
  return song.artwork?.url ?? song.album?.images[0]?.url;
}

// src/bot/whatsappBot.ts
var currentSocket = null;
var isConnecting = false;
var reconnectTimer = null;
if (!globalThis.__WA_GLOBAL_HANDLERS__) {
  ;
  globalThis.__WA_GLOBAL_HANDLERS__ = true;
  process.on("unhandledRejection", (reason) => {
    console.error("[WhatsApp Bot] \u26A0\uFE0F Unhandled Promise Rejection:", reason);
  });
  process.on("uncaughtException", (error) => {
    console.error("[WhatsApp Bot] \u26A0\uFE0F Uncaught Exception:", error);
  });
}
function extractMessageText(message) {
  if (!message) return "";
  if (message.ephemeralMessage?.message) {
    return extractMessageText(message.ephemeralMessage.message);
  }
  if (message.viewOnceMessage?.message) {
    return extractMessageText(message.viewOnceMessage.message);
  }
  if (message.viewOnceMessageV2?.message) {
    return extractMessageText(message.viewOnceMessageV2.message);
  }
  if (message.documentWithCaptionMessage?.message) {
    return extractMessageText(message.documentWithCaptionMessage.message);
  }
  if (message.editedMessage?.message) {
    return extractMessageText(message.editedMessage.message);
  }
  if (message.conversation) return message.conversation;
  if (message.extendedTextMessage?.text) return message.extendedTextMessage.text;
  if (message.imageMessage?.caption) return message.imageMessage.caption;
  if (message.videoMessage?.caption) return message.videoMessage.caption;
  if (message.documentMessage?.caption) return message.documentMessage.caption;
  if (message.buttonsResponseMessage?.selectedDisplayText) {
    return message.buttonsResponseMessage.selectedDisplayText;
  }
  if (message.buttonsResponseMessage?.selectedButtonId) {
    return message.buttonsResponseMessage.selectedButtonId;
  }
  if (message.templateButtonReplyMessage?.selectedId) {
    return message.templateButtonReplyMessage.selectedId;
  }
  if (message.listResponseMessage?.title) {
    return message.listResponseMessage.title;
  }
  if (message.listResponseMessage?.singleSelectReply?.selectedRowId) {
    return message.listResponseMessage.singleSelectReply.selectedRowId;
  }
  if (message.interactiveResponseMessage?.body?.text) {
    return message.interactiveResponseMessage.body.text;
  }
  return "";
}
async function startWhatsAppBot() {
  const botNumberRaw = process.env.BOT_NUMBER || "";
  const enableBot = process.env.ENABLE_WHATSAPP_BOT === "true" || botNumberRaw.trim().length > 0;
  if (!enableBot) {
    console.log("\n=======================================================");
    console.log("\u2139\uFE0F  WHATSAPP BOT BELUM DIAKTIFKAN");
    console.log("Untuk mengaktifkan bot WhatsApp dan mendapatkan PAIRING CODE:");
    console.log("Edit file .env di menu Files Senzhosting, tambahkan:");
    console.log('BOT_NUMBER="628xxxxxxxxxx"   (Nomor WhatsApp bot Anda, diawali 62)');
    console.log("Lalu klik Restart di panel Console.");
    console.log("=======================================================\n");
    return;
  }
  if (isConnecting) {
    console.log("[WhatsApp Bot] \u23F3 Proses koneksi sedang berjalan, mengabaikan panggilan duplikat...");
    return;
  }
  isConnecting = true;
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  if (currentSocket) {
    try {
      console.log("[WhatsApp Bot] Menutup koneksi socket sebelumnya...");
      currentSocket.ev.removeAllListeners("connection.update");
      currentSocket.ev.removeAllListeners("messages.upsert");
      currentSocket.ev.removeAllListeners("creds.update");
      currentSocket.end?.(new Error("Reconnecting Baileys"));
    } catch {
    }
    currentSocket = null;
  }
  const cleanedNumber = botNumberRaw.replace(/[^0-9]/g, "");
  if (!cleanedNumber) {
    isConnecting = false;
    console.error("\u274C BOT_NUMBER tidak valid. Masukkan nomor HP dengan format angka (contoh: 6281234567890).");
    return;
  }
  const sessionDir = path2.resolve(process.cwd(), "auth_session");
  if (!fs.existsSync(sessionDir)) {
    fs.mkdirSync(sessionDir, { recursive: true });
  }
  try {
    const { state, saveCreds } = await useMultiFileAuthState(sessionDir);
    const { version, isLatest } = await fetchLatestBaileysVersion().catch(() => ({
      version: [2, 3e3, 1017531287],
      isLatest: false
    }));
    console.log(`[WhatsApp Bot] Memulai Baileys (WA Version: ${version.join(".")}, isLatest: ${isLatest})...`);
    const sock = makeWASocket({
      version,
      auth: state,
      logger: pino({ level: "silent" }),
      printQRInTerminal: false,
      browser: ["Ubuntu", "Chrome", "20.0.04"],
      // Opsi kestabilan jaringan & anti-zombie connection
      syncFullHistory: false,
      emitOwnEvents: true,
      // Wajib agar pesan dari HP sendiri (fromMe) juga diproses
      markOnlineOnConnect: true,
      keepAliveIntervalMs: 25e3,
      // Ping WhatsApp setiap 25 detik agar koneksi tidak drop/idle timeout
      connectTimeoutMs: 6e4,
      defaultQueryTimeoutMs: 6e4,
      retryRequestDelayMs: 500,
      maxMsgRetryCount: 5,
      generateHighQualityLinkPreview: true
    });
    currentSocket = sock;
    isConnecting = false;
    const sender = new BaileysRichHtmlSender(sock);
    const player = new SnowKitWhatsAppPlayer(sender, {
      endpoint: process.env.SNOWKIT_ENDPOINT ?? "https://snow.kairogg.com.br",
      token: process.env.SNOWKIT_TOKEN ?? "",
      market: "ID"
    });
    if (!sock.authState.creds.registered) {
      setTimeout(async () => {
        try {
          console.log(`[WhatsApp Bot] Meminta pairing code untuk nomor: ${cleanedNumber}...`);
          const code = await sock.requestPairingCode(cleanedNumber);
          console.log("\n=======================================================");
          console.log("\u{1F525} WHATSAPP PAIRING CODE ANDA: \u{1F525}");
          console.log(`           >>>  ${code}  <<<`);
          console.log("=======================================================");
          console.log("\u{1F449} Cara Menghubungkan:");
          console.log("1. Buka WhatsApp di HP Anda.");
          console.log("2. Buka menu Perangkat Tertaut (Linked Devices).");
          console.log("3. Pilih 'Tautkan dengan nomor telepon' (Link with phone number instead).");
          console.log(`4. Masukkan kode di atas: ${code}`);
          console.log("=======================================================\n");
        } catch (err) {
          console.error("\u274C Gagal mendapatkan pairing code:", err?.message || err);
          console.log("Pastikan nomor diawali kode negara (misal 62) tanpa spasi atau strip.");
        }
      }, 4e3);
    }
    sock.ev.on("creds.update", saveCreds);
    sock.ev.on("connection.update", (update) => {
      const { connection, lastDisconnect } = update;
      if (connection === "close") {
        const error = lastDisconnect?.error;
        const statusCode = error?.output?.statusCode ?? error?.statusCode;
        const isLoggedOut = statusCode === DisconnectReason.loggedOut;
        const reasonStr = DisconnectReason[statusCode] || `Code ${statusCode}`;
        console.log(`[WhatsApp Bot] \u26A0\uFE0F Koneksi terputus: ${reasonStr} (${statusCode}). Auto-reconnect: ${!isLoggedOut}`);
        if (!isLoggedOut) {
          const delay = statusCode === DisconnectReason.restartRequired ? 2e3 : 5e3;
          reconnectTimer = setTimeout(() => {
            startWhatsAppBot().catch((err) => {
              console.error("[WhatsApp Bot] Gagal menghubungkan ulang:", err);
            });
          }, delay);
        } else {
          console.log("\u274C Sesi WhatsApp telah Logout (401). Hapus folder auth_session untuk pairing ulang.");
        }
      } else if (connection === "open") {
        console.log("\n=======================================================");
        console.log("\u2705 WHATSAPP BOT BERHASIL TERHUBUNG & AKTIF!");
        console.log(`Nomor Bot: ${sock.user?.id?.split(":")[0] || cleanedNumber}`);
        console.log("Status: Siap menerima perintah (.play <lagu>, .menu, .ping)");
        console.log("=======================================================\n");
      }
    });
    sock.ev.on("messages.upsert", async (m) => {
      try {
        const messages = m.messages || [];
        for (const msg of messages) {
          if (!msg || !msg.message) continue;
          const jid = msg.key.remoteJid;
          if (!jid || jid === "status@broadcast") continue;
          const rawText = extractMessageText(msg.message);
          const trimmed = rawText.trim();
          if (!trimmed) continue;
          if (trimmed.startsWith("\u{1F3B5} Mencari & memutar") || trimmed.startsWith("\u{1F3A7} *DIKADEV") || trimmed.startsWith("\u{1F3A7} *SNOWKIT") || trimmed.startsWith("\u26A0\uFE0F *Gagal memutar") || trimmed.startsWith("\u{1F3D3} *Pong!*")) {
            continue;
          }
          const isCommand = /^[.#!/](play|menu|help|bot|ping)\b/i.test(trimmed);
          if (msg.key.fromMe && !isCommand) {
            continue;
          }
          try {
            await sock.readMessages([msg.key]);
          } catch {
          }
          console.log(`[WhatsApp Bot] \u{1F4E9} Pesan diterima dari ${jid} (fromMe: ${Boolean(msg.key.fromMe)}): "${trimmed}"`);
          if (/^[.#!/]ping$/i.test(trimmed)) {
            const start = Date.now();
            await sock.sendMessage(
              jid,
              { text: `\u{1F3D3} *Pong!*
\u2022 Status: Online & Aktif
\u2022 Latensi: ${Date.now() - start}ms
\u2022 Player: DikaDev Lock Screen` },
              { quoted: msg }
            );
            continue;
          }
          const playMatch = trimmed.match(/^[.#!/]play\s+(.+)$/i);
          if (playMatch) {
            const query = playMatch[1].trim();
            console.log(`[WhatsApp Bot] \u{1F3B5} Memproses pemutaran lagu: "${query}" untuk ${jid}`);
            await sock.sendMessage(
              jid,
              {
                text: `\u{1F3B5} Mencari & memutar: *${query}*...
_Tunggu sebentar sedang menyiapkan player interaktif DikaDev..._`
              },
              { quoted: msg }
            );
            try {
              const sendPromise = player.send(jid, query, msg);
              const timeoutPromise = new Promise(
                (_, reject) => setTimeout(() => reject(new Error("Timeout: SnowKit membutuhkan waktu lebih dari 45 detik")), 45e3)
              );
              await Promise.race([sendPromise, timeoutPromise]);
              console.log(`[WhatsApp Bot] \u2705 Sukses mengirim player untuk query "${query}" ke ${jid}`);
            } catch (err) {
              console.error(`[WhatsApp Bot] \u274C Gagal mengirim player:`, err?.message || err);
              await sock.sendMessage(
                jid,
                {
                  text: `\u26A0\uFE0F *Gagal memutar lagu:*
${err?.message || "Koneksi ke endpoint musik gagal"}

\u{1F4A1} *Solusi:*
1. Coba judul lagu lain atau sertakan nama penyanyi (contoh: \`.play Kelingan Mantan NDX\`).
2. Pastikan \`SNOWKIT_ENDPOINT\` di file \`.env\` aktif dan dapat diakses.`
                },
                { quoted: msg }
              );
            }
            continue;
          }
          if (/^[.#!/](menu|help|bot)$/i.test(trimmed)) {
            console.log(`[WhatsApp Bot] \u{1F4D6} Mengirim menu ke ${jid}`);
            const helpText = `\u{1F3A7} *DIKADEV WHATSAPP MUSIC PLAYER*

Hai! Bot ini memutar lagu dengan UI player interaktif ala Apple Lock Screen langsung di WhatsApp.

*Daftar Perintah:*\\n\u2022 *.play <judul lagu atau link spotify>*
  _Contoh:_ \`.play Kelingan Mantan NDX\`
  _Contoh:_ \`.play Nina .Feast\`
  _Contoh:_ \`.play Bohemian Rhapsody\`

\u2022 *.ping*
  _Cek status keaktifan & latensi bot_

\u2022 *.menu* atau *.help*
  _Menampilkan bantuan ini_

_Output Audio: DikaDev AirPlay_ \u{1F680}`;
            await sock.sendMessage(jid, { text: helpText }, { quoted: msg });
            continue;
          }
        }
      } catch (e) {
        console.error("[WhatsApp Bot] Error saat menangani pesan masuk:", e);
      }
    });
  } catch (err) {
    isConnecting = false;
    console.error("[WhatsApp Bot] \u274C Gagal menginisialisasi Baileys:", err);
    reconnectTimer = setTimeout(() => {
      startWhatsAppBot().catch(() => {
      });
    }, 1e4);
  }
}

// server.ts
dotenv.config();
var PORT = process.env.SERVER_PORT ? Number(process.env.SERVER_PORT) : 3e3;
var DEMO_TRACKS = [
  {
    id: "demo-track-nina",
    title: "Nina",
    artist: ".Feast",
    durationMs: 278e3,
    artworkUrl: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80",
    lyrics: [
      { startMs: 0, endMs: 8e3, text: "Saat dewasa kau 'kan mengerti" },
      { startMs: 8e3, endMs: 16e3, text: "Kerasnya hidup di dunia ini" },
      { startMs: 16e3, endMs: 25e3, text: "Tapi tenanglah, kau tak sendiri" },
      { startMs: 25e3, endMs: 36e3, text: "Ada pelukan yang selalu menanti" },
      { startMs: 36e3, endMs: 48e3, text: "Tumbuhlah jadi yang kau mau, Nina..." }
    ]
  },
  {
    id: "demo-track-1",
    title: "Hati-Hati di Jalan",
    artist: "Tulus",
    durationMs: 242e3,
    artworkUrl: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600&auto=format&fit=crop&q=80",
    lyrics: [
      { startMs: 0, endMs: 8e3, text: "Kukira kita akan bersama" },
      { startMs: 8e3, endMs: 16e3, text: "Begitu banyak yang sama" },
      { startMs: 16e3, endMs: 24e3, text: "Latarmu dan latarku" },
      { startMs: 24e3, endMs: 33e3, text: "Kukira takkan ada kendala" },
      { startMs: 33e3, endMs: 42e3, text: "Kukira ini kan mudah" },
      { startMs: 42e3, endMs: 5e4, text: "Kau aku jadi kita" },
      { startMs: 5e4, endMs: 59e3, text: "Kukira kita akan bersama" },
      { startMs: 59e3, endMs: 7e4, text: "Hati-hati di jalan..." }
    ]
  },
  {
    id: "demo-track-2",
    title: "Garota de Ipanema",
    artist: "Ant\xF4nio Carlos Jobim & Vinicius de Moraes",
    durationMs: 195e3,
    artworkUrl: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=600&auto=format&fit=crop&q=80",
    lyrics: [
      { startMs: 0, endMs: 1e4, text: "Olha que coisa mais linda, mais cheia de gra\xE7a" },
      { startMs: 1e4, endMs: 19e3, text: "\xC9 ela, menina, que vem e que passa" },
      { startMs: 19e3, endMs: 29e3, text: "Num doce balan\xE7o a caminho do mar" },
      { startMs: 29e3, endMs: 38e3, text: "Mo\xE7a do corpo dourado do sol de Ipanema" },
      { startMs: 38e3, endMs: 48e3, text: "O seu balan\xE7ado \xE9 mais que um poema" },
      { startMs: 48e3, endMs: 6e4, text: "\xC9 a coisa mais linda que eu j\xE1 vi passar..." }
    ]
  },
  {
    id: "demo-track-3",
    title: "Blinding Lights",
    artist: "The Weeknd",
    durationMs: 2e5,
    artworkUrl: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80",
    lyrics: [
      { startMs: 0, endMs: 12e3, text: "Yeah..." },
      { startMs: 12e3, endMs: 24e3, text: "I've been tryna call" },
      { startMs: 24e3, endMs: 34e3, text: "I've been on my own for long enough" },
      { startMs: 34e3, endMs: 45e3, text: "Maybe you can show me how to love, maybe" },
      { startMs: 45e3, endMs: 56e3, text: "I'm going through withdrawals" },
      { startMs: 56e3, endMs: 68e3, text: "You don't even have to do too much" },
      { startMs: 68e3, endMs: 8e4, text: "I said, ooh, I'm blinded by the lights!" }
    ]
  }
];
async function startServer() {
  const app = express();
  app.use(express.json({ limit: "10mb" }));
  app.use("/assets", express.static(path3.resolve(process.cwd(), "assets")));
  app.get("/api/download-zip", (_req, res) => {
    const zipPath = path3.resolve(process.cwd(), "public", "masdik75-whatsapp-player.zip");
    res.setHeader("Content-Type", "application/zip");
    res.setHeader("Content-Disposition", 'attachment; filename="masdik75-whatsapp-player.zip"');
    res.download(zipPath, "masdik75-whatsapp-player.zip", (err) => {
      if (err && !res.headersSent) {
        res.status(500).json({ error: "Could not send zip file" });
      }
    });
  });
  app.get("/api/download-zip-base64", (_req, res) => {
    const zipPath = path3.resolve(process.cwd(), "public", "masdik75-whatsapp-player.zip");
    if (fs2.existsSync(zipPath)) {
      const fileBuffer = fs2.readFileSync(zipPath);
      res.json({
        success: true,
        filename: "masdik75-whatsapp-player.zip",
        size: fileBuffer.length,
        base64: fileBuffer.toString("base64")
      });
    } else {
      res.status(404).json({ error: "Zip not found" });
    }
  });
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", service: "SnowKit WhatsApp Player" });
  });
  app.get("/api/config", (_req, res) => {
    const endpoint = process.env.SNOWKIT_ENDPOINT || "https://snow.kairogg.com.br";
    const hasToken = Boolean(process.env.SNOWKIT_TOKEN && process.env.SNOWKIT_TOKEN.trim().length > 0 && process.env.SNOWKIT_TOKEN !== "cole_seu_token_aqui" && process.env.SNOWKIT_TOKEN !== "MY_SNOWKIT_TOKEN");
    res.json({
      endpoint,
      hasToken,
      defaultMarket: "BR"
    });
  });
  app.get("/api/demo-tracks", (_req, res) => {
    res.json({ data: DEMO_TRACKS });
  });
  app.post("/api/player/resolve", async (req, res) => {
    try {
      const { input, endpoint, token, market } = req.body || {};
      const targetEndpoint = (endpoint || process.env.SNOWKIT_ENDPOINT || "https://snow.kairogg.com.br").trim();
      const targetToken = (token || process.env.SNOWKIT_TOKEN || "").trim();
      const targetMarket = (market || "BR").trim();
      const hasRealToken = targetToken.length > 0 && targetToken !== "cole_seu_token_aqui" && targetToken !== "MY_SNOWKIT_TOKEN";
      if (hasRealToken) {
        const client = new SnowKitMusic({
          endpoint: targetEndpoint,
          token: targetToken,
          market: targetMarket
        });
        const song = await client.resolve(input);
        return res.json({
          source: "snowkit",
          song: {
            id: song.id,
            title: song.title,
            artist: song.artists?.map((a) => a.name).join(", ") || "Unknown Artist",
            artworkUrl: song.artwork?.url || song.album?.images?.[0]?.url,
            durationMs: song.durationMs
          }
        });
      }
      const normalizedInput = (input || "").toLowerCase().trim();
      let matched = DEMO_TRACKS.find(
        (t) => t.title.toLowerCase().includes(normalizedInput) || t.artist.toLowerCase().includes(normalizedInput)
      );
      if (!matched) {
        matched = {
          ...DEMO_TRACKS[0],
          id: `demo-${Date.now()}`,
          title: input ? input.slice(0, 40) : DEMO_TRACKS[0].title
        };
      }
      res.json({
        source: "demo",
        isDemo: true,
        message: "Demo track resolved (SnowKit API token not set, using simulated preview session)",
        song: matched
      });
    } catch (err) {
      console.error("Resolve error:", err);
      const message = err instanceof Error ? err.message : String(err);
      res.status(400).json({ error: message });
    }
  });
  app.post("/api/player/build", async (req, res) => {
    try {
      const {
        title,
        artist,
        durationMs,
        artworkUrl: artworkUrl2,
        lyrics = [],
        socketUrl,
        mimeType = "audio/mp4",
        disclaimer = "SnowKit WhatsApp Player",
        botJid = "867051314767696@bot",
        trustedSources = ["snowkit"]
      } = req.body || {};
      let imageDataUrl = "";
      if (artworkUrl2) {
        try {
          imageDataUrl = await inlineArtwork(artworkUrl2);
        } catch (artErr) {
          console.warn("Artwork inline failed, continuing without base64:", artErr);
        }
      }
      const formattedLyrics = Array.isArray(lyrics) ? lyrics.map((l) => ({
        startMs: Number(l.startMs ?? l.start_ms ?? 0),
        endMs: l.endMs != null || l.end_ms != null ? Number(l.endMs ?? l.end_ms) : null,
        text: String(l.text ?? "")
      })) : [];
      const html = await buildPlayerHtml({
        title: title || "Unknown Title",
        artist: artist || "Unknown Artist",
        durationMs: durationMs || 18e4,
        socketUrl: socketUrl || "wss://snow.kairogg.com.br/ws/player/demo",
        mimeType,
        imageDataUrl,
        lyrics: formattedLyrics
      });
      const payloadOptions = {
        html,
        title: `\u{1F3B5} ${title || "Music"} \u2014 ${artist || "Artist"}`,
        id: "snowkit-music-player",
        disclaimer,
        trustedSources,
        botJid
      };
      const rawPayload = createRichHtmlPayload(payloadOptions);
      res.json({
        html,
        title,
        artist,
        durationMs,
        imageDataUrl,
        rawPayload,
        payloadOptions
      });
    } catch (err) {
      console.error("Build player error:", err);
      const message = err instanceof Error ? err.message : String(err);
      res.status(500).json({ error: message });
    }
  });
  app.get("/api/docs", async (_req, res) => {
    try {
      const [readmeId, readmePt, zapoExample, baileysExample] = await Promise.all([
        readFile2(path3.resolve(process.cwd(), "README.id-ID.md"), "utf8").catch(() => ""),
        readFile2(path3.resolve(process.cwd(), "README.pt-BR.md"), "utf8").catch(() => ""),
        readFile2(path3.resolve(process.cwd(), "examples/zapo.ts"), "utf8").catch(() => ""),
        readFile2(path3.resolve(process.cwd(), "examples/baileys.ts"), "utf8").catch(() => "")
      ]);
      res.json({
        readmeId,
        readmePt,
        examples: {
          zapo: zapoExample,
          baileys: baileysExample
        }
      });
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path3.resolve(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path3.join(distPath, "index.html"));
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`SnowKit WhatsApp Player running on http://0.0.0.0:${PORT}`);
    startWhatsAppBot().catch((err) => {
      console.error("[WhatsApp Bot] Gagal memulai bot:", err);
    });
  });
}
startServer();
//# sourceMappingURL=server.js.map
