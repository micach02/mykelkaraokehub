import { useEffect } from 'react'
import { useKaraokePlayer } from '../../hooks/useKaraokePlayer'
import { PlayerOverlay } from './PlayerOverlay'
import { VideoShield, useVideoLock } from './VideoLock'
import { PracticeStage } from '../scoring/PracticeStage'
import { cx } from '../../utils/classNames'

/**
 * Plays one song at a time through the official YouTube embedded player
 * (or a built-in practice track) and reports when it ends.
 *
 *   <KaraokePlayer song={currentSong} entryId={entryId} onEnded={handleSongEnded} />
 *
 * `onRegister` receives { play, pause, stop, seek, setGuideEnabled, retry,
 * getProgress } so external
 * controls can drive playback.
 */
export function KaraokePlayer({
  song,
  entryId,
  autoplay = true,
  volume = 100,
  isMuted = false,
  onEnded,
  onStatusChange,
  onRegister,
  nextSong,
  lastPlayedSong,
  onSkip,
  onPlayAgain,
  onBrowse,
}) {
  const player = useKaraokePlayer({ song, entryId, autoplay, volume, isMuted, onEnded, onStatusChange })
  const { containerRef, status, error, engineKind, play, pause, stop, seek, setGuideEnabled, retry, getProgress } = player

  useEffect(() => {
    if (!onRegister) return undefined
    return onRegister({ play, pause, stop, seek, setGuideEnabled, retry, getProgress })
  }, [onRegister, play, pause, stop, seek, setGuideEnabled, retry, getProgress])

  // The video works like a normal YouTube player unless locked (the switch
  // is in the player controls); then only the ad Skip corner takes taps.
  const { locked } = useVideoLock()
  const isYouTube = Boolean(song) && engineKind === 'youtube'

  return (
    <div className={cx('karaoke-player', `karaoke-player--${status}`)}>
      <div
        ref={containerRef}
        className={cx('karaoke-player__video', engineKind !== 'youtube' && 'karaoke-player__video--hidden')}
      />
      {isYouTube && locked && <VideoShield />}
      {song && engineKind === 'practice' && <PracticeStage song={song} getProgress={getProgress} />}
      <PlayerOverlay
        song={song}
        status={status}
        error={error}
        nextSong={nextSong}
        lastPlayedSong={lastPlayedSong}
        onPlay={play}
        onRetry={retry}
        onSkip={onSkip}
        onPlayAgain={onPlayAgain}
        onBrowse={onBrowse}
      />
    </div>
  )
}
