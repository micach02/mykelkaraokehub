import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useReducer, useRef } from 'react'
import {
  ActionTypes,
  canAddToQueue,
  initialState,
  karaokeReducer,
  sanitizePersistedSession,
  toPersistedSession,
} from './karaokeReducer'
import { getItem, setItem, STORAGE_KEYS } from '../services/storageService'
import { recordSong } from '../services/historyService'
import { QUEUE_CONFIG, PLAYER_CONFIG } from '../config/appConfig'
import { createId } from '../utils/id'
import { enterFullscreen, exitFullscreen, getFullscreenElement } from '../utils/fullscreen'

const KaraokeStateContext = createContext(null)
const KaraokeActionsContext = createContext(null)

function init() {
  const base = { ...initialState, volume: PLAYER_CONFIG.defaultVolume }
  const saved = sanitizePersistedSession(getItem(STORAGE_KEYS.session))
  if (!saved) return base
  return karaokeReducer(base, {
    type: ActionTypes.RESTORE_SESSION,
    payload: { ...saved, entryId: createId('entry') },
  })
}

export function KaraokeProvider({ children }) {
  const [state, dispatch] = useReducer(karaokeReducer, undefined, init)
  const stateRef = useRef(state)
  // The mounted KaraokePlayer registers its controls here so any component
  // (Karaoke Mode, mini player, keyboard shortcuts) can drive playback.
  const playerRef = useRef(null)

  useLayoutEffect(() => {
    stateRef.current = state
  }, [state])

  // Persist the queue and current song (localStorage, via storageService).
  const { currentSong, currentRequestedBy, queue, volume, isMuted } = state
  useEffect(() => {
    setItem(STORAGE_KEYS.session, toPersistedSession({ currentSong, currentRequestedBy, queue, volume, isMuted }))
  }, [currentSong, currentRequestedBy, queue, volume, isMuted])

  useEffect(() => {
    const onChange = () => dispatch({ type: ActionTypes.SET_FULLSCREEN, payload: { value: Boolean(getFullscreenElement()) } })
    document.addEventListener('fullscreenchange', onChange)
    return () => document.removeEventListener('fullscreenchange', onChange)
  }, [])

  const registerPlayer = useCallback((api) => {
    playerRef.current = api
    return () => {
      if (playerRef.current === api) playerRef.current = null
    }
  }, [])

  const actions = useMemo(() => ({
    registerPlayer,

    // Picking a song (Play or Queue, here or from a phone) adds it to "Recently sung".
    playSong(song, { requestedBy = null } = {}) {
      recordSong(song)
      dispatch({ type: ActionTypes.PLAY_SONG, payload: { song, entryId: createId('entry'), requestedBy } })
    },
    playQueueItem(entryId) {
      dispatch({ type: ActionTypes.PLAY_QUEUE_ITEM, payload: { entryId } })
    },
    // Returns { ok, reason?, message?, started? } so callers can give feedback.
    addToQueue(song, { requestedBy = null } = {}) {
      const current = stateRef.current
      const check = canAddToQueue(current, song, { allowDuplicates: QUEUE_CONFIG.allowDuplicates })
      if (!check.ok) return check
      const started = QUEUE_CONFIG.autoStartWhenIdle && !current.currentSong
      recordSong(song)
      dispatch({
        type: ActionTypes.ADD_TO_QUEUE,
        payload: {
          song,
          entryId: createId('entry'),
          allowDuplicates: QUEUE_CONFIG.allowDuplicates,
          autoStart: QUEUE_CONFIG.autoStartWhenIdle,
          requestedBy,
        },
      })
      return { ok: true, started }
    },
    removeFromQueue(entryId) {
      dispatch({ type: ActionTypes.REMOVE_FROM_QUEUE, payload: { entryId } })
    },
    reorderQueue(fromIndex, toIndex) {
      dispatch({ type: ActionTypes.REORDER_QUEUE, payload: { fromIndex, toIndex } })
    },
    skipSong() {
      dispatch({ type: ActionTypes.SKIP_SONG })
    },
    songEnded(entryId) {
      dispatch({ type: ActionTypes.SONG_ENDED, payload: { entryId } })
    },
    clearQueue() {
      dispatch({ type: ActionTypes.CLEAR_QUEUE })
    },
    setVolume(value) {
      dispatch({ type: ActionTypes.SET_VOLUME, payload: { volume: value } })
    },
    toggleMute() {
      dispatch({ type: ActionTypes.TOGGLE_MUTE })
    },
    setPlaybackStatus(status, entryId) {
      dispatch({ type: ActionTypes.SET_PLAYBACK_STATUS, payload: { status, entryId } })
    },

    // Playback commands, forwarded to the mounted player.
    play() {
      playerRef.current?.play()
    },
    pause() {
      playerRef.current?.pause()
    },
    togglePlay() {
      if (stateRef.current.isPlaying) playerRef.current?.pause()
      else playerRef.current?.play()
    },
    stop() {
      playerRef.current?.stop()
    },
    retry() {
      playerRef.current?.retry()
    },
    seek(seconds) {
      playerRef.current?.seek?.(seconds)
    },
    setGuideEnabled(enabled) {
      playerRef.current?.setGuideEnabled?.(enabled)
    },
    getProgress() {
      return playerRef.current?.getProgress() ?? { current: 0, duration: 0 }
    },
    async toggleFullscreen(element) {
      if (getFullscreenElement()) await exitFullscreen()
      else await enterFullscreen(element)
    },
  }), [registerPlayer])

  return (
    <KaraokeActionsContext.Provider value={actions}>
      <KaraokeStateContext.Provider value={state}>{children}</KaraokeStateContext.Provider>
    </KaraokeActionsContext.Provider>
  )
}

export function useKaraokeState() {
  const value = useContext(KaraokeStateContext)
  if (!value) throw new Error('useKaraokeState must be used inside <KaraokeProvider>')
  return value
}

export function useKaraokeActions() {
  const value = useContext(KaraokeActionsContext)
  if (!value) throw new Error('useKaraokeActions must be used inside <KaraokeProvider>')
  return value
}
