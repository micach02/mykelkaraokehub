import { useEffect, useState } from 'react'
import { refreshServerStatus, useServerStatus } from '../../hooks/useServerStatus'
import { IS_HOSTED_SERVER } from '../../services/apiClient'

const SLOW_MS = 3000 // a first check still pending after this → probably waking
const RETRY_MS = 4000

// Online version: the free karaoke server sleeps when nobody uses it and
// takes about a minute to wake. Say so (with a timer) instead of showing
// errors, and check again until it answers.
export function ServerWaking() {
  const { status, error, isLoading } = useServerStatus()
  const [startedAt] = useState(() => Date.now())
  const [now, setNow] = useState(() => Date.now())

  const offline = error?.code === 'server-offline'
  const waking = IS_HOSTED_SERVER && !status && (offline || (isLoading && now - startedAt > SLOW_MS))
  const watching = IS_HOSTED_SERVER && !status

  useEffect(() => {
    if (!watching) return undefined
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [watching])

  // Keep checking while it's asleep.
  useEffect(() => {
    if (!IS_HOSTED_SERVER || !offline) return undefined
    const timer = window.setInterval(() => refreshServerStatus(), RETRY_MS)
    return () => window.clearInterval(timer)
  }, [offline])

  if (!waking) return null
  const seconds = Math.round((now - startedAt) / 1000)
  return (
    <div className="server-waking" role="status">
      <span className="spinner server-waking__spinner" aria-hidden="true" />
      <span>
        <strong>Waking up the karaoke server… {seconds}s</strong>
        <span className="server-waking__text">Free hosting sleeps when nobody uses it. It takes about a minute, and everything starts by itself.</span>
      </span>
    </div>
  )
}
