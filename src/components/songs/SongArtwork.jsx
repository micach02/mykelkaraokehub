import { memo, useState } from 'react'
import { getThumbnailUrl } from '../../services/youtubeService'
import { getArtworkStyle, getInitials } from '../../utils/artwork'
import { cx } from '../../utils/classNames'
import { FlagPH } from '../common/Icon'

// Real thumbnail when available; otherwise generated cover art.
export const SongArtwork = memo(function SongArtwork({ song, size = 'md', className }) {
  const src = song.thumbnail || getThumbnailUrl(song.youtubeVideoId)
  const [failed, setFailed] = useState(false)

  return (
    <div className={cx('artwork', `artwork--${size}`, className)} style={getArtworkStyle(song.id)}>
      {src && !failed ? (
        <img src={src} alt="" loading="lazy" decoding="async" onError={() => setFailed(true)} />
      ) : (
        <span className="artwork__initials" aria-hidden="true">{getInitials(song.title)}</span>
      )}
      {song.isOPM && size !== 'xs' && <FlagPH className="artwork__flag" />}
    </div>
  )
})
