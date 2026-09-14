import { useState, useEffect, useCallback } from "react"
import { Header } from "./components/Header"
import { TrackSelector } from "./components/TrackSelector"
import { PlayerPreview } from "./components/PlayerPreview"
import { PayloadViewer } from "./components/PayloadViewer"
import { DocsViewer } from "./components/DocsViewer"
import type { PlayerTrack, BuildPlayerResponse, SnowKitConfigResponse } from "./types"

const DEFAULT_TRACK: PlayerTrack = {
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
}

export default function App() {
  const [config, setConfig] = useState<SnowKitConfigResponse>({
    endpoint: "https://snow.kairogg.com.br",
    hasToken: false,
    defaultMarket: "BR"
  })
  const [demoTracks, setDemoTracks] = useState<PlayerTrack[]>([DEFAULT_TRACK])
  const [currentTrack, setCurrentTrack] = useState<PlayerTrack>(DEFAULT_TRACK)
  const [buildData, setBuildData] = useState<BuildPlayerResponse | null>(null)
  const [isBuilding, setIsBuilding] = useState(false)
  const [activeView, setActiveView] = useState<"preview" | "docs">("preview")

  // Load initial config & demo tracks
  useEffect(() => {
    fetch("/api/config")
      .then((r) => r.json())
      .then((cfg) => setConfig(cfg))
      .catch((err) => console.warn("Could not fetch config:", err))

    fetch("/api/demo-tracks")
      .then((r) => r.json())
      .then((res) => {
        if (Array.isArray(res.data) && res.data.length > 0) {
          setDemoTracks(res.data)
          setCurrentTrack(res.data[0])
          buildPlayer(res.data[0])
        } else {
          buildPlayer(DEFAULT_TRACK)
        }
      })
      .catch(() => {
        buildPlayer(DEFAULT_TRACK)
      })
  }, [])

  const buildPlayer = useCallback(async (trackToBuild?: PlayerTrack) => {
    const target = trackToBuild || currentTrack
    setIsBuilding(true)
    try {
      const res = await fetch("/api/player/build", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: target.title,
          artist: target.artist,
          durationMs: target.durationMs,
          artworkUrl: target.artworkUrl,
          lyrics: target.lyrics,
          socketUrl: target.socketUrl,
          mimeType: target.mimeType || "audio/mp4"
        })
      })

      const data = await res.json()
      if (res.ok) {
        setBuildData(data)
      } else {
        console.error("Build failed:", data.error)
      }
    } catch (err) {
      console.error("Error building player:", err)
    } finally {
      setIsBuilding(false)
    }
  }, [currentTrack])

  return (
    <div className="min-h-screen bg-zinc-100/70 text-zinc-900 flex flex-col font-sans">
      <Header
        endpoint={config.endpoint}
        hasToken={config.hasToken}
        activeView={activeView}
        setActiveView={setActiveView}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6">
        {activeView === "docs" ? (
          <DocsViewer />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left column: Controls, Settings & Payloads */}
            <div className="lg:col-span-7 space-y-6">
              <TrackSelector
                currentTrack={currentTrack}
                onTrackChange={setCurrentTrack}
                demoTracks={demoTracks}
                onBuild={buildPlayer}
                isBuilding={isBuilding}
                hasToken={config.hasToken}
              />

              <PayloadViewer
                buildData={buildData}
                trackTitle={`${currentTrack.title} - ${currentTrack.artist}`}
              />
            </div>

            {/* Right column: Phone Frame & Live Interactive Player Preview */}
            <div className="lg:col-span-5 lg:sticky lg:top-20">
              <PlayerPreview
                html={buildData?.html || ""}
                title={currentTrack.title}
                artist={currentTrack.artist}
                isBuilding={isBuilding}
              />
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
