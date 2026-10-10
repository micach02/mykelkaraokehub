import { memo, useLayoutEffect, useRef } from 'react'
import { cx } from '../../utils/classNames'
import { RequesterBadge, requesterName } from '../common/RequesterBadge'

// One row in "Up Next": number, title, and "artist · 🎤 requester". The
// number is the drag handle (it turns into a grip on hover; arrow keys move
// it too). ▲ ▼ ✕ appear on hover/focus, and stay visible on touch screens.
export const QueueItem = memo(function QueueItem({
  entry,
  index,
  total,
  isDragging,
  isDropTarget,
  onPlay,
  onRemove,
  onMove,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
}) {
  const { song } = entry
  const requester = requesterName(entry.requestedBy)
  const handleRef = useRef(null)
  const keepFocus = useRef(false)

  // Moving a DOM node can drop focus; put it back on the handle after a
  // keyboard move.
  useLayoutEffect(() => {
    if (keepFocus.current) {
      keepFocus.current = false
      handleRef.current?.focus()
    }
  }, [index])

  const move = (delta) => {
    keepFocus.current = true
    onMove(index, delta)
  }

  return (
    <li
      className={cx('queue-item', isDragging && 'queue-item--dragging', isDropTarget && 'queue-item--drop-target')}
      draggable
      onDragStart={(event) => {
        event.dataTransfer.effectAllowed = 'move'
        event.dataTransfer.setData('text/plain', String(index))
        onDragStart(index)
      }}
      onDragOver={(event) => {
        event.preventDefault()
        event.dataTransfer.dropEffect = 'move'
        onDragOver(index)
      }}
      onDrop={(event) => {
        event.preventDefault()
        onDrop(index)
      }}
      onDragEnd={onDragEnd}
    >
      <button
        ref={handleRef}
        type="button"
        className="queue-item__handle"
        aria-label={`Reorder ${song.title}, position ${index + 1} of ${total}. Use the up and down arrow keys to move.`}
        onKeyDown={(event) => {
          if (event.key === 'ArrowUp' && index > 0) {
            event.preventDefault()
            move(-1)
          } else if (event.key === 'ArrowDown' && index < total - 1) {
            event.preventDefault()
            move(1)
          }
        }}
      >
        <span className="queue-item__index">{index + 1}</span>
        <span className="queue-item__grip" aria-hidden="true">⠿</span>
      </button>
      <button
        type="button"
        className="queue-item__main"
        onClick={() => onPlay(entry.entryId)}
        aria-label={`Play ${song.title} by ${song.artist} now${requester ? `, requested by ${requester}` : ''}`}
        title="Play now"
      >
        <span className="queue-item__title">{song.title}</span>
        <span className="queue-item__meta">
          <span className="queue-item__artist">{song.artist}</span>
          <RequesterBadge requestedBy={entry.requestedBy} className="queue-item__requester" />
        </span>
      </button>
      <div className="queue-item__actions">
        <button
          type="button"
          className="icon-btn"
          aria-label={`Move ${song.title} up`}
          disabled={index === 0}
          onClick={() => onMove(index, -1)}
        >
          ▲
        </button>
        <button
          type="button"
          className="icon-btn"
          aria-label={`Move ${song.title} down`}
          disabled={index === total - 1}
          onClick={() => onMove(index, 1)}
        >
          ▼
        </button>
        <button
          type="button"
          className="icon-btn icon-btn--danger"
          aria-label={`Remove ${song.title} from queue`}
          onClick={() => onRemove(entry)}
        >
          ✕
        </button>
      </div>
    </li>
  )
})
