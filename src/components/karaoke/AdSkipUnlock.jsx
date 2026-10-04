import { useCallback, useEffect, useState } from 'react'
import { PLAYER_CONFIG } from '../../config/appConfig'
import { cx } from '../../utils/classNames'

// The video is watch-only: two transparent shields stop taps from pausing it
// or opening YouTube links. They leave the bottom-right corner open, where
// YouTube shows its "Skip" button on ads, so it can be tapped straight away.
// (The app can't press it itself; YouTube doesn't allow that.)
export function VideoShield() {
  return (
    <>
      <div className="video-shield video-shield--top" aria-hidden="true" />
      <div className="video-shield video-shield--left" aria-hidden="true" />
    </>
  )
}

// Backup: "🔓 Unlock video" removes the shields for a few seconds (in case
// something else on the video needs a tap). It locks again by itself, and
// when the song changes.
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

export function AdSkipUnlock({ unlocked, unlock, lock }) {
  return (
    <button
      type="button"
      className={cx('ad-skip', unlocked && 'ad-skip--unlocked')}
      onClick={unlocked ? lock : unlock}
      aria-pressed={unlocked}
      aria-label={unlocked ? 'Lock the video again' : 'Unlock the video, so any part of it can be tapped'}
      title={unlocked ? 'Lock the video again' : 'Ad Skip buttons work right away. Use this only if something else on the video needs a tap.'}
    >
      {unlocked ? '🔒 Lock video' : '🔓 Unlock video'}
    </button>
  )
}
