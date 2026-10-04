// Builds timed notes from a beat-based sequence, so melodies can be written
// the way musicians read them. [[midi, beats], …] → [{ start, end, midi }].
// A short gap before each next note lets repeated notes be re-sung.
export function buildNotes({ bpm, leadInBeats = 0, sequence, gapBeats = 0.08 }) {
  const beat = 60 / bpm
  let time = leadInBeats * beat
  return sequence.map(([midi, beats]) => {
    const start = time
    time += beats * beat
    return { start: round(start), end: round(time - gapBeats * beat), midi }
  })
}

function round(value) {
  return Math.round(value * 1000) / 1000
}
