import { useQueue } from '../../hooks/useQueue'
import { useLibrary } from '../../hooks/useLibrary'
import { useScoreHistory } from '../../hooks/useScoreHistory'
import { hasReferenceMelody } from '../../services/scoring/referenceMelodyService'
import { SongSkeletons } from '../common/Skeleton'
import { EmptyState } from '../common/EmptyState'
import { SongCard } from './SongCard'
import { SongListItem } from './SongListItem'
import { cx } from '../../utils/classNames'

// layout: 'grid' (cards) | 'row' (horizontal scroller) | 'list' (compact rows)
// stale: showing the previous results while new ones load (dimmed).
export function SongGrid({ songs, isLoading = false, stale = false, error = null, empty, layout = 'grid', label }) {
  const { currentSong, queuePositions, playNow, addToQueue } = useQueue()
  const { isSaved, toggleSave } = useLibrary()
  const { bests } = useScoreHistory()

  if (isLoading && !songs.length) return <SongSkeletons layout={layout === 'list' ? 'list' : 'grid'} />
  if (error) {
    return (
      <EmptyState
        icon="⚠️"
        title="We couldn't load the songs"
        description="Please check your connection and try again."
        compact
      />
    )
  }
  if (!songs.length) {
    return empty ?? <EmptyState icon="🎵" title="No songs here yet" description="Try another category." compact />
  }

  const Item = layout === 'list' ? SongListItem : SongCard
  return (
    <ul className={cx('song-grid', `song-grid--${layout}`, stale && 'song-grid--stale')} aria-label={label} aria-busy={stale || undefined}>
      {songs.map((song) => (
        <li key={song.id}>
          <Item
            song={song}
            isCurrent={currentSong?.id === song.id}
            queuePosition={queuePositions.get(song.id) ?? null}
            onPlay={playNow}
            onQueue={addToQueue}
            // Only YouTube finds can be saved; catalog songs are always available.
            isSaved={song.source === 'youtube' && isSaved(song.id)}
            onToggleSave={song.source === 'youtube' ? toggleSave : undefined}
            hasMelody={hasReferenceMelody(song.id)}
            personalBest={bests[song.id]?.score ?? null}
          />
        </li>
      ))}
    </ul>
  )
}
