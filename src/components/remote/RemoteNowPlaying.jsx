import { useEffect, useState } from 'react'
import { getThumbnailUrl } from '../../services/youtubeService'
import { RequesterBadge } from '../common/RequesterBadge'

// Seconds left of the TV's "next song" countdown. The TV sends how many
// seconds were left when it published; this counts down on the phone's clock.
function useCountdown(results, receivedAt) {
  const [now, setNow] = useState(() => Date.now())
  const total = results?.nextInSeconds
  useEffect(() => {
    if (total == null) return undefined
    setNow(Date.now())
    const timer = window.setInterval(() => setNow(Date.now()), 250)
    return () => window.clearInterval(timer)
  }, [total, receivedAt])
  if (total == null) return null
  return Math.max(0, Math.ceil(total - (now - (receivedAt ?? now)) / 1000))
}

// The TV is showing a song's score: show it here too. ⏭ is the TV's
// "Next Song" button (with the same countdown).
function RemoteResults({ results, receivedAt, next, myId, onNext, disabled }) {
  const secondsLeft = useCountdown(results, receivedAt)
  return (
    <section className="remote-now remote-now--results" aria-label="Karaoke score">
      <div className="remote-now__text">
        <span className="remote-now__eyebrow">🏆 Karaoke score</span>
        <p className="remote-now__title">{results.song.title}</p>
        <p className="remote-score" aria-label={`Score ${results.score} out of 100, ${results.grade}`}>
          <span aria-hidden="true">{results.emoji}</span>
          <span className="remote-score__number">{results.score}</span>
          <span className="remote-score__grade">/ 100 · {results.grade}</span>
        </p>
        {next ? (
          <p className="remote-now__next">
            <span className="remote-now__next-text">
              Up next: {next.song.title}{secondsLeft != null ? ` · starts in ${secondsLeft}s` : ''}
            </span>
            <RequesterBadge requestedBy={next.requestedBy} myId={myId} />
          </p>
        ) : (
          <p className="remote-now__next">The queue is empty. Add a song!</p>
        )}
      </div>
      <div className="remote-now__controls">
        <button
          type="button"
          className="remote-control remote-control--primary remote-control--next"
          onClick={onNext}
          disabled={disabled || !next}
          aria-label={secondsLeft != null ? `Next song now (starts by itself in ${secondsLeft} seconds)` : 'Next song now'}
        >
          ⏭ Next song{secondsLeft != null ? ` (${secondsLeft})` : ''}
        </button>
      </div>
    </section>
  )
}

export function RemoteNowPlaying({ nowPlaying, isPlaying, next, myId, results, receivedAt, onTogglePlay, onSkip, disabled }) {
  if (results) {
    return <RemoteResults results={results} receivedAt={receivedAt} next={next} myId={myId} onNext={onSkip} disabled={disabled} />
  }
  if (!nowPlaying) {
    return (
      <section className="remote-now remote-now--empty" aria-label="Now playing">
        <span className="remote-now__eyebrow">Now playing</span>
        <p className="remote-now__title">Nothing yet — add a song!</p>
      </section>
    )
  }
  const { song, requestedBy } = nowPlaying
  const thumbnail = song.thumbnail || getThumbnailUrl(song.youtubeVideoId)
  return (
    <section className="remote-now" aria-label="Now playing">
      {thumbnail && <img className="remote-now__thumb" src={thumbnail} alt="" />}
      <div className="remote-now__text">
        <span className="remote-now__eyebrow">{isPlaying ? '● Now playing' : 'Now playing'}</span>
        <p className="remote-now__title">{song.title}</p>
        <p className="remote-now__artist">{song.artist}</p>
        <RequesterBadge requestedBy={requestedBy} myId={myId} />
        {next && (
          <p className="remote-now__next">
            <span className="remote-now__next-text">Up next: {next.song.title}</span>
            <RequesterBadge requestedBy={next.requestedBy} myId={myId} />
          </p>
        )}
      </div>
      <div className="remote-now__controls">
        <button type="button" className="remote-control remote-control--primary" onClick={onTogglePlay} disabled={disabled} aria-label={isPlaying ? 'Pause on TV' : 'Play on TV'}>
          {isPlaying ? '⏸' : '▶'}
        </button>
        <button type="button" className="remote-control" onClick={onSkip} disabled={disabled} aria-label="Skip to the next song">
          ⏭
        </button>
      </div>
    </section>
  )
}
