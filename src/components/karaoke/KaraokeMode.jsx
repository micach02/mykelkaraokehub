import { useKaraokeState } from '../../context/KaraokeContext'
import { NowPlaying } from './NowPlaying'
import { PlayerControls } from './PlayerControls'
import { Button, ButtonLink } from '../common/Button'
import { RequesterBadge } from '../common/RequesterBadge'
import { RoomQrCard } from '../room/RoomQrCard'
import { exitFullscreen } from '../../utils/fullscreen'

const UP_NEXT_SHOWN = 3

// The next few songs and who's singing them, so people know when they're up.
// (Tap Queue to reorder or remove.)
function UpNext({ queue }) {
  const shown = queue.slice(0, UP_NEXT_SHOWN)
  return (
    <section className="karaoke-next" aria-label="Up next">
      <span className="eyebrow karaoke-next__heading">Up next</span>
      {shown.length > 0 ? (
        <ol className="karaoke-next__list">
          {shown.map((entry, index) => (
            <li key={entry.entryId} className="karaoke-next__item">
              <span className="karaoke-next__index" aria-hidden="true">{index + 1}</span>
              <span className="karaoke-next__title">{entry.song.title}</span>
              <RequesterBadge requestedBy={entry.requestedBy} className="karaoke-next__requester" />
            </li>
          ))}
          {queue.length > UP_NEXT_SHOWN && (
            <li className="karaoke-next__more">+{queue.length - UP_NEXT_SHOWN} more</li>
          )}
        </ol>
      ) : (
        <p className="karaoke-next__empty">Nothing queued yet. Scan the QR code to add songs.</p>
      )}
    </section>
  )
}

// TV-friendly control deck under the maximized player:
//   now playing │ playback controls │ QR code
//   up next     │                   │ Add Songs · Queue · Exit
export function KaraokeMode({ onOpenQueue, onOpenPicker, fullscreenTarget }) {
  const { currentSong, currentRequestedBy, queue, isPlaying } = useKaraokeState()

  return (
    <div className="karaoke-mode">
      <NowPlaying song={currentSong} requestedBy={currentRequestedBy} isPlaying={isPlaying} size="xl" />
      <PlayerControls size="xl" fullscreenTarget={fullscreenTarget} />
      <div className="karaoke-mode__room">
        <RoomQrCard />
      </div>
      <UpNext queue={queue} />
      <div className="karaoke-mode__actions">
        <Button variant="primary" size="lg" icon="➕" onClick={onOpenPicker}>Add Songs</Button>
        <Button size="lg" icon="📋" onClick={onOpenQueue} aria-label={`Open queue, ${queue.length} songs waiting`}>
          Queue <span className="count-badge">{queue.length}</span>
        </Button>
        <ButtonLink to="/" variant="ghost" size="lg" icon="✕" onClick={() => exitFullscreen()}>Exit</ButtonLink>
      </div>
      <p className="karaoke-mode__shortcuts" aria-hidden="true">
        <kbd>Space</kbd> play/pause · <kbd>N</kbd> next · <kbd>F</kbd> fullscreen · <kbd>Q</kbd> queue · <kbd>A</kbd> add songs · <kbd>Esc</kbd> exit
      </p>
    </div>
  )
}
