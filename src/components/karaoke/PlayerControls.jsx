import { useKaraokeActions, useKaraokeState } from '../../context/KaraokeContext'
import { usePlaybackProgress } from '../../hooks/useKaraokePlayer'
import { Button } from '../common/Button'
import { AutoScoreToggle } from '../scoring/AutoScoreToggle'
import { VideoLockToggle } from './VideoLock'
import { formatTime } from '../../utils/time'
import { isFullscreenSupported } from '../../utils/fullscreen'
import { cx } from '../../utils/classNames'

// Transport controls bound to the karaoke session. size: 'md' | 'xl' (TV)
export function PlayerControls({ size = 'md', fullscreenTarget }) {
  const { currentSong, isPlaying, playbackStatus, volume, isMuted, isFullscreen, queue } = useKaraokeState()
  const actions = useKaraokeActions()
  const { current, duration } = usePlaybackProgress(actions.getProgress, playbackStatus)
  const buttonSize = size === 'xl' ? 'xl' : 'md'
  const hasSong = Boolean(currentSong)
  const percent = duration > 0 ? Math.min(100, (current / duration) * 100) : 0
  const effectiveVolume = isMuted ? 0 : volume

  return (
    <div className={cx('player-controls', `player-controls--${size}`)}>
      <div className="progress">
        <span className="progress__time">{formatTime(current)}</span>
        <div
          className="progress__track"
          role="progressbar"
          aria-label="Song progress"
          aria-valuemin={0}
          aria-valuemax={Math.round(duration)}
          aria-valuenow={Math.round(current)}
          aria-valuetext={`${formatTime(current)} of ${formatTime(duration)}`}
        >
          <div className="progress__fill" style={{ width: `${percent}%` }} />
        </div>
        <span className="progress__time">{formatTime(duration)}</span>
      </div>

      <div className="player-controls__row">
        <div className="player-controls__group">
          <Button
            variant="primary"
            size={buttonSize}
            iconOnly
            icon={isPlaying ? '⏸' : '▶'}
            aria-label={isPlaying ? 'Pause' : 'Play'}
            disabled={!hasSong || playbackStatus === 'error'}
            onClick={actions.togglePlay}
          />
          <Button
            size={buttonSize}
            iconOnly
            icon="⏹"
            aria-label="Stop"
            disabled={!hasSong || playbackStatus === 'error'}
            onClick={actions.stop}
          />
          <Button
            size={buttonSize}
            iconOnly
            icon="⏭"
            aria-label={queue.length ? `Skip to next song: ${queue[0].song.title}` : 'Skip song'}
            disabled={!hasSong}
            onClick={actions.skipSong}
          />
          {hasSong && <AutoScoreToggle size={size} />}
          {hasSong && currentSong.source !== 'practice' && <VideoLockToggle size={size} />}
        </div>

        <div className="player-controls__group player-controls__volume">
          <Button
            variant="ghost"
            size={buttonSize}
            iconOnly
            icon={effectiveVolume === 0 ? '🔇' : effectiveVolume < 50 ? '🔉' : '🔊'}
            aria-label={isMuted ? 'Unmute' : 'Mute'}
            aria-pressed={isMuted}
            onClick={actions.toggleMute}
          />
          <input
            type="range"
            className="volume-slider"
            min={0}
            max={100}
            step={5}
            value={effectiveVolume}
            aria-label="Volume"
            aria-valuetext={`${effectiveVolume}%`}
            onChange={(event) => actions.setVolume(Number(event.target.value))}
            style={{ '--value': `${effectiveVolume}%` }}
          />
          {isFullscreenSupported() && (
            <Button
              variant="ghost"
              size={buttonSize}
              iconOnly
              icon={isFullscreen ? '🗗' : '⛶'}
              aria-label={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
              onClick={() => actions.toggleFullscreen(fullscreenTarget?.current)}
            />
          )}
        </div>
      </div>
    </div>
  )
}
