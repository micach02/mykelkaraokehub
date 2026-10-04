import { useCallback, useEffect, useRef, useState } from 'react'
import { createYouTubeAdapter } from '../services/player/youtubeAdapter'
import { createPracticeAdapter } from '../services/player/practiceAdapter'
import { isValidVideoId } from '../services/youtubeService'

// Decides which engine plays a song: YouTube videos, or the app's own
// practice tracks (for melody scoring).
export function getEngineKind(song) {
  if (!song) return null
  if (song.source === 'practice') return 'practice'
  return isValidVideoId(song.youtubeVideoId) ? 'youtube' : 'invalid'
}

/**
 * Owns the player engines (the official YouTube player, practice tracks) and loads a new video whenever
 * `entryId` changes. Reports status through `onStatusChange` and fires
 * `onEnded` when a song finishes.
 */
export function useKaraokePlayer({ song, entryId, autoplay = true, volume = 100, isMuted = false, onEnded, onStatusChange }) {
  const containerRef = useRef(null)
  const enginesRef = useRef({ youtube: null, practice: null })
  const activeRef = useRef(null)
  const [status, setStatus] = useState(song ? 'loading' : 'idle')
  const [error, setError] = useState(null)
  const [engineKind, setEngineKind] = useState(null)

  // Latest values for use inside engine callbacks.
  const latest = useRef({})
  latest.current = { song, entryId, autoplay, onEnded, onStatusChange, effectiveVolume: isMuted ? 0 : volume }

  const report = useCallback((next) => {
    setStatus(next)
    latest.current.onStatusChange?.(next, latest.current.entryId)
  }, [])

  const getEngine = useCallback((kind) => {
    const engines = enginesRef.current
    if (engines[kind]) return engines[kind]

    const handlers = {
      onStatus: (next) => {
        if (activeRef.current !== engines[kind]) return // ignore the inactive engine
        report(next)
        if (next === 'ended') latest.current.onEnded?.(latest.current.entryId)
      },
      onError: (err) => {
        if (activeRef.current !== engines[kind]) return
        setError(err)
        report('error')
      },
    }

    engines[kind] = kind === 'practice' ? createPracticeAdapter(handlers) : createYouTubeAdapter(containerRef.current, handlers)
    return engines[kind]
  }, [report])

  const loadCurrent = useCallback((options = {}) => {
    const { song: current, autoplay: shouldAutoplay } = latest.current
    const kind = getEngineKind(current)
    setError(null)
    setEngineKind(kind)

    if (!current) {
      activeRef.current?.pause()
      activeRef.current = null
      report('idle')
      return
    }

    if (kind === 'invalid') {
      activeRef.current?.pause()
      activeRef.current = null
      setError({ code: 'invalid-video', message: 'This song has an invalid video link.' })
      report('error')
      return
    }

    const engine = getEngine(kind)
    if (activeRef.current && activeRef.current !== engine) activeRef.current.pause()
    activeRef.current = engine
    engine.setVolume(latest.current.effectiveVolume)
    engine.load(current, { autoplay: options.autoplay ?? shouldAutoplay })
  }, [getEngine, report])

  // Load whenever a new song entry starts.
  useEffect(() => {
    loadCurrent()
  }, [entryId, loadCurrent])

  // Volume / mute.
  useEffect(() => {
    const value = isMuted ? 0 : volume
    Object.values(enginesRef.current).forEach((engine) => engine?.setVolume(value))
  }, [volume, isMuted])

  // Tear down engines on unmount.
  useEffect(() => {
    const engines = enginesRef.current
    return () => {
      Object.keys(engines).forEach((kind) => {
        engines[kind]?.destroy()
        engines[kind] = null
      })
      activeRef.current = null
    }
  }, [])

  const play = useCallback(() => activeRef.current?.play(), [])
  const pause = useCallback(() => activeRef.current?.pause(), [])
  const stop = useCallback(() => activeRef.current?.stop(), [])
  const seek = useCallback((seconds) => activeRef.current?.seek?.(seconds), [])
  // Practice tracks: turn the guide melody on/off (muted while scoring).
  const setGuideEnabled = useCallback((enabled) => enginesRef.current.practice?.setGuideEnabled(enabled), [])

  // Retry after an error. A YouTube engine that failed to initialize is
  // rebuilt from scratch.
  const retry = useCallback(() => {
    const engines = enginesRef.current
    if (error?.code === 'player-init' && engines.youtube) {
      engines.youtube.destroy()
      engines.youtube = null
      activeRef.current = null
    }
    loadCurrent({ autoplay: true })
  }, [error, loadCurrent])

  const getProgress = useCallback(() => {
    const engine = activeRef.current
    if (!engine) return { current: 0, duration: 0 }
    return { current: engine.getCurrentTime(), duration: engine.getDuration() }
  }, [])

  return { containerRef, status, error, engineKind, play, pause, stop, seek, setGuideEnabled, retry, getProgress }
}

// Polls playback position while a song is playing.
export function usePlaybackProgress(getProgress, status) {
  const [progress, setProgress] = useState({ current: 0, duration: 0 })
  useEffect(() => {
    setProgress(getProgress())
    if (status !== 'playing' && status !== 'buffering') return undefined
    const id = window.setInterval(() => setProgress(getProgress()), 500)
    return () => window.clearInterval(id)
  }, [getProgress, status])
  return progress
}
