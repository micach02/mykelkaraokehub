import { useEffect, useState } from 'react'
import { useScoring } from '../../context/ScoringContext'
import { SCORING_SESSION } from '../../config/scoringConfig'

// Get Ready! 3… 2… 1… then the song restarts and scoring begins together.
// (This timer only drives the display; scoring is synced to the player's
// own playback clock.)
export function SingingCountdown() {
  const { phase, take, beginSinging, cancel } = useScoring()
  const active = phase === 'countdown'
  const [count, setCount] = useState(SCORING_SESSION.countdownSeconds)

  useEffect(() => {
    if (!active) return undefined
    let remaining = SCORING_SESSION.countdownSeconds
    setCount(remaining)
    const timer = window.setInterval(() => {
      remaining -= 1
      setCount(remaining)
      if (remaining <= 0) {
        window.clearInterval(timer)
        beginSinging()
      }
    }, 1000)
    return () => window.clearInterval(timer)
  }, [active, beginSinging])

  if (!active) return null
  return (
    <div className="countdown" role="alertdialog" aria-labelledby="countdown-title">
      <p id="countdown-title" className="countdown__title">Get Ready!</p>
      {take?.song && <p className="countdown__song">{take.song.title} · {take.song.artist}</p>}
      <p key={count} className="countdown__number" aria-live="assertive">{count > 0 ? count : '🎤 SING!'}</p>
      <button type="button" className="countdown__cancel" onClick={cancel}>Cancel</button>
    </div>
  )
}
