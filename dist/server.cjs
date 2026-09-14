var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server.ts
var import_express = __toESM(require("express"), 1);
var import_node_path3 = __toESM(require("node:path"), 1);
var import_node_fs3 = __toESM(require("node:fs"), 1);
var import_promises3 = require("node:fs/promises");
var import_vite = require("vite");
var import_dotenv = __toESM(require("dotenv"), 1);

// node_modules/@luanxdd/snowkit/dist/catalog.js
var toArtwork = (value) => value === null ? null : { ...value };
var toArtist = (value) => ({ ...value });
var toAlbum = (value) => value === null ? null : {
  id: value.id,
  name: value.name,
  releaseDate: value.release_date,
  images: value.images.map((image) => ({ ...image }))
};
var toSong = (value) => ({
  id: value.id,
  object: value.object,
  title: value.title,
  artists: value.artists.map(toArtist),
  album: toAlbum(value.album),
  trackNumber: value.track_number,
  discNumber: value.disc_number,
  durationMs: value.duration_ms,
  explicit: value.explicit,
  isrc: value.isrc,
  artwork: toArtwork(value.artwork)
});
var toArtistDetails = (value) => ({
  id: value.id,
  object: value.object,
  name: value.name,
  images: value.images.map((image) => ({ ...image })),
  genres: [...value.genres],
  popularity: value.popularity,
  followers: value.followers
});
var toAlbumDetails = (value) => ({
  id: value.id,
  object: value.object,
  name: value.name,
  artists: value.artists.map(toArtist),
  albumType: value.album_type,
  releaseDate: value.release_date,
  totalTracks: value.total_tracks,
  images: value.images.map((image) => ({ ...image })),
  label: value.label,
  copyrights: [...value.copyrights]
});
var toLyrics = (value) => ({
  id: value.id,
  object: value.object,
  available: value.available,
  type: value.type,
  synced: value.synced,
  language: value.language,
  text: value.text,
  lines: value.lines.map((line) => ({
    startMs: line.start_ms,
    endMs: line.end_ms,
    text: line.text
  }))
});
var toMeta = (value) => ({
  limit: value.limit,
  offset: value.offset,
  market: value.market,
  ...value.total === void 0 ? {} : { total: value.total },
  hasMore: value.has_more
});
var pageParams = (options) => {
  const params = new URLSearchParams();
  if (options.limit !== void 0)
    params.set("limit", String(options.limit));
  if (options.offset !== void 0)
    params.set("offset", String(options.offset));
  if (options.market !== void 0)
    params.set("market", options.market);
  return params;
};
var resolveParams = (options) => {
  const params = new URLSearchParams();
  if (options.market !== void 0)
    params.set("market", options.market);
  return params.size === 0 ? "" : `?${params}`;
};
var collection = (response, map) => ({
  object: response.object,
  data: response.data.map(map),
  meta: toMeta(response.meta)
});
var SongsCatalog = class {
  transport;
  constructor(transport) {
    this.transport = transport;
  }
  async search(query, options = {}) {
    const params = pageParams({ ...options, limit: options.limit ?? 10 });
    params.set("q", query);
    const response = await this.transport.request(`/v1/catalog/search?${params}`);
    return {
      ...collection(response, toSong),
      meta: {
        ...toMeta(response.meta),
        query: response.meta.query
      }
    };
  }
  async match(input) {
    const body = {
      title: input.title,
      artist: input.artist,
      ...input.album === void 0 ? {} : { album: input.album },
      ...input.durationMs === void 0 ? {} : { duration_ms: input.durationMs },
      ...input.isrc === void 0 ? {} : { isrc: input.isrc },
      ...input.market === void 0 ? {} : { market: input.market }
    };
    return toSong(await this.transport.request("/v1/catalog/songs/match", {
      method: "POST",
      body: JSON.stringify(body)
    }));
  }
  async get(id, options = {}) {
    return toSong(await this.transport.request(`/v1/catalog/songs/${encodeURIComponent(id)}${resolveParams(options)}`));
  }
  async lyrics(id, options = {}) {
    return toLyrics(await this.transport.request(`/v1/catalog/songs/${encodeURIComponent(id)}/lyrics${resolveParams(options)}`));
  }
};
var ArtistsCatalog = class {
  transport;
  constructor(transport) {
    this.transport = transport;
  }
  async search(query, options = {}) {
    const params = pageParams({ ...options, limit: options.limit ?? 10 });
    params.set("q", query);
    const response = await this.transport.request(`/v1/catalog/artists/search?${params}`);
    return {
      ...collection(response, toArtistDetails),
      meta: {
        ...toMeta(response.meta),
        query: response.meta.query
      }
    };
  }
  async get(id) {
    return toArtistDetails(await this.transport.request(`/v1/catalog/artists/${encodeURIComponent(id)}`));
  }
  async albums(id, options = {}) {
    const params = pageParams(options);
    const suffix = params.size === 0 ? "" : `?${params}`;
    const response = await this.transport.request(`/v1/catalog/artists/${encodeURIComponent(id)}/albums${suffix}`);
    return collection(response, toAlbumDetails);
  }
};
var AlbumsCatalog = class {
  transport;
  constructor(transport) {
    this.transport = transport;
  }
  async search(query, options = {}) {
    const params = pageParams({ ...options, limit: options.limit ?? 10 });
    params.set("q", query);
    const response = await this.transport.request(`/v1/catalog/albums/search?${params}`);
    return {
      ...collection(response, toAlbumDetails),
      meta: {
        ...toMeta(response.meta),
        query: response.meta.query
      }
    };
  }
  async get(id, options = {}) {
    return toAlbumDetails(await this.transport.request(`/v1/catalog/albums/${encodeURIComponent(id)}${resolveParams(options)}`));
  }
  async tracks(id, options = {}) {
    const params = pageParams(options);
    const suffix = params.size === 0 ? "" : `?${params}`;
    const response = await this.transport.request(`/v1/catalog/albums/${encodeURIComponent(id)}/songs${suffix}`);
    return collection(response, toSong);
  }
};
var CatalogClient = class {
  transport;
  songs;
  artists;
  albums;
  constructor(transport) {
    this.transport = transport;
    this.songs = new SongsCatalog(transport);
    this.artists = new ArtistsCatalog(transport);
    this.albums = new AlbumsCatalog(transport);
  }
  search(query, options = {}) {
    return this.songs.search(query, options);
  }
  async resolve(value, options = {}) {
    return toSong(await this.transport.request("/v1/catalog/resolve", {
      method: "POST",
      body: JSON.stringify({ value, market: options.market })
    }));
  }
};

