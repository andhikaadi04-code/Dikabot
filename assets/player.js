(() => {
  const audio = document.getElementById("player-audio")
  const playButton = document.getElementById("player-play")
  const rewindButton = document.getElementById("player-rewind")
  const forwardButton = document.getElementById("player-forward")
  const progressBar = document.getElementById("player-progress")
  const progressFill = document.getElementById("player-progress-fill")
  const progressThumb = document.getElementById("player-progress-thumb")
  const currentTimeLabel = document.getElementById("player-current-time")
  const remainingTimeLabel = document.getElementById("player-remaining-time")
  const playIcon = document.getElementById("player-play-icon")
  const pauseIcon = document.getElementById("player-pause-icon")
  const equalizer = document.getElementById("player-equalizer")
  const lyricsContainer = document.getElementById("player-lyrics")
  const artworkCard = document.getElementById("player-artwork-card")
  const lyricsToggle = document.getElementById("player-lyrics-toggle")
  const volumeSlider = document.getElementById("player-volume-slider")
  const volumeFill = document.getElementById("player-volume-fill")

  const config = window.__SNOWKIT_PLAYER__ || {}
  const lyrics = Array.isArray(config.lyrics) ? config.lyrics : []
  const streamUrl = typeof config.socketUrl === "string" ? config.socketUrl : ""
  const streamMimeType = typeof config.mimeType === "string" ? config.mimeType : "audio/mp4"
  const streamChunks = []

  let socket = null
  let streamEnded = false
  let activeLyricIndex = -1
  let lyricScrollFrame = 0
  let isShowingLyrics = false
  let resolveStreamReady

  const streamReady = new Promise((resolve) => {
    resolveStreamReady = resolve
  })

  const formatTime = (seconds, isNegative = false) => {
    if (!Number.isFinite(seconds) || seconds < 0) return isNegative ? "-0:00" : "0:00"
    const totalSecs = Math.floor(seconds)
    const minutes = Math.floor(totalSecs / 60)
    const remainder = totalSecs % 60
    const formatted = `${minutes}:${String(remainder).padStart(2, "0")}`
    return isNegative ? `-${formatted}` : formatted
  }

  const toWebSocketUrl = (url) => {
    if (/^wss?:/i.test(url)) return url
    if (/^https:/i.test(url)) return "wss:" + url.slice(6)
    if (/^http:/i.test(url)) return "ws:" + url.slice(5)
    return url
  }

  const markStreamReady = () => {
    if (!resolveStreamReady) return
    resolveStreamReady()
    resolveStreamReady = null
  }

  const finishStream = () => {
    if (streamEnded) return
    streamEnded = true

    if (streamChunks.length > 0) {
      const blob = new Blob(streamChunks, { type: streamMimeType })
      audio.src = URL.createObjectURL(blob)
    }

    markStreamReady()
  }

  const startSocketStream = () => {
    if (!streamUrl || typeof WebSocket === "undefined") return false

    try {
      socket = new WebSocket(toWebSocketUrl(streamUrl))
      socket.binaryType = "arraybuffer"
      socket.onmessage = (event) => {
        if (event.data instanceof ArrayBuffer) streamChunks.push(event.data)
        if (typeof event.data === "string" && event.data === "[end]") finishStream()
      }
      socket.onerror = finishStream
      socket.onclose = finishStream
      return true
    } catch {
      return false
    }
  }

  const showPlayingState = () => {
    if (playIcon) playIcon.style.display = "none"
    if (pauseIcon) pauseIcon.style.display = "block"
    if (equalizer) equalizer.classList.add("is-playing")
  }

  const showPausedState = () => {
    if (playIcon) playIcon.style.display = "block"
    if (pauseIcon) pauseIcon.style.display = "none"
    if (equalizer) equalizer.classList.remove("is-playing")
  }

  const updateProgress = () => {
    if (!Number.isFinite(audio.duration) || audio.duration <= 0) return
    const current = audio.currentTime || 0
    const duration = audio.duration || 0
    const percent = Math.max(0, Math.min(100, (current / duration) * 100))

    if (progressFill) progressFill.style.width = percent + "%"
    if (progressThumb) progressThumb.style.left = percent + "%"
    if (currentTimeLabel) currentTimeLabel.textContent = formatTime(current, false)

    const remaining = Math.max(0, duration - current)
    if (remainingTimeLabel) remainingTimeLabel.textContent = formatTime(remaining, true)
  }

  const seekTo = (seconds) => {
    if (!Number.isFinite(audio.duration) || audio.duration <= 0) return
    audio.currentTime = Math.max(0, Math.min(audio.duration, seconds))
    updateProgress()
    syncLyrics()
  }

  // Volume handler
  const setVolumeFromEvent = (event) => {
    if (!volumeSlider) return
    const rect = volumeSlider.getBoundingClientRect()
    const clickX = Math.max(0, Math.min(event.clientX - rect.left, rect.width))
    const vol = Math.max(0, Math.min(1, clickX / rect.width))
    audio.volume = vol
    if (volumeFill) volumeFill.style.width = `${Math.round(vol * 100)}%`
  }

  if (volumeSlider) {
    let isDraggingVol = false
    volumeSlider.addEventListener("pointerdown", (e) => {
      isDraggingVol = true
      setVolumeFromEvent(e)
    })
    window.addEventListener("pointermove", (e) => {
      if (isDraggingVol) setVolumeFromEvent(e)
    })
    window.addEventListener("pointerup", () => {
      isDraggingVol = false
    })
  }

  // Lyrics toggle
  if (lyricsToggle) {
    lyricsToggle.addEventListener("click", () => {
      isShowingLyrics = !isShowingLyrics
      lyricsToggle.classList.toggle("is-active", isShowingLyrics)

      if (isShowingLyrics) {
        if (artworkCard) artworkCard.style.display = "none"
        if (lyricsContainer) lyricsContainer.style.display = "block"
        if (activeLyricIndex >= 0 && lyricElements[activeLyricIndex]) {
          scrollToLyric(lyricElements[activeLyricIndex])
        }
      } else {
        if (artworkCard) artworkCard.style.display = "flex"
        if (lyricsContainer) lyricsContainer.style.display = "none"
      }
    })
  }

  const scrollToLyric = (element) => {
    if (!element || !lyricsContainer || !isShowingLyrics) return
    if (lyricScrollFrame) cancelAnimationFrame(lyricScrollFrame)

    const start = lyricsContainer.scrollTop
    const max = Math.max(0, lyricsContainer.scrollHeight - lyricsContainer.clientHeight)
    const desired = element.offsetTop - (lyricsContainer.clientHeight - element.offsetHeight) * 0.46
    const target = Math.max(0, Math.min(max, desired))
    const distance = target - start
    const startedAt = performance.now()
    const duration = 400

    const animate = (now) => {
      const progress = Math.min(1, (now - startedAt) / duration)
      const eased = 1 - Math.pow(1 - progress, 3)
      lyricsContainer.scrollTop = start + distance * eased

      if (progress < 1) lyricScrollFrame = requestAnimationFrame(animate)
      else lyricScrollFrame = 0
    }

    lyricScrollFrame = requestAnimationFrame(animate)
  }

  const lyricElements = []

  const syncLyrics = () => {
    if (!lyrics.length) return

    const positionMs = audio.currentTime * 1000
    let nextIndex = -1

    for (let index = 0; index < lyrics.length; index += 1) {
      if (positionMs >= lyrics[index].start_ms) nextIndex = index
      else break
    }

    if (nextIndex === activeLyricIndex) return
    activeLyricIndex = nextIndex

    lyricElements.forEach((element, index) => {
      element.className = "lyric-line"
      if (index === nextIndex) element.classList.add("is-active")
      else if (index < nextIndex) element.classList.add("is-past")
    })

    if (nextIndex >= 0) scrollToLyric(lyricElements[nextIndex])
  }

  const renderLyrics = () => {
    if (!lyricsContainer) return
    if (!lyrics.length) {
      const emptyState = document.createElement("div")
      emptyState.className = "player-empty-lyrics"
      emptyState.textContent = "Lirik tidak tersedia untuk trek ini."
      lyricsContainer.appendChild(emptyState)
      return
    }

    lyrics.forEach((line) => {
      const element = document.createElement("div")
      element.className = "lyric-line"
      element.textContent = line.text || "♪"
      element.addEventListener("click", () => seekTo(line.start_ms / 1000))
      lyricsContainer.appendChild(element)
      lyricElements.push(element)
    })
  }

  renderLyrics()

  if (!startSocketStream()) {
    audio.src = streamUrl
    markStreamReady()
  }

  if (playButton) {
    playButton.addEventListener("click", async () => {
      try {
        if (audio.paused) {
          await streamReady
          await audio.play()
        } else {
          audio.pause()
        }
      } catch {
        showPausedState()
      }
    })
  }

  if (rewindButton) {
    rewindButton.addEventListener("click", () => seekTo(audio.currentTime - 15))
  }
  if (forwardButton) {
    forwardButton.addEventListener("click", () => seekTo(audio.currentTime + 15))
  }

  if (progressBar) {
    progressBar.addEventListener("pointerdown", (event) => {
      if (!Number.isFinite(audio.duration) || audio.duration <= 0) return
      const bounds = progressBar.getBoundingClientRect()
      const position = Math.max(0, Math.min(event.clientX - bounds.left, bounds.width))
      seekTo((position / bounds.width) * audio.duration)
    })
  }

  audio.addEventListener("loadedmetadata", () => {
    if (remainingTimeLabel) {
      remainingTimeLabel.textContent = formatTime(audio.duration, true)
    }
  })
  audio.addEventListener("timeupdate", () => {
    updateProgress()
    syncLyrics()
  })
  audio.addEventListener("play", showPlayingState)
  audio.addEventListener("pause", () => {
    if (!audio.ended) showPausedState()
  })
  audio.addEventListener("ended", () => {
    showPausedState()
    if (progressFill) progressFill.style.width = "0%"
    if (progressThumb) progressThumb.style.left = "0%"
    if (currentTimeLabel) currentTimeLabel.textContent = "0:00"
    if (remainingTimeLabel) remainingTimeLabel.textContent = formatTime(audio.duration, true)
    activeLyricIndex = -1
    syncLyrics()
  })

  window.addEventListener("beforeunload", () => socket?.close())
})()
