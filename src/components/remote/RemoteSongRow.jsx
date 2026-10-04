import { memo } from 'react'
import { getThumbnailUrl } from '../../services/youtubeService'
import { FlagPH } from '../common/Icon'
import { cx } from '../../utils/classNames'

// state: 'idle' | 'sending' | 'queued'
export const RemoteSongRow = memo(function RemoteSongRow({ song, state = 'idle', onAdd, disabled }) {
  const thumbnail = song.thumbnail || getThumbnailUrl(song.youtubeVideoId)
  const queued = state === 'queued'
  return (
    <li className={cx('remote-song', queued && 'remote-song--queued')}>
      {thumbnail ? <img className="remote-song__thumb" src={thumbnail} alt="" loading="lazy" /> : <span className="remote-song__thumb" />}
      <span className="remote-song__text">
        <span className="remote-song__title">{song.title}</span>
        <span className="remote-song__artist">
          {song.isOPM && <FlagPH />} {song.artist}
          {song.channel && song.channel !== song.artist && <span className="remote-song__channel"> · {song.channel}</span>}
        </span>
      </span>
      <button
        type="button"
        className={cx('remote-add', queued && 'remote-add--done')}
        onClick={() => onAdd(song)}
        disabled={disabled || state === 'sending'}
        aria-label={queued ? `${song.title} is in the queue` : `Add ${song.title} to the queue`}
      >
        {state === 'sending' ? '…' : queued ? '✓' : '+ Add'}
      </button>
    </li>
  )
})
