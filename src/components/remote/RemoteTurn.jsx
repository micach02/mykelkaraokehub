import { useEffect, useRef } from 'react'
import { cx } from '../../utils/classNames'

// Where this person's next song is: singing now, up next, or #N in line.
export function getMyTurn({ nowPlaying, queue = [], myId }) {
  if (nowPlaying?.requestedBy?.id === myId) return { kind: 'now', song: nowPlaying.song }
  const index = queue.findIndex((entry) => entry.requestedBy?.id === myId)
  if (index === -1) return null
  return { kind: index === 0 ? 'next' : 'waiting', position: index + 1, song: queue[index].song }
}

// When this person's song starts on the TV: a message and a short buzz, so
// they don't miss it while browsing for the next song.
export function useTurnAlert(turn, notify) {
  const announced = useRef(null)
  const songId = turn?.kind === 'now' ? turn.song.id : null
  // Keyed by song id: snapshots arrive often, but each song is announced once.
  useEffect(() => {
    if (!songId || announced.current === songId) return
    announced.current = songId
    notify(turn.song)
    navigator.vibrate?.([80, 60, 80])
  }, [songId])
}

// Slim banner under "Now playing".
export function RemoteTurn({ turn }) {
  if (!turn) return null
  const text = {
    now: '🎤 It’s your turn! Sing!',
    next: '⏭ You’re up next. Get ready!',
    waiting: `🎶 Your next song is #${turn.position} in line`,
  }[turn.kind]
  return (
    <p className={cx('remote-turn', `remote-turn--${turn.kind}`)} role="status">
      {text}
      {turn.kind !== 'now' && <span className="remote-turn__song">{turn.song.title}</span>}
    </p>
  )
}