// node_modules/@luanxdd/snowkit/dist/downloads.js
var import_node_fs = require("node:fs");
var import_node_stream = require("node:stream");
var import_promises = require("node:stream/promises");

// node_modules/@luanxdd/snowkit/dist/errors.js
var SnowKitError = class extends Error {
  status;
  code;
  requestId;
  constructor(status, code, message, requestId = null) {
    super(message);
    this.status = status;
    this.code = code;
    this.requestId = requestId;
    this.name = "SnowKitError";
  }
};

// node_modules/@luanxdd/snowkit/dist/downloads.js
var artifactFromWire = (value) => ({
  id: value.id,
  object: value.object,
  status: value.status,
  filename: value.filename,
  contentType: value.content_type,
  sizeBytes: value.size_bytes,
  sha256: value.sha256,
  durationSeconds: value.duration_seconds,
  lyrics: value.lyrics,
  url: value.url,
  urlExpiresAt: value.url_expires_at,
  expiresAt: value.expires_at
});
var downloadFromWire = (value) => ({
  id: value.id,
  object: value.object,
  status: value.status,
  songId: value.media?.id ?? null,
  format: value.output.format,
  quality: value.output.quality,
  progress: value.progress,
  cacheStatus: value.cache_status,
  lyrics: value.lyrics,
  artifact: value.artifact === null ? null : artifactFromWire(value.artifact),
  contentUrl: value.content_url,
  statusUrl: value.status_url,
  error: value.error,
  createdAt: value.created_at,
  updatedAt: value.updated_at,
  completedAt: value.completed_at
});
var DownloadsClient = class {
  transport;
  constructor(transport) {
    this.transport = transport;
  }
  async createWith(route, songId, options = {}) {
    return downloadFromWire(await this.transport.request(`/v1/downloads/${route}`, {
      method: "POST",
      body: JSON.stringify({
        song_id: songId,
        response_mode: options.responseMode ?? "async",
        market: options.market
      })
    }));
  }
  create(songId, options = {}) {
    return this.createWith("standard", songId, options);
  }
  createCompatible(songId, options = {}) {
    return this.createWith("compatible", songId, options);
  }
  async get(id) {
    return downloadFromWire(await this.transport.request(`/v1/downloads/${encodeURIComponent(id)}`));
  }
  async wait(id, options = {}) {
    const deadline = Date.now() + (options.timeoutMs ?? 27e5);
    while (Date.now() < deadline) {
      const current = await this.get(id);
      if (["completed", "failed", "cancelled"].includes(current.status))
        return current;
      await new Promise((resolve) => setTimeout(resolve, options.intervalMs ?? 1e3));
    }
    throw new SnowKitError(408, "timeout", "The download did not finish before the timeout.");
  }
  async ready(download, options = {}) {
    const result = download.status === "completed" ? download : await this.wait(download.id, options);
    if (result.status !== "completed" || result.artifact === null) {
      throw new SnowKitError(422, result.error?.code ?? "download_failed", "The download did not produce an artifact.");
    }
    return result.artifact;
  }
  async save(id, destination, options = {}) {
    const artifact = await this.ready(await this.get(id), options);
    const response = await this.transport.fetcher(artifact.url);
    if (!response.ok || response.body === null) {
      throw new SnowKitError(response.status || 502, "artifact_download_failed", "Failed to download the artifact.");
    }
    const output = (0, import_node_fs.createWriteStream)(destination, { flags: "wx", mode: 384 });
    await (0, import_promises.pipeline)(import_node_stream.Readable.fromWeb(response.body), output);
    return artifact;
  }
};

