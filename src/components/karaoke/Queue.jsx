import { useCallback, useId, useState } from 'react'
import { useQueue } from '../../hooks/useQueue'
import { useKaraokeState } from '../../context/KaraokeContext'
import { QueueItem } from './QueueItem'
import { SongArtwork } from '../songs/SongArtwork'
import { RequesterBadge } from '../common/RequesterBadge'
import { Button } from '../common/Button'
import { Modal } from '../common/Modal'
import { EmptyState } from '../common/EmptyState'
import { pluralize } from '../../utils/text'
import { cx } from '../../utils/classNames'

// variant: 'sidebar' | 'page' | 'sheet'
export function Queue({ variant = 'sidebar', onBrowse }) {
  const { queue, currentSong, playQueueItem, removeFromQueue, reorderQueue, moveEntry, skipSong, clearQueue } = useQueue()
  const { isPlaying, currentRequestedBy } = useKaraokeState()
  const [confirmClear, setConfirmClear] = useState(false)
  const [dragIndex, setDragIndex] = useState(null)
  const [overIndex, setOverIndex] = useState(null)
  const [announcement, setAnnouncement] = useState('')
  const headingId = useId()

  const handleMove = useCallback((index, delta) => {
    const target = index + delta
    if (target < 0 || target >= queue.length) return
    moveEntry(index, delta)
    setAnnouncement(`Moved ${queue[index].song.title} to position ${target + 1}`)
  }, [moveEntry, queue])

  const handleDrop = useCallback((index) => {
    if (dragIndex != null && dragIndex !== index) {
      reorderQueue(dragIndex, index)
      setAnnouncement(`Moved ${queue[dragIndex].song.title} to position ${index + 1}`)
    }
    setDragIndex(null)
    setOverIndex(null)
  }, [dragIndex, queue, reorderQueue])

  const handleDragEnd = useCallback(() => {
    setDragIndex(null)
    setOverIndex(null)
  }, [])

  return (
    <div className={cx('queue', `queue--${variant}`)}>
      <section className="queue__section" aria-label="Now playing">
        <h2 className="queue__heading">Now Playing</h2>
        {currentSong ? (
          <div className={cx('queue-now', isPlaying && 'queue-now--live')}>
            <SongArtwork song={currentSong} size="sm" />
            <div className="queue-now__text">
              <p className="queue-now__title">🎤 {currentSong.title}</p>
              <p className="queue-now__artist">{currentSong.artist}</p>
              <RequesterBadge requestedBy={currentRequestedBy} />
            </div>
            <Button size="sm" iconOnly icon="⏭" aria-label={`Skip ${currentSong.title}`} onClick={skipSong} />
          </div>
        ) : (
          <p className="queue__muted">Nothing playing right now.</p>
        )}
      </section>

      <section className="queue__section queue__section--grow" aria-labelledby={headingId}>
        <div className="queue__header">
          <h2 id={headingId} className="queue__heading">
            Up Next <span className="count-badge">{queue.length}</span>
          </h2>
          {queue.length > 0 && (
            <Button variant="ghost" size="sm" icon="🗑" onClick={() => setConfirmClear(true)}>Clear</Button>
          )}
        </div>

        {queue.length > 0 ? (
          <ol className="queue__list">
            {queue.map((entry, index) => (
              <QueueItem
                key={entry.entryId}
                entry={entry}
                index={index}
                total={queue.length}
                isDragging={dragIndex === index}
                isDropTarget={overIndex === index && dragIndex !== index}
                onPlay={playQueueItem}
                onRemove={removeFromQueue}
                onMove={handleMove}
                onDragStart={setDragIndex}
                onDragOver={setOverIndex}
                onDrop={handleDrop}
                onDragEnd={handleDragEnd}
              />
            ))}
          </ol>
        ) : (
          <EmptyState
            compact
            icon="🎤"
            title="Queue is empty"
            description="Choose another song to continue singing."
            action={onBrowse && <Button variant="secondary" size="sm" icon="🔍" onClick={onBrowse}>Browse songs</Button>}
          />
        )}
        <p className="sr-only" aria-live="polite">{announcement}</p>
      </section>

      <Modal
        open={confirmClear}
        onClose={() => setConfirmClear(false)}
        title="Clear the queue?"
        description={`This removes ${pluralize(queue.length, 'song')} waiting in the queue. The current song keeps playing.`}
        footer={
          <>
            <Button onClick={() => setConfirmClear(false)}>Cancel</Button>
            <Button
              variant="danger"
              onClick={() => {
                clearQueue()
                setConfirmClear(false)
              }}
            >
              Clear queue
            </Button>
          </>
        }
      />
    </div>
  )
}
