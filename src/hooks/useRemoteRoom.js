import { useCallback, useEffect, useState } from 'react'
import { getRemoteIdentity, getRoomInfo, getSungSongs, openRoomEvents, recordSungSong, saveRemoteName, sendRoomCommand } from '../services/roomService'

/**
 * Phone side of a karaoke room.
 *
 * connection: 'connecting' | 'live' | 'reconnecting' | 'not-found' | 'error'
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

  useEffect(() => {
    let disposed = false
    let close = () => {}
    setConnection('connecting')

    getRoomInfo(code)
      .then((info) => {
        if (disposed) return
        setHostOnline(info.hostOnline)
        close = openRoomEvents(code, { role: 'remote' }, {
          onOpen: () => !disposed && setConnection('live'),
          state: (snapshot) => setRoom({ ...snapshot, receivedAt: Date.now() }),
          presence: (presence) => setHostOnline(presence.hostOnline),
          onError: (source) => {
            if (disposed) return
            // CLOSED: the server refused (room gone). Otherwise it retries itself.
            if (source.readyState === 2) {
              getRoomInfo(code).then(
                () => setAttempt((n) => n + 1),
                (error) => setConnection(error.code === 'room-not-found' ? 'not-found' : 'error'),
              )
            } else {
              setConnection('reconnecting')
            }
          },
        })
      })
      .catch((error) => {
        if (!disposed) setConnection(error.code === 'room-not-found' ? 'not-found' : 'error')
      })

    return () => {
      disposed = true
      close()
    }
  }, [code, attempt])

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
