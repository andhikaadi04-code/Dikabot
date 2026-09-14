import React, { useState } from "react"
import { Search, Sparkles, Sliders, ChevronDown, ChevronUp, Plus, Trash2, Music2, RefreshCw } from "lucide-react"
import type { PlayerTrack, LyricLine } from "../types"

interface TrackSelectorProps {
  currentTrack: PlayerTrack
  onTrackChange: (track: PlayerTrack) => void
  demoTracks: PlayerTrack[]
  onBuild: (customTrack?: PlayerTrack) => void
  isBuilding: boolean
  hasToken: boolean
}

export const TrackSelector: React.FC<TrackSelectorProps> = ({
  currentTrack,
  onTrackChange,
  demoTracks,
  onBuild,
  isBuilding,
  hasToken
}) => {
  const [searchInput, setSearchInput] = useState("")
  const [isSearching, setIsSearching] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!searchInput.trim()) return

    setIsSearching(true)
    setSearchError(null)

    try {
      const res = await fetch("/api/player/resolve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input: searchInput.trim() })
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || "Failed to resolve track")
      }

      if (data.song) {
        const updated: PlayerTrack = {
          id: data.song.id || `track-${Date.now()}`,
          title: data.song.title || searchInput,
          artist: data.song.artist || "Unknown Artist",
          durationMs: data.song.durationMs || 180000,
          artworkUrl: data.song.artworkUrl || currentTrack.artworkUrl,
          lyrics: data.song.lyrics || currentTrack.lyrics,
          socketUrl: currentTrack.socketUrl,
          mimeType: currentTrack.mimeType
        }
        onTrackChange(updated)
        onBuild(updated)
      }
    } catch (err: unknown) {
      setSearchError(err instanceof Error ? err.message : "Error searching track")
    } finally {
      setIsSearching(false)
    }
  }

  const handlePresetSelect = (track: PlayerTrack) => {
    onTrackChange(track)
    onBuild(track)
  }

  const updateField = <K extends keyof PlayerTrack>(key: K, value: PlayerTrack[K]) => {
    const updated = { ...currentTrack, [key]: value }
    onTrackChange(updated)
  }

  const addLyricLine = () => {
    const last = currentTrack.lyrics[currentTrack.lyrics.length - 1]
    const nextStart = last ? (last.endMs ?? last.startMs + 5000) : 0
    const newLine: LyricLine = {
      startMs: nextStart,
      endMs: nextStart + 5000,
      text: "New lyric phrase"
    }
    updateField("lyrics", [...currentTrack.lyrics, newLine])
  }

  const updateLyric = (index: number, key: keyof LyricLine, val: string | number | null) => {
    const nextLyrics = currentTrack.lyrics.map((line, i) => {
      if (i !== index) return line
      return { ...line, [key]: val }
    })
    updateField("lyrics", nextLyrics)
  }

  const removeLyric = (index: number) => {
    updateField("lyrics", currentTrack.lyrics.filter((_, i) => i !== index))
  }

  return (
    <div className="bg-white rounded-xl border border-zinc-200 shadow-xs overflow-hidden">
      <div className="p-4 sm:p-5 border-b border-zinc-100">
        <h2 className="text-sm font-semibold text-zinc-900 flex items-center gap-2 mb-1">
          <Music2 className="w-4 h-4 text-emerald-600" />
          <span>Track Selection & SnowKit Resolver</span>
        </h2>
        <p className="text-xs text-zinc-500">
          Search via SnowKit API or paste Spotify URL (<code className="bg-zinc-100 px-1 py-0.5 rounded text-[11px]">https://open.spotify.com/track/...</code>)
        </p>

        {/* Search bar */}
        <form onSubmit={handleSearch} className="mt-3 flex gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search track name, artist, or paste Spotify link..."
              className="w-full pl-9 pr-3 py-2 text-xs bg-zinc-50 border border-zinc-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-zinc-900 placeholder:text-zinc-400"
            />
          </div>
          <button
            type="submit"
            disabled={isSearching}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 shadow-xs shrink-0"
          >
            {isSearching ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Resolving...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5" />
                <span>Resolve</span>
              </>
            )}
          </button>
        </form>

        {searchError && (
          <div className="mt-2 text-xs text-red-600 bg-red-50 border border-red-200 p-2 rounded-md">
            {searchError}
          </div>
        )}

        {/* Demo track presets */}
        <div className="mt-3">
          <div className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider mb-2">
            Quick Sample Presets
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {demoTracks.map((track) => {
              const isSelected = currentTrack.id === track.id
              return (
                <button
                  key={track.id}
                  onClick={() => handlePresetSelect(track)}
                  className={`text-left p-2.5 rounded-lg border text-xs transition-all flex items-center gap-2.5 ${
                    isSelected
                      ? "border-emerald-500 bg-emerald-50/50 ring-1 ring-emerald-500/30"
                      : "border-zinc-200 hover:border-zinc-300 bg-zinc-50/50"
                  }`}
                >
                  {track.artworkUrl && (
                    <img
                      src={track.artworkUrl}
                      alt={track.title}
                      className="w-8 h-8 rounded object-cover shrink-0"
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-zinc-900 truncate">
                      {track.title}
                    </div>
                    <div className="text-[11px] text-zinc-500 truncate">
                      {track.artist}
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Track info editor */}
      <div className="p-4 sm:p-5 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-zinc-700 mb-1">
              Song Title
            </label>
            <input
              type="text"
              value={currentTrack.title}
              onChange={(e) => updateField("title", e.target.value)}
              className="w-full px-3 py-1.5 text-xs bg-zinc-50 border border-zinc-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-emerald-500 text-zinc-900"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-700 mb-1">
              Artist Name
            </label>
            <input
              type="text"
              value={currentTrack.artist}
              onChange={(e) => updateField("artist", e.target.value)}
              className="w-full px-3 py-1.5 text-xs bg-zinc-50 border border-zinc-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-emerald-500 text-zinc-900"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-zinc-700 mb-1">
              Cover Artwork URL
            </label>
            <input
              type="text"
              value={currentTrack.artworkUrl || ""}
              onChange={(e) => updateField("artworkUrl", e.target.value)}
              placeholder="https://..."
              className="w-full px-3 py-1.5 text-xs bg-zinc-50 border border-zinc-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-emerald-500 text-zinc-900"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-700 mb-1">
              Duration (seconds)
            </label>
            <input
              type="number"
              value={Math.round((currentTrack.durationMs || 0) / 1000)}
              onChange={(e) => updateField("durationMs", Number(e.target.value) * 1000)}
              className="w-full px-3 py-1.5 text-xs bg-zinc-50 border border-zinc-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-emerald-500 text-zinc-900"
            />
          </div>
        </div>

        {/* Synchronized Lyrics section */}
        <div className="border border-zinc-200 rounded-lg overflow-hidden">
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="w-full px-3.5 py-2.5 bg-zinc-50/80 hover:bg-zinc-100 flex items-center justify-between text-xs font-medium text-zinc-700 transition-colors"
          >
            <span className="flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-zinc-500" />
              <span>Synchronized Lyrics Editor ({currentTrack.lyrics.length} lines)</span>
            </span>
            {showAdvanced ? (
              <ChevronUp className="w-3.5 h-3.5 text-zinc-400" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />
            )}
          </button>

          {showAdvanced && (
            <div className="p-3 bg-white space-y-2 max-h-64 overflow-y-auto">
              <div className="flex justify-between items-center pb-1">
                <span className="text-[11px] text-zinc-500">
                  Timestamps in milliseconds (e.g. 10000 = 10s)
                </span>
                <button
                  type="button"
                  onClick={addLyricLine}
                  className="text-xs text-emerald-600 hover:text-emerald-700 font-medium flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Line</span>
                </button>
              </div>

              {currentTrack.lyrics.map((line, idx) => (
                <div key={idx} className="flex items-center gap-2 text-xs">
                  <span className="text-[11px] text-zinc-400 w-5 text-right font-mono">
                    {idx + 1}
                  </span>
                  <input
                    type="number"
                    value={line.startMs}
                    onChange={(e) => updateLyric(idx, "startMs", Number(e.target.value))}
                    className="w-20 px-2 py-1 bg-zinc-50 border border-zinc-200 rounded text-zinc-800 text-[11px] font-mono"
                    placeholder="Start ms"
                    title="Start timestamp in ms"
                  />
                  <input
                    type="text"
                    value={line.text}
                    onChange={(e) => updateLyric(idx, "text", e.target.value)}
                    className="flex-1 px-2 py-1 bg-zinc-50 border border-zinc-200 rounded text-zinc-800 text-[11px]"
                    placeholder="Lyric line text"
                  />
                  <button
                    type="button"
                    onClick={() => removeLyric(idx)}
                    className="text-zinc-400 hover:text-red-500 p-1 rounded"
                    title="Delete line"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Build / Rebuild Button */}
        <div className="flex items-center justify-between pt-2">
          <span className="text-xs text-zinc-500">
            {hasToken ? "Resolving directly against SnowKit API" : "Simulated SnowKit session active"}
          </span>
          <button
            type="button"
            onClick={() => onBuild()}
            disabled={isBuilding}
            className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 disabled:opacity-50 text-white rounded-lg text-xs font-semibold transition-colors flex items-center gap-2 shadow-xs"
          >
            {isBuilding ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Compiling Player...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                <span>Build Player HTML</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
