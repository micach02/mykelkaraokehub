import { useCallback, useEffect, useRef, useState } from 'react'
import { createAudioAnalyzer, getMicrophonePermissionState, getScoringSupport } from '../services/scoring/audioAnalysisProvider'
import { sendRoomMic } from '../services/roomService'
import { getItem, setItem, STORAGE_KEYS } from '../services/storageService'
import { encodeMicFrame, MAX_MIC_FRAMES, MIC_BATCH_MS } from '../utils/micFrames'

// Can this phone be the mic? (Needs a secure page: the online version, not
// a home-network http:// address.)
export function isPhoneMicSupported() {
  return getScoringSupport().supported
}

// "Use this phone as the mic on my turn" (remembered on the phone; on by default).
export function usePhoneMicPreference() {
  const [on, setOn] = useState(() => getItem(STORAGE_KEYS.phoneMic, true) !== false)
  const save = useCallback((value) => {
    setOn(value)
    setItem(STORAGE_KEYS.phoneMic, value)
  }, [])
  return [on, save]
}

const LEVEL_EVERY_MS = 120

/**
 * The phone as the singer's mic. While `active` (it's this phone's song and
 * the TV is scoring), listens to the phone's microphone, analyzes it here,
 * and sends the analysis (numbers, not audio) to the TV once a second.
 *
 * status: 'off' | 'needs-tap' | 'starting' | 'live' | 'error'
 * Starts by itself when the mic is already allowed; otherwise it waits for
 * start() from a tap (browsers ask permission on a tap).
 */
export function usePhoneMic({ code, from, active }) {
  const [status, setStatus] = useState('off')
  const [error, setError] = useState(null)
  const [level, setLevel] = useState(0)
  const activeRef = useRef(active)
  const micRef = useRef(null) // { analyzer, timers, wakeLock }
  const fromRef = useRef(from)
  useEffect(() => {
    activeRef.current = active
    fromRef.current = from
  })

  const stop = useCallback((nextStatus = 'off') => {
    const mic = micRef.current
    micRef.current = null
    if (mic) {
      mic.timers.forEach((timer) => window.clearInterval(timer))
      mic.analyzer.close()
      mic.wakeLock?.release?.().catch(() => {})
    }
    setLevel(0)
    setStatus(nextStatus)
  }, [])

  const start = useCallback(async () => {
    if (micRef.current || !activeRef.current) return
    setError(null)
    setStatus('starting')
    const analyzer = createAudioAnalyzer()
    try {
      await analyzer.open()
    } catch (err) {
      setError(err.message || 'The microphone could not be started.')
      setStatus('error')
      return
    }
    if (!activeRef.current) {
      analyzer.close()
      setStatus('off')
      return
    }
    // Started without a tap and the browser is holding the audio: ask for one.
    if (analyzer.running === false) {
      analyzer.close()
      setStatus('needs-tap')
      return
    }
    const buffer = []
    let latest = 0
    analyzer.onFrame((frame) => {
      buffer.push(frame)
      latest = frame.rms
    })
    const flush = () => {
      const frames = buffer.splice(0, buffer.length).slice(-MAX_MIC_FRAMES)
      if (!frames.length) return
      const sentAt = performance.now()
      const batch = { latency: Math.min(2, analyzer.latencySeconds || 0), frames: frames.map((frame) => encodeMicFrame(frame, sentAt)) }
      sendRoomMic(code, fromRef.current, batch).catch(() => {})
    }
    const mic = {
      analyzer,
      timers: [window.setInterval(flush, MIC_BATCH_MS), window.setInterval(() => setLevel(latest), LEVEL_EVERY_MS)],
      wakeLock: null,
    }
    micRef.current = mic
    // Keep the screen (and so the mic) on while singing.
    navigator.wakeLock?.request?.('screen').then((lock) => {
      if (micRef.current === mic) mic.wakeLock = lock
      else lock.release?.().catch(() => {})
    }).catch(() => {})
    setStatus('live')
  }, [code, stop])

  // Your turn: start (by itself when the mic is already allowed). Turn over:
  // stop and release the mic.
  useEffect(() => {
    if (!active) {
      stop('off')
      return undefined
    }
    let cancelled = false
    getMicrophonePermissionState().then((permission) => {
      if (cancelled || !activeRef.current || micRef.current) return
      if (permission === 'granted') start()
      else setStatus('needs-tap')
    })
    return () => {
      cancelled = true
    }
  }, [active, start, stop])

  useEffect(() => () => stop('off'), [stop])

  return { status, error, level, start, stop: () => stop('off') }
}
