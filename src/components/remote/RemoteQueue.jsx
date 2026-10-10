import { getThumbnailUrl } from '../../services/youtubeService'
import { RequesterBadge } from '../common/RequesterBadge'

export function RemoteQueue({ queue, myId, onRemove, disabled }) {
  if (!queue.length) {
    return (
      <div className="remote-empty">
        <p className="remote-empty__icon" aria-hidden="true">🎤</p>
        <p className="remote-empty__title">The queue is empty</p>
        <p>Search for a song and tap “+ Add”.</p>
      </div>
    )
  }
  return (
    <ol className="remote-list remote-queue" aria-label="Up next">
      {queue.map((entry, index) => {
        const mine = entry.requestedBy?.id === myId
        const thumbnail = entry.song.thumbnail || getThumbnailUrl(entry.song.youtubeVideoId)
        return (
          <li key={entry.entryId} className={mine ? 'remote-song remote-song--mine' : 'remote-song'}>
            <span className="remote-queue__index">{index + 1}</span>
            {thumbnail && <img className="remote-song__thumb" src={thumbnail} alt="" loading="lazy" />}
            <span className="remote-song__text">
              <span className="remote-song__title">{entry.song.title}</span>
              <span className="remote-song__artist">{entry.song.artist}</span>
              <RequesterBadge requestedBy={entry.requestedBy} myId={myId} />
            </span>
            {mine && (
              <button
                type="button"
                className="remote-remove"
                onClick={() => onRemove(entry)}
                disabled={disabled}
                aria-label={`Remove ${entry.song.title} from the queue`}
              >
                ✕
              </button>
            )}
          </li>
        )
      })}
    </ol>
  )
}
