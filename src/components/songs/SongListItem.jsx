import { memo } from 'react'
import { SongArtwork } from './SongArtwork'
import { SongActions } from './SongActions'
import { cx } from '../../utils/classNames'

// Compact row, used in the Karaoke Mode song picker.
export const SongListItem = memo(function SongListItem({ song, isCurrent, queuePosition, onPlay, onQueue, isSaved, onToggleSave, hasMelody, personalBest }) {
  return (
    <div className={cx('song-row', isCurrent && 'song-row--current')}>
      <SongArtwork song={song} size="xs" />
      <div className="song-row__text">
        <div className="song-row__title">{song.title}</div>
        <div className="song-row__artist">
          {song.artist}
          {song.channel && song.channel !== song.artist && <span> · ▶ {song.channel}</span>}
          {isCurrent && <span className="song-row__status"> · Now playing</span>}
          {!isCurrent && queuePosition && <span className="song-row__status"> · #{queuePosition} in queue</span>}
          {hasMelody && <span className="song-row__status"> · 🎯 Melody scoring</span>}
          {personalBest != null && <span className="song-row__status"> · 🏆 {personalBest}</span>}
        </div>
      </div>
      <SongActions
        song={song}
        isQueued={Boolean(queuePosition)}
        onPlay={onPlay}
        onQueue={onQueue}
        isSaved={isSaved}
        onToggleSave={onToggleSave}
        size="md"
      />
    </div>
  )
})
