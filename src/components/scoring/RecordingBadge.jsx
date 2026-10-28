import { useScoring } from '../../context/ScoringContext'
import { useKaraokeState } from '../../context/KaraokeContext'
import { requesterName } from '../common/RequesterBadge'
import { RecordingIndicator } from './RecordingIndicator'

// Small "● Recording" pill over the video while a song is being scored, so
// everyone knows the microphone is on. The score itself comes after the song.
// With a phone as the mic: "● 📱 Mika's phone mic".
export function RecordingBadge() {
  const { phase, phoneMicId } = useScoring()
  const { playbackStatus, currentRequestedBy } = useKaraokeState()
  if (phase !== 'singing') return null
  const paused = playbackStatus !== 'playing'
  if (phoneMicId) {
    const name = requesterName(currentRequestedBy)
    return (
      <div className="recording-badge" aria-label={`Scoring: listening to ${name}’s phone`}>
        <RecordingIndicator paused={paused} label={`📱 ${name}’s phone mic`} />
      </div>
    )
  }
  return (
    <div className="recording-badge" aria-label="Scoring: recording your singing">
      <RecordingIndicator paused={paused} />
    </div>
  )
}
