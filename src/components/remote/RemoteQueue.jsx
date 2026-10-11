import { useState } from 'react'
import { getThumbnailUrl } from '../../services/youtubeService'
import { RequesterBadge } from '../common/RequesterBadge'

// "🎤🎤 Duet" on your own queued song: add (or change/remove) a partner's
// name, shown on the TV as "🎤🎤 Mika & Jo".
function DuetEditor({ entry, onSetDuet, disabled }) {
  const [open, setOpen] = useState(false)
  const [partner, setPartner] = useState(entry.duetWith ?? '')
  const { title } = entry.song

  if (!open) {
    return (
      <button
        type="button"
        className="remote-duet"
        onClick={() => {
          setPartner(entry.duetWith ?? '')
          setOpen(true)
        }}
        disabled={disabled}
        aria-label={entry.duetWith ? `Change the duet partner for ${title}` : `Make ${title} a duet`}
      >
        {entry.duetWith ? '✎ Duet partner' : '🎤🎤 Duet'}
      </button>
    )
  }
  return (
    <form
      className="remote-duet-form"
      onSubmit={(event) => {
        event.preventDefault()
        onSetDuet(entry, partner.trim())
        setOpen(false)
      }}
    >
      <input
        className="remote-name__input"
        value={partner}
        maxLength={40}
        placeholder="Partner’s name"
        aria-label={`Duet partner for ${title}`}
        // The form opened because this was tapped: type right away.
        autoFocus
        onChange={(event) => setPartner(event.target.value)}
      />
      <div className="remote-duet-form__actions">
        <button type="submit" className="remote-add" disabled={!partner.trim()}>Save</button>
        {entry.duetWith && (
          <button
            type="button"
            className="remote-name__skip"
            onClick={() => {
              onSetDuet(entry, '')
              setOpen(false)
            }}
          >
            Remove
          </button>
        )}
        <button type="button" className="remote-name__skip" onClick={() => setOpen(false)}>Cancel</button>
      </div>
    </form>
  )
}

export function RemoteQueue({ queue, myId, onRemove, onSetDuet, disabled }) {
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
              <RequesterBadge requestedBy={entry.requestedBy} duetWith={entry.duetWith} myId={myId} />
              {mine && onSetDuet && <DuetEditor entry={entry} onSetDuet={onSetDuet} disabled={disabled} />}
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
