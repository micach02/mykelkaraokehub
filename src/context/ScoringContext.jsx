import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useKaraokeActions, useKaraokeState } from './KaraokeContext'
import { useToast } from './ToastContext'
import { createAudioAnalyzer, getMicrophonePermissionState, getScoringSupport } from '../services/scoring/audioAnalysisProvider'
import { createScoringSession } from '../services/scoring/scoringSession'
import { getReferenceMelody } from '../services/scoring/referenceMelodyService'
import { recordPerformance } from '../services/scoringHistoryService'
import { getItem, setItem, STORAGE_KEYS } from '../services/storageService'
import { SCORING_SESSION } from '../config/scoringConfig'

const ScoringContext = createContext(null)

/**
 * Karaoke scoring flow (optional — the player works without it):
 *
 *   idle → permission → requesting → calibrating → countdown → singing
 *        → analyzing (a moment, while the recording is closed) → results
 *   (+ unsupported / error)
 *
 * Scoring is driven by the Auto-score switch (on by default): when a song
 * starts playing, scoring starts by itself. Once the mic is allowed and
 * checked, it goes idle → starting → singing without interrupting the song;
 * the first time, it takes the full flow above. ⏹ Stop then ▶ Play starts a
 * fresh take from the top.
 *
 * Audio frames never touch React state: they live in the scoring session.
 * The UI polls a small live snapshot ~10×/s.
 */
