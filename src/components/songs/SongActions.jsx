import { Button } from '../common/Button'

// Play / Queue, plus ☆ Save for songs found on YouTube (when onToggleSave is given).
export function SongActions({ song, isQueued, onPlay, onQueue, isSaved = false, onToggleSave, size = 'sm' }) {
  return (
    <div className="song-actions">
      <Button
        variant="primary"
        size={size}
        icon="▶"
        onClick={() => onPlay(song)}
        aria-label={`Play ${song.title} by ${song.artist} now`}
      >
        Play
      </Button>
      <Button
        variant={isQueued ? 'ghost' : 'secondary'}
        size={size}
        icon={isQueued ? '✓' : '+'}
        onClick={() => onQueue(song)}
        aria-label={isQueued ? `${song.title} is already in the queue` : `Add ${song.title} to queue`}
      >
        {isQueued ? 'Queued' : 'Queue'}
      </Button>
      {onToggleSave && (
        <Button
          variant="ghost"
          size={size}
          iconOnly
          icon={isSaved ? '★' : '☆'}
          className={isSaved ? 'btn--saved' : undefined}
          aria-pressed={isSaved}
          aria-label={isSaved ? `Remove ${song.title} from My Songs` : `Save ${song.title} to My Songs`}
          title={isSaved ? 'Saved in My Songs' : 'Save to My Songs'}
          onClick={() => onToggleSave(song)}
        />
      )}
    </div>
  )
}
