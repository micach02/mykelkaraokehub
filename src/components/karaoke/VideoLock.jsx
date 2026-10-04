import { useCallback, useState } from 'react'
import { getItem, setItem, STORAGE_KEYS } from '../../services/storageService'
import { cx } from '../../utils/classNames'

// The video works like a normal YouTube player by default. "🔒 Lock video"
// makes it watch-only (no accidental pausing, YouTube links, or suggested
// videos) and is remembered on this device until unlocked.

// Locked: two transparent shields cover the video, leaving the bottom-right
// corner open, where YouTube shows its "Skip" button on ads, so ads can
// still be skipped right away. (The app can't press Skip itself.)
export function VideoShield() {
  return (
    <>
      <div className="video-shield video-shield--top" aria-hidden="true" />
      <div className="video-shield video-shield--left" aria-hidden="true" />
    </>
  )
}

export function useVideoLock() {
  const [locked, setLocked] = useState(() => getItem(STORAGE_KEYS.videoLocked, false) === true)
  const toggle = useCallback(() => {
    setLocked((current) => {
      setItem(STORAGE_KEYS.videoLocked, !current)
      return !current
    })
  }, [])
  return { locked, toggle }
}

export function VideoLockToggle({ locked, toggle }) {
  return (
    <button
      type="button"
      className={cx('video-lock', locked && 'video-lock--locked')}
      onClick={toggle}
      aria-pressed={locked}
      aria-label={locked ? 'Video locked: taps do nothing except ad Skip buttons. Unlock the video' : 'Lock the video, so taps can’t pause it or open YouTube'}
      title={locked ? 'Unlock the video' : 'Lock the video (ad Skip buttons still work)'}
    >
      {locked ? '🔒 Locked · Unlock' : '🔓 Lock video'}
    </button>
  )
}
