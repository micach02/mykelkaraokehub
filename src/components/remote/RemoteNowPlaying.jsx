import { getThumbnailUrl } from '../../services/youtubeService'
import { RequesterBadge } from '../common/RequesterBadge'

export function RemoteNowPlaying({ nowPlaying, isPlaying, next, myId, onTogglePlay, onSkip, disabled }) {
  if (!nowPlaying) {
    return (
      <section className="remote-now remote-now--empty" aria-label="Now playing">
        <span className="remote-now__eyebrow">Now playing</span>
        <p className="remote-now__title">Nothing yet — add a song!</p>
      </section>
    )
  }
  const { song, requestedBy } = nowPlaying
  const thumbnail = song.thumbnail || getThumbnailUrl(song.youtubeVideoId)
  return (
    <section className="remote-now" aria-label="Now playing">
      {thumbnail && <img className="remote-now__thumb" src={thumbnail} alt="" />}
      <div className="remote-now__text">
        <span className="remote-now__eyebrow">{isPlaying ? '● Now playing' : 'Now playing'}</span>
        <p className="remote-now__title">{song.title}</p>
        <p className="remote-now__artist">{song.artist}</p>
        <RequesterBadge requestedBy={requestedBy} myId={myId} />
        {next && (
          <p className="remote-now__next">
            <span className="remote-now__next-text">Up next: {next.song.title}</span>
            <RequesterBadge requestedBy={next.requestedBy} myId={myId} />
          </p>
        )}
      </div>
      <div className="remote-now__controls">
        <button type="button" className="remote-control remote-control--primary" onClick={onTogglePlay} disabled={disabled} aria-label={isPlaying ? 'Pause on TV' : 'Play on TV'}>
          {isPlaying ? '⏸' : '▶'}
        </button>
        <button type="button" className="remote-control" onClick={onSkip} disabled={disabled} aria-label="Skip to the next song">
          ⏭
        </button>
      </div>
    </section>
  )
}
