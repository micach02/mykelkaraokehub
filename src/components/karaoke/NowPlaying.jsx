import { SongArtwork } from '../songs/SongArtwork'
import { cx } from '../../utils/classNames'
import { RequesterBadge } from '../common/RequesterBadge'

// size: 'sm' (player bar) | 'xl' (Karaoke Mode on a TV)
// requestedBy / nextRequestedBy: who asked for the song from a phone, if anyone.
export function NowPlaying({ song, nextSong, requestedBy = null, nextRequestedBy = null, size = 'sm', isPlaying = false }) {
  const badgeSize = size === 'xl' ? 'lg' : 'sm'
  if (!song) {
    return (
      <div className={cx('now-playing', `now-playing--${size}`, 'now-playing--empty')}>
        <span className="eyebrow">Now playing</span>
        <p className="now-playing__title">Nothing yet — pick a song!</p>
        {nextSong && <p className="now-playing__next">Up next: <strong>{nextSong.title}</strong></p>}
      </div>
    )
  }
  return (
    <div className={cx('now-playing', `now-playing--${size}`)}>
      <SongArtwork song={song} size={size === 'xl' ? 'md' : 'xs'} className="now-playing__art" />
      <div className="now-playing__text">
        <span className={cx('eyebrow', isPlaying && 'eyebrow--live')}>{isPlaying ? '● Now playing' : 'Now playing'}</span>
        <p className="now-playing__title">{song.title}</p>
        <p className="now-playing__artist">{song.artist}</p>
        <RequesterBadge requestedBy={requestedBy} size={badgeSize} className="now-playing__requester" />
        {nextSong !== undefined && (
          <p className="now-playing__next">
            {nextSong ? (
              <>
                <span className="now-playing__next-text">
                  Up next: <strong>{nextSong.title}</strong> · {nextSong.artist}
                </span>
                <RequesterBadge requestedBy={nextRequestedBy} size={badgeSize} className="now-playing__next-requester" />
              </>
            ) : (
              'Up next: nothing queued yet'
            )}
          </p>
        )}
      </div>
    </div>
  )
}
