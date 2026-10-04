import { useCallback, useEffect, useState } from 'react'
import { PLAYER_CONFIG } from '../../config/appConfig'
import { cx } from '../../utils/classNames'

// The video ignores taps (watch-only, see karaoke.css). YouTube may still show
// an ad with its own "Skip" button; the app can't press it (YouTube doesn't
// allow that), so "⏭ Skip ad" lets taps through to the video for a few
// seconds. It locks again by itself, and when the song changes.
export function useVideoUnlock(songKey) {
  const [until, setUntil] = useState(null)
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    setUntil(null) // a new song starts locked
  }, [songKey])

  useEffect(() => {
    if (until == null) return undefined
    const timer = window.setInterval(() => {
      const time = Date.now()
      setNow(time)
      if (time >= until) setUntil(null)
    }, 250)
    return () => window.clearInterval(timer)
  }, [until])

  const unlock = useCallback(() => {
    const time = Date.now()
    setNow(time)
    setUntil(time + PLAYER_CONFIG.adUnlockSeconds * 1000)
  }, [])
  const lock = useCallback(() => setUntil(null), [])

  const unlocked = until != null && now < until
  const secondsLeft = unlocked ? Math.max(1, Math.ceil((until - now) / 1000)) : 0
  return { unlocked, secondsLeft, unlock, lock }
}

export function AdSkipUnlock({ unlocked, secondsLeft, unlock, lock }) {
  return (
    <button
      type="button"
      className={cx('ad-skip', unlocked && 'ad-skip--unlocked')}
      onClick={unlocked ? lock : unlock}
      aria-pressed={unlocked}
      aria-label={
        unlocked
          ? `The video is unlocked for ${secondsLeft} seconds: tap YouTube's Skip button on the ad. Tap here to lock it now.`
          : "Skip ad: unlock the video for a few seconds so you can tap YouTube's Skip button"
      }
      title={unlocked ? 'Tap YouTube’s “Skip” button on the ad' : 'Ad playing? Unlock the video to tap YouTube’s Skip button'}
    >
      {unlocked ? <>👆 Tap “Skip” on the ad · {secondsLeft}</> : '⏭ Skip ad'}
    </button>
  )
}