// node_modules/@luanxdd/snowkit/dist/media.js
var MediaClient = class {
  transport;
  constructor(transport) {
    this.transport = transport;
  }
  async search(options) {
    const params = new URLSearchParams({ q: options.q, limit: String(options.limit ?? 10) });
    if (options.type !== void 0)
      params.set("type", options.type);
    if (options.offset !== void 0)
      params.set("offset", String(options.offset));
    if (options.market !== void 0)
      params.set("market", options.market);
    if (options.smart !== void 0)
      params.set("smart", String(options.smart));
    const response = await this.transport.request(`/v1/search?${params}`);
    return {
      object: response.object,
      data: response.data.map((item) => ({
        id: item.id,
        object: item.object,
        type: item.type,
        title: item.title,
        artists: item.artists,
        album: item.album,
        durationMs: item.duration_ms,
        artwork: item.artwork,
        explicit: item.explicit
      })),
      meta: response.meta
    };
  }
  async download(input, options = {}) {
    const created = await this.transport.request("/v1/downloads", {
      method: "POST",
      body: JSON.stringify({
        url: input.url,
        media_id: input.mediaId,
        format: input.format,
        quality: input.quality,
        response_mode: "async"
      })
    });
    const deadline = Date.now() + (options.timeoutMs ?? 27e5);
    let current = created;
    while (!["completed", "failed", "cancelled"].includes(current.status) && Date.now() < deadline) {
      await new Promise((resolve) => setTimeout(resolve, options.intervalMs ?? 1e3));
      current = await this.transport.request(`/v1/downloads/${encodeURIComponent(created.id)}`);
    }
    if (current.status !== "completed" || current.artifact === null) {
      throw new SnowKitError(current.status === "queued" || current.status === "processing" ? 408 : 422, current.error?.code ?? (Date.now() >= deadline ? "timeout" : "download_failed"), "The media download did not produce an artifact.");
    }
    return artifactFromWire(current.artifact);
  }
};

