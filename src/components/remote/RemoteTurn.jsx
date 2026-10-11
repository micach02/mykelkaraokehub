import { useEffect, useRef, useState } from 'react'
import { cx } from '../../utils/classNames'

// Songs whose length is unknown count as this long; each change of song
// (loading, a score screen…) adds a little.
const ASSUMED_SONG_SECONDS = 240
const BETWEEN_SONGS_SECONDS = 15

// Where this person's next song is: singing now, up next, or #N in line.
export function getMyTurn({ nowPlaying, queue = [], myId }) {
  if (nowPlaying?.requestedBy?.id === myId) return { kind: 'now', song: nowPlaying.song }
  const index = queue.findIndex((entry) => entry.requestedBy?.id === myId)
  if (index === -1) return null
  return { kind: index === 0 ? 'next' : 'waiting', position: index + 1, song: queue[index].song, ahead: queue.slice(0, index) }
}

// About how long until this person's song starts, in seconds: what's left of
// the current song (the TV says how much, as of receivedAt; it keeps going
// while playing) plus the songs ahead.
export function estimateWaitSeconds({ turn, nowPlaying, isPlaying, receivedAt, now = Date.now() }) {
  if (!turn || turn.kind === 'now') return null
  let left = 0
  if (nowPlaying) {
    if (typeof nowPlaying.remaining === 'number') {
      const elapsed = isPlaying && receivedAt ? (now - receivedAt) / 1000 : 0
      left = Math.max(0, nowPlaying.remaining - elapsed)
    } else {
      left = (nowPlaying.song?.duration ?? ASSUMED_SONG_SECONDS) / 2
    }
    left += BETWEEN_SONGS_SECONDS
  }
  for (const entry of turn.ahead ?? []) left += (entry.song.duration ?? ASSUMED_SONG_SECONDS) + BETWEEN_SONGS_SECONDS
  return Math.round(left)
}

// "about 8 min" / "in less than a minute"
export function formatWait(seconds) {
  if (seconds == null) return ''
  if (seconds < 60) return 'in less than a minute'
  return `in about ${Math.round(seconds / 60)} min`
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

// Slim banner under "Now playing", with a rough wait time.
export function RemoteTurn({ turn, nowPlaying, isPlaying, receivedAt }) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!turn || turn.kind === 'now') return undefined
    const timer = window.setInterval(() => setNow(Date.now()), 15000)
    return () => window.clearInterval(timer)
  }, [turn])
  if (!turn) return null
  const wait = formatWait(estimateWaitSeconds({ turn, nowPlaying, isPlaying, receivedAt, now }))
  const text = {
    now: '🎤 It’s your turn! Sing!',
    next: `⏭ You’re up next, ${wait}. Get ready!`,
    waiting: `🎶 Your next song is #${turn.position} in line, ${wait}`,
  }[turn.kind]
  return (
    <p className={cx('remote-turn', `remote-turn--${turn.kind}`)} role="status">
      {text}
      {turn.kind !== 'now' && <span className="remote-turn__song">{turn.song.title}</span>}
    </p>
  )
}
