// Pure karaoke session state. No side effects, no IDs generated here —
// callers pass `entryId`s so the reducer stays deterministic and testable.
//
// These action types are also the future wire protocol for shared karaoke
// rooms: a phone remote will send the same actions to the host.

export const ActionTypes = {
  PLAY_SONG: 'PLAY_SONG',
  PLAY_QUEUE_ITEM: 'PLAY_QUEUE_ITEM',
  ADD_TO_QUEUE: 'ADD_TO_QUEUE',
  REMOVE_FROM_QUEUE: 'REMOVE_FROM_QUEUE',
  REORDER_QUEUE: 'REORDER_QUEUE',
  SKIP_SONG: 'SKIP_SONG',
  SONG_ENDED: 'SONG_ENDED',
  CLEAR_QUEUE: 'CLEAR_QUEUE',
  SET_VOLUME: 'SET_VOLUME',
  TOGGLE_MUTE: 'TOGGLE_MUTE',
  SET_FULLSCREEN: 'SET_FULLSCREEN',
  SET_PLAYBACK_STATUS: 'SET_PLAYBACK_STATUS',
  RESTORE_SESSION: 'RESTORE_SESSION',
}

const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/

export const initialState = {
  currentSong: null,
  // Changes every time a song starts (even the same song again). The player
  // loads a new video whenever this changes.
  currentEntryId: null,
  // false when the song was restored after a refresh: cue it, don't blast it.
  autoplay: true,
  // [{ entryId, song, addedAt, requestedBy }]
  queue: [],
  isPlaying: false,
  // 'idle' | 'loading' | 'ready' | 'playing' | 'paused' | 'buffering' | 'stopped' | 'ended' | 'error'
  playbackStatus: 'idle',
  volume: 100,
  isMuted: false,
  isFullscreen: false,
  // The song that played last, offered as "Sing it again" when the queue runs out.
  lastPlayedSong: null,
  // Who asked for the current song (from a phone remote), or null.
  currentRequestedBy: null,
}

export function createQueueEntry(song, entryId, { requestedBy = null, addedAt = Date.now() } = {}) {
  return { entryId, song, addedAt, requestedBy }
}

// ---- Selectors ----

export function isSongQueued(state, songId) {
  return state.queue.some((entry) => entry.song.id === songId)
}

export function getQueuePosition(state, songId) {
  const index = state.queue.findIndex((entry) => entry.song.id === songId)
  return index === -1 ? null : index + 1
}

export function getNextEntry(state) {
  return state.queue[0] ?? null
}

// Business rule for adding to the queue, used before dispatching so the UI
// can explain why a song was not added.
export function canAddToQueue(state, song, { allowDuplicates = false } = {}) {
  if (!song) return { ok: false, reason: 'invalid', message: 'That song could not be added.' }
  if (!allowDuplicates && isSongQueued(state, song.id)) {
    return { ok: false, reason: 'duplicate', message: 'Song already in queue' }
  }
  return { ok: true }
}

// ---- Helpers ----

function startSong(state, song, entryId, { autoplay = true, requestedBy = null } = {}) {
  return {
    ...state,
    currentRequestedBy: requestedBy,
    currentSong: song,
    currentEntryId: entryId,
    autoplay,
    isPlaying: false,
    playbackStatus: 'loading',
    lastPlayedSong: state.currentSong ?? state.lastPlayedSong,
  }
}

function advance(state) {
  const [next, ...rest] = state.queue
  if (!next) {
    return {
      ...state,
      currentSong: null,
      currentEntryId: null,
      currentRequestedBy: null,
      isPlaying: false,
      playbackStatus: 'idle',
      lastPlayedSong: state.currentSong ?? state.lastPlayedSong,
    }
  }
  return { ...startSong(state, next.song, next.entryId, { requestedBy: next.requestedBy }), queue: rest }
}

function clampVolume(value) {
  const n = Math.round(Number(value))
  if (!Number.isFinite(n)) return 100
  return Math.min(100, Math.max(0, n))
}

// ---- Reducer ----

