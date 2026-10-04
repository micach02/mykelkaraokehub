// Explains what kind of score this song can get.
export function ScoringModeNote({ melody }) {
  return melody ? (
    <p className="scoring-mode scoring-mode--melody">
      🎯 <strong>Melody score:</strong> this song has a melody guide, so we check your pitch against each expected note, your
      timing, stability, and energy.
    </p>
  ) : (
    <p className="scoring-mode">
      🎤 <strong>Voice score:</strong> this song has no melody guide, so we score how in tune and steady your notes are — not
      whether they match the original melody.
    </p>
  )
}
