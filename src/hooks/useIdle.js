import { useEffect, useState } from 'react'

const EVENTS = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'wheel']

// True after `timeoutMs` without pointer/keyboard activity. Used to fade
// Karaoke Mode controls on the TV while a song plays.
export function useIdle(timeoutMs, enabled = true) {
  const [idle, setIdle] = useState(false)
  useEffect(() => {
    if (!enabled) {
      setIdle(false)
      return undefined
    }
    let timer = window.setTimeout(() => setIdle(true), timeoutMs)
    const onActivity = () => {
      setIdle(false)
      window.clearTimeout(timer)
      timer = window.setTimeout(() => setIdle(true), timeoutMs)
    }
    EVENTS.forEach((e) => window.addEventListener(e, onActivity, { passive: true }))
    return () => {
      window.clearTimeout(timer)
      EVENTS.forEach((e) => window.removeEventListener(e, onActivity))
    }
  }, [timeoutMs, enabled])
  return idle
}
