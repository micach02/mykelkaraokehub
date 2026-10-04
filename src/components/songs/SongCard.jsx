import { memo } from 'react'
import { SongArtwork } from './SongArtwork'
import { SongActions } from './SongActions'
import { cx } from '../../utils/classNames'
import { FlagPH } from '../common/Icon'

export const SongCard = memo(function SongCard({ song, isCurrent, queuePosition, onPlay, onQueue, isSaved, onToggleSave, hasMelody, personalBest }) {
  return (
    <article className={cx('song-card', isCurrent && 'song-card--current')}>
      <div className="song-card__art">
        <SongArtwork song={song} />
        {isCurrent && <span className="badge badge--live">● Now playing</span>}
        {!isCurrent && queuePosition && <span className="badge">#{queuePosition} in queue</span>}
        {personalBest != null && <span className="badge badge--best" title="Your best Karaoke Score">🏆 {personalBest}</span>}
      </div>
      <div className="song-card__body">
        <h3 className="song-card__title" title={song.title}>{song.title}</h3>
        <p className="song-card__artist" title={song.artist}>{song.artist}</p>
        <p className="song-card__meta">
          <span className={cx('chip', song.isOPM && 'chip--opm')}>{song.isOPM ? <><FlagPH /> OPM</> : song.category}</span>
          {hasMelody && <span className="chip chip--melody" title="Has a melody guide: full Melody scoring">🎯 Melody scoring</span>}
          {song.year && <span>{song.year}</span>}
          {/* YouTube finds: the channel tells versions of the same song apart. */}
          {song.channel && song.channel !== song.artist && (
            <span className="song-card__channel" title={`YouTube channel: ${song.channel}`}>▶ {song.channel}</span>
          )}
        </p>
        <SongActions
          song={song}
          isQueued={Boolean(queuePosition)}
          onPlay={onPlay}
          onQueue={onQueue}
          isSaved={isSaved}
          onToggleSave={onToggleSave}
        />
      </div>
    </article>
  )
})
