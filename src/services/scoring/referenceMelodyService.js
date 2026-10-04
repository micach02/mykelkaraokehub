// Reference melodies for scoring. getReferenceMelody(songId) → the notes a
// singer is expected to sing, or null (the song is then scored in Voice mode).
//
// Today the data is bundled (data/referenceMelodies). Later this can fetch
// licensed melody data from an API without changing the scoring engine.

import { referenceMelodies } from '../../data/referenceMelodies'

const byId = new Map(referenceMelodies.map((m) => [m.songId, m]))

export function getReferenceMelody(songId) {
  const melody = byId.get(songId)
  if (!melody) return null
  const offset = melody.offsetSeconds ?? 0
  return {
    ...melody,
    notes: melody.notes.map((n) => ({ start: n.start + offset, end: n.end + offset, midi: n.midi })),
  }
}

export function hasReferenceMelody(songId) {
  return byId.has(songId)
}

export function getMelodyDuration(melody) {
  return melody?.notes.length ? melody.notes[melody.notes.length - 1].end : 0
}

// Problems in a melody's data (empty list = valid). Used by tests.
export function validateMelody(melody) {
  const problems = []
  if (!melody.songId) problems.push('missing songId')
  if (!melody.notes?.length) problems.push('no notes')
  melody.notes?.forEach((n, i) => {
    if (!(n.end > n.start)) problems.push(`note ${i}: end must be after start`)
    if (!Number.isInteger(n.midi) || n.midi < 21 || n.midi > 108) problems.push(`note ${i}: midi out of range`)
    const prev = melody.notes[i - 1]
    if (prev && n.start < prev.end) problems.push(`note ${i}: overlaps the previous note`)
  })
  return problems
}