export function karaokeReducer(state, action) {
  switch (action.type) {
    // Play Now: the selected song becomes current immediately. The existing
    // queue stays as it is; if the song was waiting in the queue it is taken
    // out so it doesn't play twice. The interrupted song is not re-queued.
    case ActionTypes.PLAY_SONG: {
      const { song, entryId } = action.payload
      const queue = state.queue.filter((entry) => entry.song.id !== song.id)
      return { ...startSong(state, song, entryId, { requestedBy: action.payload.requestedBy ?? null }), queue }
    }

    case ActionTypes.PLAY_QUEUE_ITEM: {
      const entry = state.queue.find((e) => e.entryId === action.payload.entryId)
      if (!entry) return state
      return {
        ...startSong(state, entry.song, entry.entryId, { requestedBy: entry.requestedBy }),
        queue: state.queue.filter((e) => e.entryId !== entry.entryId),
      }
    }

    case ActionTypes.ADD_TO_QUEUE: {
      const { song, entryId, allowDuplicates = false, autoStart = false, requestedBy = null, addedAt } = action.payload
      if (!canAddToQueue(state, song, { allowDuplicates }).ok) return state
      if (autoStart && !state.currentSong) return startSong(state, song, entryId, { requestedBy })
      return { ...state, queue: [...state.queue, createQueueEntry(song, entryId, { requestedBy, addedAt })] }
    }

    case ActionTypes.REMOVE_FROM_QUEUE:
      return { ...state, queue: state.queue.filter((e) => e.entryId !== action.payload.entryId) }

    case ActionTypes.REORDER_QUEUE: {
      const { fromIndex, toIndex } = action.payload
      const last = state.queue.length - 1
      if (fromIndex === toIndex || fromIndex < 0 || fromIndex > last || toIndex < 0 || toIndex > last) return state
      const queue = [...state.queue]
      const [moved] = queue.splice(fromIndex, 1)
      queue.splice(toIndex, 0, moved)
      return { ...state, queue }
    }

    case ActionTypes.SKIP_SONG:
      return advance(state)

    // Guarded by entryId so a late "ended" event from a previous video
    // can't skip the song that just started.
    case ActionTypes.SONG_ENDED:
      if (action.payload?.entryId && action.payload.entryId !== state.currentEntryId) return state
      return advance(state)

    case ActionTypes.CLEAR_QUEUE:
      return { ...state, queue: [] }

    case ActionTypes.SET_VOLUME: {
      const volume = clampVolume(action.payload.volume)
      return { ...state, volume, isMuted: volume === 0 ? state.isMuted : false }
    }

    case ActionTypes.TOGGLE_MUTE:
      return { ...state, isMuted: !state.isMuted }

    case ActionTypes.SET_FULLSCREEN:
      return { ...state, isFullscreen: Boolean(action.payload.value) }

    case ActionTypes.SET_PLAYBACK_STATUS: {
      const { status, entryId } = action.payload
      if (entryId && entryId !== state.currentEntryId) return state
      return { ...state, playbackStatus: status, isPlaying: status === 'playing' }
    }

    case ActionTypes.RESTORE_SESSION: {
      const { currentSong, currentRequestedBy = null, queue, volume, isMuted, entryId } = action.payload
      const restored = {
        ...state,
        queue: Array.isArray(queue) ? queue : state.queue,
        volume: volume == null ? state.volume : clampVolume(volume),
        isMuted: Boolean(isMuted),
      }
      return currentSong ? startSong(restored, currentSong, entryId, { autoplay: false, requestedBy: currentRequestedBy }) : restored
    }

    default:
      return state
  }
}

// What gets saved to storage. Playback status is deliberately not persisted.
export function toPersistedSession(state) {
  return {
    currentSong: state.currentSong,
    currentRequestedBy: state.currentRequestedBy ?? null,
    queue: state.queue,
    volume: state.volume,
    isMuted: state.isMuted,
  }
}

// Validates whatever came back from storage before trusting it.
export function sanitizePersistedSession(raw) {
  if (!raw || typeof raw !== 'object') return null
  // Only playable YouTube songs (older versions stored placeholder songs).
  const isSong = (s) =>
    Boolean(s) && typeof s === 'object' && typeof s.id === 'string' && typeof s.title === 'string' && VIDEO_ID.test(s.youtubeVideoId ?? '')
  const isRequester = (r) => Boolean(r) && typeof r === 'object' && typeof r.id === 'string'
  const queue = Array.isArray(raw.queue)
    ? raw.queue.filter((e) => e && typeof e.entryId === 'string' && isSong(e.song))
    : []
  return {
    currentSong: isSong(raw.currentSong) ? raw.currentSong : null,
    currentRequestedBy: isRequester(raw.currentRequestedBy) ? raw.currentRequestedBy : null,
    queue,
    volume: typeof raw.volume === 'number' ? raw.volume : null,
    isMuted: Boolean(raw.isMuted),
  }
}
