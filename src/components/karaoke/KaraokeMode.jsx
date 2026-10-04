import { useKaraokeState } from '../../context/KaraokeContext'
import { NowPlaying } from './NowPlaying'
import { PlayerControls } from './PlayerControls'
import { Button, ButtonLink } from '../common/Button'
import { RoomQrCard } from '../room/RoomQrCard'
import { exitFullscreen } from '../../utils/fullscreen'

// TV-friendly control deck shown under the maximized player.
export function KaraokeMode({ onOpenQueue, onOpenPicker, fullscreenTarget }) {
  const { currentSong, currentRequestedBy, queue, isPlaying } = useKaraokeState()
  const nextSong = queue[0]?.song ?? null

  return (
    <div className="karaoke-mode">
      <NowPlaying
        song={currentSong}
        requestedBy={currentRequestedBy}
        nextSong={nextSong}
        nextRequestedBy={queue[0]?.requestedBy ?? null}
        isPlaying={isPlaying}
        size="xl"
      />
      <PlayerControls size="xl" fullscreenTarget={fullscreenTarget} />
      <div className="karaoke-mode__room">
        <RoomQrCard />
      </div>
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
