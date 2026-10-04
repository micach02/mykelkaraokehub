import { useKaraokeActions, useKaraokeState } from '../../context/KaraokeContext'
import { SongArtwork } from '../songs/SongArtwork'
import { Button } from '../common/Button'
import { RequesterBadge } from '../common/RequesterBadge'

// Mobile "now playing" strip above the bottom nav. Tapping it opens the queue.
export function MiniPlayerBar({ onOpenQueue }) {
  const { currentSong, currentRequestedBy, queue, isPlaying } = useKaraokeState()
  const actions = useKaraokeActions()
  if (!currentSong && queue.length === 0) return null

  const nextSong = queue[0]?.song
  return (
    <div className="mini-player">
      <button type="button" className="mini-player__info" onClick={onOpenQueue} aria-label="Open queue">
        {currentSong && <SongArtwork song={currentSong} size="xs" />}
        <span className="mini-player__text">
          <span className="mini-player__title">{currentSong ? currentSong.title : 'Nothing playing'}</span>
          <span className="mini-player__sub">
            {nextSong ? `Up next: ${nextSong.title}` : currentSong?.artist ?? ''}
          </span>
        </span>
        {currentSong && <RequesterBadge requestedBy={currentRequestedBy} />}
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
