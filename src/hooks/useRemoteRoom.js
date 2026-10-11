import { useCallback, useEffect, useRef, useState } from 'react'
import { getRemoteIdentity, getRoomInfo, getSungSongs, openRoomEvents, recordSungSong, saveRemoteName, sendRoomCommand } from '../services/roomService'
import { IS_HOSTED_SERVER } from '../services/apiClient'
import { ROOM_CONFIG } from '../config/appConfig'

// The room may only be gone for a moment: the server restarted (the TV brings
// the same code back) or the free host is waking up.
const isTemporary = (error) => error?.code === 'room-not-found' || (IS_HOSTED_SERVER && error?.code === 'server-offline')

/**
 * Phone side of a karaoke room.
 *
 * connection: 'connecting' | 'live' | 'reconnecting' | 'waiting' (room gone for
 *             now; the TV is expected back) | 'not-found' | 'error'
 * room: the TV's latest snapshot { nowPlaying, isPlaying, queue, savedSongs,
 *       recentSongs, results } plus receivedAt (this phone's clock)
 * sungSongs: songs this person sang (their requests that played), newest first
 */
export function useRemoteRoom(code) {
  const [identity, setIdentity] = useState(getRemoteIdentity)
  const [room, setRoom] = useState(null)
  const [connection, setConnection] = useState('connecting')
  const [hostOnline, setHostOnline] = useState(null)
  const [attempt, setAttempt] = useState(0)
  const [sungSongs, setSungSongs] = useState(getSungSongs)
  const wasLive = useRef(false)
  const waitingSince = useRef(null)

  // Room gone? Wait for the TV for a while instead of giving up at once.
  const lost = useCallback((error) => {
    if (!isTemporary(error)) {
      setConnection('error')
      return
    }
    waitingSince.current ??= Date.now()
    setConnection('waiting')
  }, [])

  useEffect(() => {
    if (connection !== 'waiting') return undefined
    const limit = wasLive.current ? ROOM_CONFIG.remoteWaitMs : ROOM_CONFIG.remoteFirstWaitMs
    const timer = window.setInterval(() => {
      getRoomInfo(code).then(
        () => setAttempt((n) => n + 1), // it's back: reconnect
        (error) => {
          if (Date.now() - waitingSince.current < limit && isTemporary(error)) return
          window.clearInterval(timer)
          waitingSince.current = null
          setConnection(error.code === 'room-not-found' ? 'not-found' : 'error')
        },
      )
    }, ROOM_CONFIG.remoteWaitPollMs)
    return () => window.clearInterval(timer)
  }, [connection, code])

  useEffect(() => {
    let disposed = false
    let close = () => {}
    setConnection('connecting')

    getRoomInfo(code)
      .then((info) => {
        if (disposed) return
        setHostOnline(info.hostOnline)
        close = openRoomEvents(code, { role: 'remote' }, {
          onOpen: () => {
            if (disposed) return
            wasLive.current = true
            waitingSince.current = null
            setConnection('live')
          },
          state: (snapshot) => setRoom({ ...snapshot, receivedAt: Date.now() }),
          presence: (presence) => setHostOnline(presence.hostOnline),
          onError: (source) => {
            if (disposed) return
            // CLOSED: the server refused (room gone). Otherwise it retries itself.
            if (source.readyState === 2) {
              getRoomInfo(code).then(() => setAttempt((n) => n + 1), (error) => !disposed && lost(error))
            } else {
              setConnection('reconnecting')
            }
          },
        })
      })
      .catch((error) => {
        if (!disposed) lost(error)
      })

    return () => {
      disposed = true
      close()
    }
  }, [code, attempt, lost])

  // My request started playing on the TV → it's one of my sung songs.
  const playing = room?.nowPlaying
  const mineNowPlaying = playing?.requestedBy?.id === identity.id ? playing.song : null
  const mineNowPlayingId = mineNowPlaying?.id
  useEffect(() => {
    // Keyed by id: each new snapshot is a new object, but it's the same song.
    if (mineNowPlaying) setSungSongs(recordSungSong(mineNowPlaying))
  }, [mineNowPlayingId])

  const send = useCallback((type, payload = {}) => sendRoomCommand(code, { type, payload, from: identity }), [code, identity])

  const setName = useCallback((name) => setIdentity(saveRemoteName(name)), [])

  return {
    identity,
    setName,
    room,
    sungSongs,
    connection,
    hostOnline,
    send,
    retry: () => setAttempt((n) => n + 1),
  }
}
