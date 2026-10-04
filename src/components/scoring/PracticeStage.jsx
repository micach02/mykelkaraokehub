import { useMemo } from 'react'
import { PianoRoll } from './PianoRoll'
import { useOptionalScoring } from '../../context/ScoringContext'
import { getReferenceMelody } from '../../services/scoring/referenceMelodyService'

// What the player shows for practice tracks: a scrolling note lane with the
// singer's pitch drawn on top while scoring.
export function PracticeStage({ song, getProgress }) {
  const scoring = useOptionalScoring()
  const melody = useMemo(() => getReferenceMelody(song.id), [song.id])
  if (!melody) return null
  const scoringNow = scoring?.phase === 'singing'
  return (
    <PianoRoll
      notes={melody.notes}
      getTime={() => getProgress().current}
      getFrames={() => scoring?.getFrames() ?? null}
      title={`🎯 ${song.title}`}
      subtitle={scoringNow
        ? 'Sing each bar as it reaches the line · guide melody muted while scoring'
        : `Practice track · ${melody.credit} · turn on 🎤 Auto-score for a Melody score`}
    />
  )
}
