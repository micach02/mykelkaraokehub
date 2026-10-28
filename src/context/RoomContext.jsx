import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useKaraokeActions, useKaraokeState } from './KaraokeContext'
import { useToast } from './ToastContext'
import { useOptionalScoring } from './ScoringContext'
import { useLibrarySongs } from '../hooks/useLibrary'
import { useRecentSongs } from '../hooks/useRecentSongs'
import { useServerStatus } from '../hooks/useServerStatus'
import {
  COMMANDS,
  createRoom as createRoomRequest,
  getJoinUrl,
  loadHostedRoom,
  openRoomEvents,
  publishRoomState,
  saveHostedRoom,
  toRemoteSong,
} from '../services/roomService'
import { ROOM_CONFIG } from '../config/appConfig'
import { canPhoneControl, canPhoneGoNext, getRoomSettings, useRoomSettings } from '../services/roomSettings'
import { showReaction } from '../services/reactionBus'
import { pushMicBatch } from '../services/phoneMicBus'
import { getLeaderboard, usePartyScores } from '../services/leaderboardService'
import { REACTIONS } from '../utils/reactions'

const RoomContext = createContext(null)
const MAX_SAVED_SONGS_SHARED = 100
const MAX_RECENT_SONGS_SHARED = 30

// The score screen, for phones. autoNextAt (TV clock) becomes nextInSeconds
// when published, so phones count down on their own clock.
function buildResults(scoring) {
  if (scoring?.phase !== 'results' || !scoring.results) return null
  const { result, song } = scoring.results
  return {
    song: { title: song.title, artist: song.artist },
    score: result.totalScore,
    grade: result.gradeInfo.label,
    emoji: result.gradeInfo.emoji,
    autoNextAt: scoring.autoNextAt ?? null,
  }
}

// What phones see: the TV's now playing, queue, saved and recent songs. (The
// score screen, while it's up, is added as `results`.)
function buildSnapshot(karaoke, library, recent) {
  return {
    nowPlaying: karaoke.currentSong
      ? { song: toRemoteSong(karaoke.currentSong), requestedBy: karaoke.currentRequestedBy ?? null, duetWith: karaoke.currentDuetWith ?? null }
      : null,
    isPlaying: karaoke.isPlaying,
    queue: karaoke.queue.map((entry) => ({
      entryId: entry.entryId,
      song: toRemoteSong(entry.song),
      requestedBy: entry.requestedBy ?? null,
      duetWith: entry.duetWith ?? null,
    })),
    savedSongs: library.slice(0, MAX_SAVED_SONGS_SHARED).map(toRemoteSong),
    recentSongs: recent.slice(0, MAX_RECENT_SONGS_SHARED).map(toRemoteSong),
  }
}

/**
 * The TV/PC side of a karaoke room. Creates the room, applies commands from
 * phones to the local queue (the TV stays the source of truth), and publishes
 * the queue back to phones.
 *
 * status: 'idle' | 'creating' | 'connecting' | 'live' | 'reconnecting' | 'error'
 */
