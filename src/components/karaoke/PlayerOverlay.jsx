import { useEffect, useState } from 'react'
import { Button } from '../common/Button'
import { BRAND, PLAYER_CONFIG } from '../../config/appConfig'

// Everything drawn on top of the video: welcome, queue-empty, loading,
// ready-to-start, and error states.
export function PlayerOverlay({ song, status, error, nextSong, lastPlayedSong, onPlay, onRetry, onSkip, onPlayAgain, onBrowse }) {
  if (!song) {
    if (lastPlayedSong) {
      return (
        <div className="player-overlay player-overlay--solid">
          <div className="player-overlay__icon" aria-hidden="true">🎤</div>
          <h2 className="player-overlay__title">Queue is empty</h2>
          <p className="player-overlay__text">Choose another song to continue singing.</p>
          <div className="player-overlay__actions">
            <Button variant="primary" size="lg" icon="🔍" onClick={onBrowse}>Choose a Song</Button>
            <Button variant="secondary" size="lg" icon="↻" onClick={() => onPlayAgain(lastPlayedSong)}>
              Sing “{lastPlayedSong.title}” again
            </Button>
          </div>
        </div>
      )
    }
    return (
      <div className="player-overlay player-overlay--solid player-overlay--welcome">
        <div className="player-overlay__icon" aria-hidden="true">{BRAND.logoIcon}</div>
        <h2 className="player-overlay__title">Ready to sing?</h2>
        <p className="player-overlay__text">Pick a song or add a few to the queue — they'll play one after another.</p>
        <div className="player-overlay__actions">
          <Button variant="primary" size="lg" icon="🔍" onClick={onBrowse}>Find a Song</Button>
        </div>
      </div>
    )
  }

  if (status === 'error') {
    return <ErrorOverlay key={song.id} error={error} nextSong={nextSong} onRetry={onRetry} onSkip={onSkip} onBrowse={onBrowse} />
  }

  if (status === 'loading') {
    return (
      <div className="player-overlay player-overlay--dim" role="status">
        <div className="spinner" aria-hidden="true" />
        <p className="player-overlay__text">Loading “{song.title}”…</p>
      </div>
    )
  }

  if (status === 'ready' || status === 'stopped') {
    return (
      <div className="player-overlay player-overlay--dim">
        <Button variant="primary" size="xl" icon="▶" onClick={onPlay} aria-label={`Play ${song.title}`}>
          {status === 'stopped' ? 'Play again' : 'Play'}
        </Button>
        <p className="player-overlay__text">{song.title} · {song.artist}</p>
      </div>
    )
  }

  if (status === 'buffering') {
    return (
      <div className="player-overlay player-overlay--passive" role="status">
        <div className="spinner" aria-hidden="true" />
        <span className="sr-only">Buffering</span>
      </div>
    )
  }

  return null
}

function ErrorOverlay({ error, nextSong, onRetry, onSkip, onBrowse }) {
  const autoSkip = PLAYER_CONFIG.autoSkipOnErrorSeconds
  const [secondsLeft, setSecondsLeft] = useState(nextSong && autoSkip > 0 ? autoSkip : null)

  useEffect(() => {
    if (secondsLeft == null) return undefined
    if (secondsLeft <= 0) {
      onSkip()
      return undefined
    }
    const id = window.setTimeout(() => setSecondsLeft((s) => s - 1), 1000)
    return () => window.clearTimeout(id)
  }, [secondsLeft, onSkip])

  return (
    <div className="player-overlay player-overlay--solid player-overlay--error" role="alert">
      <div className="player-overlay__icon" aria-hidden="true">⚠️</div>
      <h2 className="player-overlay__title">Unable to play this song.</h2>
      <p className="player-overlay__text">{error?.message ?? 'The karaoke video may no longer be available.'}</p>
      {secondsLeft != null && nextSong && (
        <p className="player-overlay__text player-overlay__countdown">
          Skipping to “{nextSong.title}” in {secondsLeft}s…
        </p>
      )}
      <div className="player-overlay__actions">
        {nextSong ? (
          <Button variant="primary" size="lg" icon="⏭" onClick={onSkip}>Skip to Next Song</Button>
        ) : (
          <Button variant="primary" size="lg" icon="🔍" onClick={onBrowse}>Choose Another Song</Button>
        )}
        <Button variant="secondary" size="lg" icon="↻" onClick={onRetry}>Try Again</Button>
        {secondsLeft != null && (
          <Button variant="ghost" size="lg" onClick={() => setSecondsLeft(null)}>Cancel auto-skip</Button>
        )}
      </div>
    </div>
  )
}