export function ScoringProvider({ children }) {
  const karaoke = useKaraokeState()
  const actions = useKaraokeActions()
  const { show } = useToast()
  const navigate = useNavigate()

  const [phase, setPhase] = useState('idle')
  const [error, setError] = useState(null)
  const [take, setTake] = useState(null) // the performance: { song, entryId, melody }
  const [results, setResults] = useState(null)

  const [autoScore, setAutoScoreState] = useState(() => getItem(STORAGE_KEYS.autoScore, true) !== false)

  const analyzerRef = useRef(null)
  const sessionRef = useRef(null)
  const noiseFloorRef = useRef(null) // remembered after the first mic check
  const autoTakeRef = useRef(false) // the current take was started by auto-score
  const autoEntryRef = useRef(null) // the queue entry auto-score last handled
  const attemptRef = useRef(0) // bumped whenever the mic is released (stale opens bail out)
  const karaokeRef = useRef(karaoke)
  useLayoutEffect(() => {
    karaokeRef.current = karaoke
  }, [karaoke])

  const saveAutoScore = useCallback((on) => {
    setAutoScoreState(on)
    setItem(STORAGE_KEYS.autoScore, on)
  }, [])

  const releaseMicrophone = useCallback(() => {
    attemptRef.current += 1
    sessionRef.current?.discard()
    sessionRef.current = null
    analyzerRef.current?.close()
    analyzerRef.current = null
  }, [])

  // Release the microphone if the app unmounts mid-take.
  useEffect(() => releaseMicrophone, [releaseMicrophone])

  const fail = useCallback((err) => {
    releaseMicrophone()
    setError(err)
    setPhase('error')
  }, [releaseMicrophone])

  const openMicrophone = useCallback(async () => {
    setPhase('requesting')
    const analyzer = createAudioAnalyzer()
    try {
      await analyzer.open()
    } catch (err) {
      fail(err)
      return
    }
    analyzerRef.current = analyzer
    // Already checked this mic during this visit → straight to the countdown.
    setPhase(noiseFloorRef.current == null ? 'calibrating' : 'countdown')
  }, [fail])

  // Full start: pause, explain + check the mic if needed, 3-2-1, then the
  // song restarts from the top. auto: started by auto-score (declining the
  // mic setup turns auto-score off).
  const startSinging = useCallback(async ({ auto = false } = {}) => {
    const { currentSong, currentEntryId } = karaokeRef.current
    if (!currentSong) return
    attemptRef.current += 1 // a pending auto-start gives way
    autoTakeRef.current = auto
    autoEntryRef.current = currentEntryId
    const support = getScoringSupport()
    actions.pause()
    setError(null)
    setResults(null)
    setTake({ song: currentSong, entryId: currentEntryId, melody: getReferenceMelody(currentSong.id) })
    if (!support.supported) {
      setError({ code: support.reason, message: support.message })
      setPhase('unsupported')
      return
    }
    // Explain first, unless the browser already has permission.
    if ((await getMicrophonePermissionState()) === 'granted') openMicrophone()
    else setPhase('permission')
  }, [actions, openMicrophone])

  const finishCalibration = useCallback((noiseFloor) => {
    noiseFloorRef.current = noiseFloor ?? 0
    setPhase('countdown')
  }, [])

  // Start listening and recording. restart: play the song from the top.
  const startSession = useCallback((analyzer, currentTake, { restart }) => {
    actions.setGuideEnabled(false)
    if (restart) actions.seek(0)
    sessionRef.current = createScoringSession({
      analyzer,
      getSongTime: () => actions.getProgress().current,
      isPlaying: () => karaokeRef.current.playbackStatus === 'playing',
      referenceNotes: currentTake.melody?.notes ?? null,
      noiseFloor: noiseFloorRef.current ?? 0,
    })
    if (SCORING_SESSION.recordAudio) analyzer.startRecording()
    if (restart) actions.play()
    setPhase('singing')
  }, [actions])

  // Countdown finished: restart the song and start listening, together.
  const beginSinging = useCallback(() => {
    if (!analyzerRef.current || !take) return
    startSession(analyzerRef.current, take, { restart: true })
  }, [startSession, take])

  // Auto-score: a song just started playing. blockedQuietly: if the browser
  // blocks the mic, skip silently (don't nag every song) instead of explaining.
  const autoStart = useCallback(async ({ blockedQuietly = true } = {}) => {
    const { currentSong, currentEntryId } = karaokeRef.current
    if (!currentSong || !getScoringSupport().supported) return
    const started = attemptRef.current
    const permission = await getMicrophonePermissionState()
    // Started another way, stopped, or skipped meanwhile.
    if (started !== attemptRef.current || karaokeRef.current.currentEntryId !== currentEntryId) return
    if (permission === 'denied' && blockedQuietly) return
    if (permission !== 'granted' || noiseFloorRef.current == null) {
      // First time: explain, check the mic, then count in from the top.
      startSinging({ auto: true })
      return
    }
    // Ready: listen right away, without interrupting the song.
    autoTakeRef.current = true
    const nextTake = { song: currentSong, entryId: currentEntryId, melody: getReferenceMelody(currentSong.id) }
    setError(null)
    setResults(null)
    setTake(nextTake)
    setPhase('starting')
    const attempt = attemptRef.current
    const analyzer = createAudioAnalyzer()
    try {
      await analyzer.open()
    } catch (err) {
      if (attempt === attemptRef.current) fail(err)
      return
    }
    // Skipped or stopped while the mic was opening.
    if (attempt !== attemptRef.current || karaokeRef.current.currentEntryId !== currentEntryId) {
      analyzer.close()
      return
    }
    analyzerRef.current = analyzer
    startSession(analyzer, nextTake, { restart: false })
  }, [startSinging, startSession, fail])

  // Start automatically when a new song starts playing from (near) the top.
  useEffect(() => {
    const { currentEntryId, playbackStatus } = karaoke
    if (!autoScore || phase !== 'idle' || playbackStatus !== 'playing' || !currentEntryId) return
    if (autoEntryRef.current === currentEntryId) return
    autoEntryRef.current = currentEntryId
    // A song resumed halfway (e.g. after a refresh) isn't scored from the middle.
    if (actions.getProgress().current > SCORING_SESSION.autoStartMaxSeconds) return
    autoStart()
  }, [autoScore, phase, karaoke, actions, autoStart])

  // The Auto-score switch. Turning it on scores the current song too: right
  // away if it has only just started (or on ▶ Play), otherwise from the top
  // after a 3-2-1.
  const setAutoScore = useCallback((on) => {
    saveAutoScore(on)
    const { currentEntryId, playbackStatus } = karaokeRef.current
    if (!on || !currentEntryId || phase !== 'idle') return
    if (actions.getProgress().current > SCORING_SESSION.autoStartMaxSeconds) {
      startSinging({ auto: true })
    } else if (playbackStatus === 'playing') {
      autoEntryRef.current = currentEntryId
      autoStart({ blockedQuietly: false })
    } else {
      autoEntryRef.current = null // starts when the song plays
    }
  }, [saveAutoScore, phase, actions, startSinging, autoStart])

  // ⏹ Stop rewinds the song: the take so far is dropped, and ▶ Play starts a
  // fresh one from the top.
  const lastStatusRef = useRef(karaoke.playbackStatus)
  useEffect(() => {
    const stoppedNow = karaoke.playbackStatus === 'stopped' && lastStatusRef.current !== 'stopped'
    lastStatusRef.current = karaoke.playbackStatus
    if (!stoppedNow) return
    autoEntryRef.current = null
    if (phase === 'singing' || phase === 'starting') {
      releaseMicrophone()
      actions.setGuideEnabled(true)
      setPhase('idle')
      setTake(null)
      show(autoScore ? 'Scoring stopped. Press ▶ Play to sing again from the top.' : 'Scoring stopped.', { variant: 'info' })
    }
  }, [karaoke.playbackStatus, phase, autoScore, releaseMicrophone, actions, show])

  // Scoring can't run here (no mic support, or not a secure page): say why.
  const explainUnavailable = useCallback(() => {
    const support = getScoringSupport()
    setError({ code: support.reason, message: support.message })
    setTake(null)
    setPhase('unsupported')
  }, [])

  // The recording follows the video: paused while the song is paused.
  useEffect(() => {
    if (phase !== 'singing') return
    if (karaoke.playbackStatus === 'playing') analyzerRef.current?.resumeRecording()
    else if (karaoke.playbackStatus === 'paused') analyzerRef.current?.pauseRecording()
  }, [phase, karaoke.playbackStatus])

  // The song ended: score it and show the results (the next song follows
  // from the results screen). Nobody sang → no results, straight on.
  const finish = useCallback(async () => {
    const session = sessionRef.current
    const analyzer = analyzerRef.current
    if (!session || !analyzer) return
    setPhase('analyzing')
    actions.setGuideEnabled(true)
    const result = session.finish()
    sessionRef.current = null
    const recording = await analyzer.stopRecording()
    analyzer.close() // microphone released
    analyzerRef.current = null

    const { song, entryId } = take
    if (result.insufficient) {
      setTake(null)
      setPhase('idle')
      show('No singing heard, so there’s no score for this song.', { variant: 'info' })
      actions.songEnded(entryId)
      return
    }
    const personalBest = recordPerformance({
      songId: song.id,
      songTitle: song.title,
      artist: song.artist,
      score: result.totalScore,
      grade: result.grade,
      mode: result.mode,
    })
    setResults({
      result,
      song,
      personalBest,
      recordingUrl: recording ? URL.createObjectURL(recording) : null,
    })
    setPhase('results')
  }, [actions, take, show])

  // Called by the player when a song ends. Returns true when scoring takes
  // over (results first; the queue continues from the results screen).
  const handleSongEnded = useCallback((entryId) => {
    if (phase !== 'singing' || entryId !== take?.entryId) return false
    finish()
    return true
  }, [phase, take, finish])

  const cancel = useCallback(() => {
    // "Not now" while auto-score was setting up the mic → stop asking every song.
    // A mic error during auto-score too, or it would pop up again for every song.
    const declinedAuto = autoTakeRef.current && ['permission', 'requesting', 'calibrating', 'countdown', 'error'].includes(phase)
    releaseMicrophone()
    actions.setGuideEnabled(true)
    setPhase('idle')
    setTake(null)
    if (declinedAuto) {
      saveAutoScore(false)
      actions.play() // the song was paused for the mic setup
      show('Auto-score is off. Turn it back on with the Auto-score switch under the player.', { variant: 'info' })
    }
  }, [phase, releaseMicrophone, actions, show, saveAutoScore])

  // Skipped or changed songs mid-take: discard, no misleading score.
  useEffect(() => {
    if (!take || ['idle', 'results', 'analyzing', 'error', 'unsupported'].includes(phase)) return
    if (karaoke.currentEntryId !== take.entryId) {
      releaseMicrophone()
      actions.setGuideEnabled(true)
      setPhase('idle')
      setTake(null)
      // With auto-score, the next song simply gets its own take.
      if (!autoTakeRef.current) show('Scoring stopped — the song changed.', { variant: 'info' })
    }
  }, [karaoke.currentEntryId, take, phase, releaseMicrophone, actions, show])

  // ---- Results actions ----
  const closeResults = useCallback(({ advance }) => {
    // Already closed (the dialog's own close event can arrive afterwards):
    // never advance the queue twice.
    if (!results) return
    if (results.recordingUrl) URL.revokeObjectURL(results.recordingUrl)
    const entryId = take?.entryId
    setResults(null)
    setTake(null)
    setPhase('idle')
    // The song has finished → continue the queue as usual.
    if (advance) actions.songEnded(entryId)
  }, [results, take, actions])

  const singAgain = useCallback(() => {
    if (results?.recordingUrl) URL.revokeObjectURL(results.recordingUrl)
    setResults(null)
    setPhase('idle')
    startSinging()
  }, [results, startSinging])

  const nextSong = useCallback(() => closeResults({ advance: true }), [closeResults])
  const nextSongRef = useRef(nextSong)
  useLayoutEffect(() => {
    nextSongRef.current = nextSong
  }, [nextSong])

  // ---- Results: the next song starts by itself after a few seconds ----
  // autoNextAt: when (ms timestamp), or null: no next song in the queue,
  // turned off in the config, or someone tapped the results to read them.
  // Phones show the same countdown (see RoomContext).
  const [autoNextAt, setAutoNextAt] = useState(null)
  const autoNextStoppedRef = useRef(false)
  const hasNextSong = karaoke.queue.length > 0
  useEffect(() => {
    const seconds = SCORING_SESSION.resultsAutoNextSeconds
    if (phase !== 'results') autoNextStoppedRef.current = false
    if (phase !== 'results' || !hasNextSong || seconds <= 0 || autoNextStoppedRef.current) {
      setAutoNextAt(null)
      return
    }
    setAutoNextAt((at) => at ?? Date.now() + seconds * 1000)
  }, [phase, hasNextSong])

  useEffect(() => {
    if (autoNextAt == null) return undefined
    const timer = window.setTimeout(() => nextSongRef.current(), Math.max(0, autoNextAt - Date.now()))
    return () => window.clearTimeout(timer)
  }, [autoNextAt])

  const stopAutoNext = useCallback(() => {
    autoNextStoppedRef.current = true
    setAutoNextAt(null)
  }, [])
  const backToSongs = useCallback(() => {
    closeResults({ advance: true })
    navigate('/')
  }, [closeResults, navigate])
  const dismissResults = useCallback(() => closeResults({ advance: true }), [closeResults])

  const value = useMemo(() => ({
    phase,
    error,
    take,
    results,
    mode: take?.melody ? 'melody' : 'voice',
    isActive: phase !== 'idle',
    getAnalyzer: () => analyzerRef.current,
    getFrames: () => sessionRef.current?.getFrames() ?? null,
    autoScore,
    setAutoScore,
    retry: () => startSinging({ auto: autoTakeRef.current }),
    explainUnavailable,
    allowMicrophone: openMicrophone,
    finishCalibration,
    beginSinging,
    handleSongEnded,
    cancel,
    singAgain,
    nextSong,
    autoNextAt,
    stopAutoNext,
    backToSongs,
    dismissResults,
  }), [phase, error, take, results, autoNextAt, stopAutoNext, autoScore, setAutoScore, explainUnavailable, startSinging, openMicrophone, finishCalibration, beginSinging, handleSongEnded, cancel, singAgain, nextSong, backToSongs, dismissResults])

  return <ScoringContext.Provider value={value}>{children}</ScoringContext.Provider>
}

// For components that may render outside the provider.
export function useOptionalScoring() {
  return useContext(ScoringContext)
}

export function useScoring() {
  const value = useContext(ScoringContext)
  if (!value) throw new Error('useScoring must be used inside <ScoringProvider>')
  return value
}
