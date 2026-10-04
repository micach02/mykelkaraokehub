import { useScoring } from '../../context/ScoringContext'
import { useKaraokeState } from '../../context/KaraokeContext'
import { RecordingIndicator } from './RecordingIndicator'

// Small "● Recording" pill over the video while a song is being scored, so
// everyone knows the microphone is on. The score itself comes after the song.
export function RecordingBadge() {
  const { phase } = useScoring()
  const { playbackStatus } = useKaraokeState()
  if (phase !== 'singing') return null
  return (
    <div className="recording-badge" aria-label="Scoring: recording your singing">
      <RecordingIndicator paused={playbackStatus !== 'playing'} />
    </div>
  )
}