// node_modules/@luanxdd/snowkit/dist/transport.js
var Transport = class {
  fetcher;
  baseUrl;
  timeoutMs;
  token;
  constructor(options) {
    const base = new URL(options.baseUrl);
    if (base.protocol !== "https:" && !["localhost", "127.0.0.1", "::1"].includes(base.hostname)) {
      throw new Error("SnowKit requires HTTPS outside localhost.");
    }
    if (!/^sk_live_[A-Za-z0-9_-]{43}$/.test(options.token)) {
      throw new Error("Invalid SnowKit token.");
    }
    this.baseUrl = options.baseUrl.replace(/\/$/, "");
    this.fetcher = options.fetcher ?? fetch;
    this.timeoutMs = options.timeoutMs ?? 3e4;
    this.token = options.token;
  }
  async request(path4, init = {}) {
    const headers = new Headers(init.headers);
    headers.set("authorization", `Bearer ${this.token}`);
    if (init.body !== void 0)
      headers.set("content-type", "application/json");
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const response = await this.fetcher(`${this.baseUrl}${path4}`, {
        ...init,
        headers,
        signal: controller.signal
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) {
        const nested = body?.error;
        const error = typeof nested === "object" && nested !== null ? nested : body;
        throw new SnowKitError(response.status, typeof error?.code === "string" ? error.code : "request_failed", typeof error?.message === "string" ? error.message : "SnowKit request failed.", typeof error?.request_id === "string" ? error.request_id : null);
      }
      return body;
    } finally {
      clearTimeout(timer);
    }
  }
};

// node_modules/@luanxdd/snowkit/dist/client.js
var SnowKit = class {
  catalog;
  downloads;
  media;
  constructor(options) {
    const transport = new Transport(options);
    this.catalog = new CatalogClient(transport);
    this.downloads = new DownloadsClient(transport);
    this.media = new MediaClient(transport);
  }
};

