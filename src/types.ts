export interface LyricLine {
  startMs: number
  endMs: number | null
  text: string
}

export interface PlayerTrack {
  id: string
  title: string
  artist: string
  durationMs: number
  artworkUrl?: string
  lyrics: LyricLine[]
  socketUrl?: string
  mimeType?: string
}

export interface SnowKitConfigResponse {
  endpoint: string
  hasToken: boolean
  defaultMarket: string
}

export interface BuildPlayerResponse {
  html: string
  title: string
  artist: string
  durationMs: number
  imageDataUrl: string
  rawPayload: Record<string, unknown>
  payloadOptions: {
    html: string
    title: string
    id: string
    disclaimer: string
    trustedSources: string[]
    botJid: string
  }
}

export interface DocsResponse {
  readmeId: string
  readmePt: string
  examples: {
    zapo: string
    baileys: string
  }
}
