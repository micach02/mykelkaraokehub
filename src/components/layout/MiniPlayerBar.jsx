import { useKaraokeActions, useKaraokeState } from '../../context/KaraokeContext'
import { SongArtwork } from '../songs/SongArtwork'
import { Button } from '../common/Button'
import { RequesterBadge } from '../common/RequesterBadge'
import { cx } from '../../utils/classNames'

// Mobile "now playing" strip above the bottom nav. Tapping it opens the queue.
// hidden: the big player is on screen, so this slides away (no duplicate).
export function MiniPlayerBar({ onOpenQueue, hidden = false }) {
  const { currentSong, currentRequestedBy, currentDuetWith, queue, isPlaying } = useKaraokeState()
  const actions = useKaraokeActions()
  if (!currentSong && queue.length === 0) return null

  const nextSong = queue[0]?.song
  return (
    <div className={cx('mini-player', hidden && 'mini-player--away')} inert={hidden || undefined} aria-hidden={hidden || undefined}>
      <button type="button" className="mini-player__info" onClick={onOpenQueue} aria-label="Open queue">
        {currentSong && <SongArtwork song={currentSong} size="xs" />}
        <span className="mini-player__text">
          <span className="mini-player__title">{currentSong ? currentSong.title : 'Nothing playing'}</span>
          <span className="mini-player__sub">
            {nextSong ? `Up next: ${nextSong.title}` : currentSong?.artist ?? ''}
          </span>
        </span>
        {currentSong && <RequesterBadge requestedBy={currentRequestedBy} duetWith={currentDuetWith} />}
      </button>
      {currentSong && (
        <Button
          variant="primary"
          size="md"
          iconOnly
          icon={isPlaying ? '⏸' : '▶'}
          aria-label={isPlaying ? 'Pause' : 'Play'}
          onClick={actions.togglePlay}
        />
      )}
      <Button size="md" iconOnly icon="⏭" aria-label="Skip song" disabled={!currentSong} onClick={actions.skipSong} />
      <Button size="md" icon="📋" onClick={onOpenQueue} aria-label={`Open queue, ${queue.length} songs waiting`}>
        {queue.length}
      </Button>
    </div>
  )
}