// node_modules/@luanxdd/snowkit/dist/player.js
var session = (value) => ({
  id: value.id,
  object: value.object,
  status: value.status,
  song: {
    id: value.song.id,
    object: value.song.object,
    title: value.song.title,
    artists: value.song.artists.map((artist) => ({ ...artist })),
    album: value.song.album === null ? null : {
      id: value.song.album.id,
      name: value.song.album.name,
      releaseDate: value.song.album.release_date,
      images: value.song.album.images.map((image) => ({ ...image }))
    },
    trackNumber: value.song.track_number,
    discNumber: value.song.disc_number,
    durationMs: value.song.duration_ms,
    explicit: value.song.explicit,
    isrc: value.song.isrc,
    artwork: value.song.artwork === null ? null : { ...value.song.artwork }
  },
  audio: {
    available: value.audio.available,
    format: value.audio.format,
    quality: value.audio.quality,
    contentType: value.audio.content_type,
    durationMs: value.audio.duration_ms,
    sizeBytes: value.audio.size_bytes,
    streamUrl: value.audio.stream_url,
    socketUrl: value.audio.socket_url,
    urlExpiresAt: value.audio.url_expires_at,
    supportsRange: value.audio.supports_range,
    sha256: value.audio.sha256,
    progress: value.audio.progress
  },
  lyrics: {
    available: value.lyrics.available,
    type: value.lyrics.type,
    synced: value.lyrics.synced,
    language: value.lyrics.language,
    text: value.lyrics.text,
    lines: value.lyrics.lines.map((line) => ({
      startMs: line.start_ms,
      endMs: line.end_ms,
      text: line.text
    }))
  },
  error: value.error
});
var ready = (value) => {
  if (value.status !== "ready" || !value.audio.available || value.audio.contentType === null || value.audio.sizeBytes === null || value.audio.streamUrl === null || value.audio.socketUrl === null || value.audio.urlExpiresAt === null || value.audio.sha256 === null) {
    throw new SnowKitError(422, value.error?.code ?? "playback_not_ready", "Playback is not ready.");
  }
  return {
    ...value,
    status: "ready",
    audio: {
      ...value.audio,
      available: true,
      contentType: value.audio.contentType,
      sizeBytes: value.audio.sizeBytes,
      streamUrl: value.audio.streamUrl,
      socketUrl: value.audio.socketUrl,
      urlExpiresAt: value.audio.urlExpiresAt,
      sha256: value.audio.sha256,
      progress: 100
    }
  };
};
var SnowKitPlayer = class {
  transport;
  constructor(options) {
    this.transport = new Transport(options);
  }
  async prepare(songId, options = {}) {
    return session(await this.transport.request("/v1/player/sessions", {
      method: "POST",
      body: JSON.stringify({
        song_id: songId,
        response_mode: options.responseMode ?? "async",
        market: options.market
      })
    }));
  }
  async get(id) {
    return session(await this.transport.request(`/v1/player/sessions/${encodeURIComponent(id)}`));
  }
  async wait(id, options = {}) {
    const deadline = Date.now() + (options.timeoutMs ?? 27e5);
    while (Date.now() < deadline) {
      const current = await this.get(id);
      if (["ready", "failed", "cancelled"].includes(current.status))
        return current;
      await new Promise((resolve) => setTimeout(resolve, options.intervalMs ?? 1e3));
    }
    throw new SnowKitError(408, "timeout", "Playback did not become ready before the timeout.");
  }
  async ready(songId, options = {}) {
    const initial = await this.prepare(songId, options);
    const final = initial.status === "ready" ? initial : await this.wait(initial.id, options);
    return ready(final);
  }
};

// src/snowkit/SnowKitClient.ts
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
var import_sharp = __toESM(require("sharp"), 1);
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
    const image = await (0, import_sharp.default)(input, { failOn: "none" }).rotate().resize(artworkSize, artworkSize, { fit: "cover" }).webp({ quality: 80, effort: 2 }).toBuffer();
    return `data:image/webp;base64,${image.toString("base64")}`;
  } catch {
    return "";
  }
}

