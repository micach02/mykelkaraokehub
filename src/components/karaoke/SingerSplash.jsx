import { useEffect, useState } from 'react'
import { useKaraokeState } from '../../context/KaraokeContext'
import { requesterName } from '../common/RequesterBadge'
import { PLAYER_CONFIG } from '../../config/appConfig'

// "🎤 Mika, you're up!" over the video for a few seconds when a song
// someone requested from their phone starts. Doesn't block anything.
export function SingerSplash() {
  const { currentEntryId, currentRequestedBy, currentDuetWith, currentSong } = useKaraokeState()
  const [splash, setSplash] = useState(null)

  useEffect(() => {
    const name = requesterName(currentRequestedBy)
    if (!currentEntryId || !currentSong || !name) {
      setSplash(null)
      return undefined
    }
    setSplash({
      key: currentEntryId,
      who: currentDuetWith ? `${name} & ${currentDuetWith}` : name,
      title: currentSong.title,
    })
    const timer = window.setTimeout(() => setSplash(null), PLAYER_CONFIG.singerSplashMs)
    return () => window.clearTimeout(timer)
    // A new song (entry) starts a new splash; nothing else should restart it.
  }, [currentEntryId])

  if (!splash) return null
  return (
    <div key={splash.key} className="singer-splash" role="status">
      <span className="singer-splash__eyebrow">🎤 Get ready!</span>
      <span className="singer-splash__who">
        {splash.who}, you’re up!
      </span>
      <span className="singer-splash__song">{splash.title}</span>
    </div>
  )
}
