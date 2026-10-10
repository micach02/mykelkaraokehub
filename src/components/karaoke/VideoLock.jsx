import { useCallback, useSyncExternalStore } from 'react'
import { getItem, setItem, STORAGE_KEYS } from '../../services/storageService'
import { cx } from '../../utils/classNames'

// The video works like a normal YouTube player by default. The "🔒 Lock
// video" switch (in the player controls) makes it watch-only: no accidental
// pausing, YouTube links, or suggested videos. Remembered on this device.

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

// Shared by the player (shields) and the controls (switch).
const listeners = new Set()
const subscribe = (listener) => {
  listeners.add(listener)
  return () => listeners.delete(listener)
}
const isLocked = () => getItem(STORAGE_KEYS.videoLocked, false) === true

export function useVideoLock() {
  const locked = useSyncExternalStore(subscribe, isLocked, () => false)
  const toggle = useCallback(() => {
    setItem(STORAGE_KEYS.videoLocked, !isLocked())
    listeners.forEach((listener) => listener())
  }, [])
  return { locked, toggle }
}

// On/off switch, styled like the Auto-score switch.
export function VideoLockToggle({ size = 'md' }) {
  const { locked, toggle } = useVideoLock()
  return (
    <button
      type="button"
      role="switch"
      aria-checked={locked}
      aria-label="Lock video: taps on the video do nothing, except ad Skip buttons"
      className={cx('auto-score', `auto-score--${size}`, locked && 'auto-score--on')}
      onClick={toggle}
      title={locked ? 'Video locked (ad Skip buttons still work). Tap to unlock.' : 'Lock the video so taps can’t pause it or open YouTube'}
    >
      <span className="auto-score__track" aria-hidden="true">
        <span className="auto-score__thumb" />
      </span>
      <span className="auto-score__label">🔒 Lock video</span>
    </button>
  )
}
