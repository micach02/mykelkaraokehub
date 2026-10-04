import { useCallback, useEffect, useState } from 'react'
import { getRemoteIdentity, getRoomInfo, openRoomEvents, saveRemoteName, sendRoomCommand } from '../services/roomService'

/**
 * Phone side of a karaoke room.
 *
 * connection: 'connecting' | 'live' | 'reconnecting' | 'not-found' | 'error'
 * room: the TV's latest snapshot { nowPlaying, isPlaying, queue, savedSongs }
 */
export function useRemoteRoom(code) {
  const [identity, setIdentity] = useState(getRemoteIdentity)
  const [room, setRoom] = useState(null)
  const [connection, setConnection] = useState('connecting')
  const [hostOnline, setHostOnline] = useState(null)
  const [attempt, setAttempt] = useState(0)

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
          state: (snapshot) => setRoom(snapshot),
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

  const send = useCallback((type, payload = {}) => sendRoomCommand(code, { type, payload, from: identity }), [code, identity])

  const setName = useCallback((name) => setIdentity(saveRemoteName(name)), [])

  return {
    identity,
    setName,
    room,
    connection,
    hostOnline,
    send,
    retry: () => setAttempt((n) => n + 1),
  }
}