// src/player/PlayerHtml.ts
var import_promises2 = require("node:fs/promises");
var import_node_path = __toESM(require("node:path"), 1);
var import_meta = {};
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
    const url = new URL(`../../assets/${name}`, import_meta.url);
    return await (0, import_promises2.readFile)(url, "utf8");
  } catch {
    try {
      const rootPath = import_node_path.default.resolve(process.cwd(), "assets", name);
      return await (0, import_promises2.readFile)(rootPath, "utf8");
    } catch {
      const distPath = import_node_path.default.resolve(process.cwd(), "dist", "assets", name);
      return await (0, import_promises2.readFile)(distPath, "utf8");
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
var import_node_crypto = require("node:crypto");
function createRichHtmlPayload(options) {
  const html = options.html.trim();
  const title = options.title.trim();
  if (!html || !title) throw new Error("Rich HTML exige HTML e t\xEDtulo n\xE3o vazios.");
  const responseId = `${options.id?.trim() || "snowkit-player"}-${(0, import_node_crypto.randomUUID)()}`;
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
var import_baileys = require("@whiskeysockets/baileys");
var import_pino = __toESM(require("pino"), 1);
var import_node_path2 = __toESM(require("node:path"), 1);
var import_node_fs2 = __toESM(require("node:fs"), 1);

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
    const session2 = await this.#music.ready(song.id);
    const artist = artistNames(song);
    const artwork = await inlineArtwork(artworkUrl(song));
    const html = await buildPlayerHtml({
      title: song.title,
      artist,
      durationMs: session2.audio.durationMs ?? song.durationMs,
      socketUrl: session2.audio.socketUrl,
      mimeType: session2.audio.contentType,
      imageDataUrl: artwork,
      lyrics: session2.lyrics.lines
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
  const sessionDir = import_node_path2.default.resolve(process.cwd(), "auth_session");
  if (!import_node_fs2.default.existsSync(sessionDir)) {
    import_node_fs2.default.mkdirSync(sessionDir, { recursive: true });
  }
  try {
    const { state, saveCreds } = await (0, import_baileys.useMultiFileAuthState)(sessionDir);
    const { version, isLatest } = await (0, import_baileys.fetchLatestBaileysVersion)().catch(() => ({
      version: [2, 3e3, 1017531287],
      isLatest: false
    }));
    console.log(`[WhatsApp Bot] Memulai Baileys (WA Version: ${version.join(".")}, isLatest: ${isLatest})...`);
    const sock = (0, import_baileys.makeWASocket)({
      version,
      auth: state,
      logger: (0, import_pino.default)({ level: "silent" }),
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
        const isLoggedOut = statusCode === import_baileys.DisconnectReason.loggedOut;
        const reasonStr = import_baileys.DisconnectReason[statusCode] || `Code ${statusCode}`;
        console.log(`[WhatsApp Bot] \u26A0\uFE0F Koneksi terputus: ${reasonStr} (${statusCode}). Auto-reconnect: ${!isLoggedOut}`);
        if (!isLoggedOut) {
          const delay = statusCode === import_baileys.DisconnectReason.restartRequired ? 2e3 : 5e3;
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
import_dotenv.default.config();
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
  const app = (0, import_express.default)();
  app.use(import_express.default.json({ limit: "10mb" }));
  app.use("/assets", import_express.default.static(import_node_path3.default.resolve(process.cwd(), "assets")));
  app.get("/api/download-zip", (_req, res) => {
    const zipPath = import_node_path3.default.resolve(process.cwd(), "public", "masdik75-whatsapp-player.zip");
    res.setHeader("Content-Type", "application/zip");
    res.setHeader("Content-Disposition", 'attachment; filename="masdik75-whatsapp-player.zip"');
    res.download(zipPath, "masdik75-whatsapp-player.zip", (err) => {
      if (err && !res.headersSent) {
        res.status(500).json({ error: "Could not send zip file" });
      }
    });
  });
  app.get("/api/download-zip-base64", (_req, res) => {
    const zipPath = import_node_path3.default.resolve(process.cwd(), "public", "masdik75-whatsapp-player.zip");
    if (import_node_fs3.default.existsSync(zipPath)) {
      const fileBuffer = import_node_fs3.default.readFileSync(zipPath);
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
        (0, import_promises3.readFile)(import_node_path3.default.resolve(process.cwd(), "README.id-ID.md"), "utf8").catch(() => ""),
        (0, import_promises3.readFile)(import_node_path3.default.resolve(process.cwd(), "README.pt-BR.md"), "utf8").catch(() => ""),
        (0, import_promises3.readFile)(import_node_path3.default.resolve(process.cwd(), "examples/zapo.ts"), "utf8").catch(() => ""),
        (0, import_promises3.readFile)(import_node_path3.default.resolve(process.cwd(), "examples/baileys.ts"), "utf8").catch(() => "")
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
    const vite = await (0, import_vite.createServer)({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = import_node_path3.default.resolve(process.cwd(), "dist");
    app.use(import_express.default.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(import_node_path3.default.join(distPath, "index.html"));
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
//# sourceMappingURL=server.cjs.map