export function RoomHostProvider({ children }) {
  const karaoke = useKaraokeState()
  const actions = useKaraokeActions()
  const library = useLibrarySongs()
  const recent = useRecentSongs()
  const { show } = useToast()
  const { lanOrigins, status: serverStatus } = useServerStatus()
  const scoring = useOptionalScoring()
  const scoringRef = useRef(scoring)
  useLayoutEffect(() => {
    scoringRef.current = scoring
  }, [scoring])

  const [room, setRoom] = useState(() => loadHostedRoom())
  const [status, setStatus] = useState(() => (loadHostedRoom() ? 'connecting' : 'idle'))
  const [remotes, setRemotes] = useState(0)
  const [error, setError] = useState(null)
  const [panelOpen, setPanelOpen] = useState(false)
  const [selectedOrigin, setSelectedOrigin] = useState(null)

  const karaokeRef = useRef(karaoke)
  useLayoutEffect(() => {
    karaokeRef.current = karaoke
  }, [karaoke])

  const createRoom = useCallback(async ({ openPanel = true, quiet = false, previous = null } = {}) => {
    setStatus('creating')
    setError(null)
    try {
      const created = await createRoomRequest(previous)
      saveHostedRoom(created)
      setRoom(created)
      if (openPanel) setPanelOpen(true)
      return created
    } catch (err) {
      setStatus('error')
      setError(err)
      if (!quiet) show(err.message, { variant: 'error', duration: 5000 })
      return null
    }
  }, [show])

  // The landing page shows the room's QR code, so it starts a room on the
  // first visit. Only once per page load: after "End room", it stays ended.
  const autoStartedRef = useRef(false)
  const ensureRoom = useCallback(() => {
    if (autoStartedRef.current) return
    autoStartedRef.current = true
    if (!room) createRoom({ openPanel: false, quiet: true })
  }, [room, createRoom])

  // The first try failed because the server was asleep: try again once it
  // answers (it was woken by the status checks).
  useEffect(() => {
    if (serverStatus && autoStartedRef.current && !room && status === 'error' && error?.code === 'server-offline') {
      createRoom({ openPanel: false, quiet: true })
    }
  }, [serverStatus, room, status, error, createRoom])

  const closeRoom = useCallback(() => {
    saveHostedRoom(null)
    setRoom(null)
    setStatus('idle')
    setRemotes(0)
    setPanelOpen(false)
  }, [])

  // The room disappeared (usually the karaoke server restarted): start a new one.
  // Asks for the same code back, so phones reconnect without re-scanning. A
  // free server may still be waking up: keep trying for about a minute.
  const replaceRoom = useCallback(async () => {
    const previous = loadHostedRoom()
    saveHostedRoom(null)
    setRoom(null)
    let created = null
    for (let attempt = 0; attempt < ROOM_CONFIG.recreateAttempts && !created; attempt += 1) {
      if (attempt > 0) await new Promise((resolve) => window.setTimeout(resolve, ROOM_CONFIG.recreateRetryMs))
      created = await createRoom({ openPanel: false, quiet: true, previous })
    }
    if (!created) return
    if (created.code === previous?.code) {
      show('Reconnected to the karaoke server. Same room, so phones reconnect by themselves.', { variant: 'info' })
    } else {
      show('The karaoke server restarted, so there is a new room. Friends need to scan the new QR code.', { variant: 'info', duration: 6000 })
    }
  }, [createRoom, show])

  // ---- Commands from phones ----
  const handleCommand = useCallback((command) => {
    const { type, payload, from } = command
    const who = from?.name || 'A guest'
    const current = karaokeRef.current
    switch (type) {
      case COMMANDS.ADD_TO_QUEUE: {
        // phoneMic: this phone will be the mic for its song (see ScoringContext).
        const requestedBy = payload.phoneMic ? { ...from, phoneMic: true } : from
        const result = actions.addToQueue(payload.song, { requestedBy })
        if (result.ok) show(`📱 ${who} ${result.started ? 'started' : 'added'} “${payload.song.title}”`)
        break
      }
      case COMMANDS.REMOVE_FROM_QUEUE: {
        const entry = current.queue.find((e) => e.entryId === payload.entryId)
        // Phones may only remove songs they added.
        if (entry && entry.requestedBy?.id === from?.id) actions.removeFromQueue(entry.entryId)
        break
      }
      // The singer's phone is the mic: only the current song's singer counts.
      case COMMANDS.MIC_FRAMES:
        if (from?.id && current.currentRequestedBy?.id === from.id) pushMicBatch(from.id, payload)
        break
      case COMMANDS.REACT:
        if (current.currentSong && REACTIONS.includes(payload.emoji)) showReaction({ emoji: payload.emoji, name: who, senderId: from?.id })
        break
      case COMMANDS.SET_DUET: {
        // Phones may set a duet partner only on their own songs.
        const isCurrent = payload.entryId === current.currentEntryId
        const owner = isCurrent ? current.currentRequestedBy : current.queue.find((e) => e.entryId === payload.entryId)?.requestedBy
        if (owner && owner.id === from?.id) actions.setDuet(payload.entryId, payload.partner)
        break
      }
      case COMMANDS.SKIP_SONG: {
        const settings = getRoomSettings()
        // On the score screen, ⏭ on a phone is the screen's Next Song button
        // (for the singer who was scored or the next singer, unless the host
        // lets everyone).
        if (scoringRef.current?.phase === 'results') {
          if (!canPhoneGoNext({ settings, scoredRequestedBy: current.currentRequestedBy, nextRequestedBy: current.queue[0]?.requestedBy, phoneId: from?.id })) break
          scoringRef.current.nextSong()
          show(`📱 ${who}: next song`, { variant: 'info' })
        } else if (current.currentSong && canPhoneControl({ settings, nowPlayingRequestedBy: current.currentRequestedBy, phoneId: from?.id })) {
          actions.skipSong()
          show(`📱 ${who} skipped “${current.currentSong.title}”`, { variant: 'info' })
        }
        break
      }
      case COMMANDS.TOGGLE_PLAY:
        // Phones pause/resume only their own song, unless the host lets everyone.
        if (
          current.currentSong &&
          scoringRef.current?.phase !== 'results' &&
          canPhoneControl({ settings: getRoomSettings(), nowPlayingRequestedBy: current.currentRequestedBy, phoneId: from?.id })
        ) actions.togglePlay()
        break
      default:
        break
    }
  }, [actions, show])

  const handleCommandRef = useRef(handleCommand)
  useLayoutEffect(() => {
    handleCommandRef.current = handleCommand
  }, [handleCommand])

  // ---- Connection ----
  const [connectionId, setConnectionId] = useState(0)
  useEffect(() => {
    if (!room) return undefined
    let disposed = false
    setStatus('connecting')
    const close = openRoomEvents(room.code, { role: 'host', hostToken: room.hostToken }, {
      onOpen: () => {
        if (disposed) return
        setStatus('live')
        setConnectionId((n) => n + 1) // republish the queue after (re)connecting
      },
      presence: (info) => setRemotes(info.remotes ?? 0),
      command: (command) => handleCommandRef.current(command),
      onError: (source) => {
        if (disposed) return
        // CLOSED means the server refused the room (gone after a restart);
        // otherwise EventSource is retrying a dropped connection by itself.
        if (source.readyState === 2) replaceRoom()
        else setStatus('reconnecting')
      },
    })
    return () => {
      disposed = true
      close()
    }
  }, [room, replaceRoom])

  // ---- Publish the queue to phones ----
  const results = useMemo(() => buildResults(scoring), [scoring])
  const [settings] = useRoomSettings()
  const partyScores = usePartyScores()
  const leaderboard = useMemo(
    () => getLeaderboard(5).map(({ id, singer, songTitle, score }) => ({ id, singer, songTitle, score })),
    [partyScores],
  )
  const snapshot = useMemo(
    // micWanted: the TV scores songs, so the singer's phone mic is useful.
    () => ({ ...buildSnapshot(karaoke, library, recent), results, settings, leaderboard, micWanted: Boolean(scoring?.autoScore) }),
    [karaoke, library, recent, results, settings, leaderboard, scoring?.autoScore],
  )
  const snapshotKey = JSON.stringify(snapshot)

  // Re-send now and then while a song plays (time left changes by itself).
  const [refreshTick, setRefreshTick] = useState(0)
  useEffect(() => {
    if (!room || !karaoke.isPlaying) return undefined
    const timer = window.setInterval(() => setRefreshTick((n) => n + 1), ROOM_CONFIG.refreshWhilePlayingMs)
    return () => window.clearInterval(timer)
  }, [room, karaoke.isPlaying])

  useEffect(() => {
    if (!room || status !== 'live') return undefined
    const timer = window.setTimeout(() => {
      const state = JSON.parse(snapshotKey)
      // Seconds left in the current song, as of now (phones count down).
      if (state.nowPlaying) {
        const { current = 0, duration = 0 } = actions.getProgress?.() ?? {}
        state.nowPlaying.remaining = duration > 0 ? Math.max(0, Math.round(duration - current)) : null
      }
      if (state.results) {
        const { autoNextAt, ...rest } = state.results
        state.results = { ...rest, nextInSeconds: autoNextAt ? Math.max(0, Math.round((autoNextAt - Date.now()) / 1000)) : null }
      }
      publishRoomState(room.code, room.hostToken, state).catch((err) => {
        if (err.status === 404) replaceRoom()
      })
    }, ROOM_CONFIG.publishThrottleMs)
    return () => window.clearTimeout(timer)
  }, [room, status, snapshotKey, connectionId, replaceRoom, refreshTick, actions])

  const origin = selectedOrigin && lanOrigins.includes(selectedOrigin) ? selectedOrigin : lanOrigins[0] ?? null
  const value = useMemo(() => ({
    room,
    status,
    remotes,
    error,
    joinUrl: room ? getJoinUrl(room.code, origin) : null,
    lanOrigins,
    selectedOrigin: origin,
    setSelectedOrigin,
    createRoom,
    ensureRoom,
    closeRoom,
    panelOpen,
    openPanel: () => setPanelOpen(true),
    closePanel: () => setPanelOpen(false),
  }), [room, status, remotes, error, origin, lanOrigins, createRoom, ensureRoom, closeRoom, panelOpen])

  return <RoomContext.Provider value={value}>{children}</RoomContext.Provider>
}

export function useRoom() {
  const value = useContext(RoomContext)
  if (!value) throw new Error('useRoom must be used inside <RoomHostProvider>')
  return value
}
