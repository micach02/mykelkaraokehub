import { buildNotes } from './buildNotes.js'

// "Twinkle, Twinkle, Little Star" — traditional melody, public domain.
const C4 = 60, D4 = 62, E4 = 64, F4 = 65, G4 = 67, A4 = 69

const lineA = [[C4, 1], [C4, 1], [G4, 1], [G4, 1], [A4, 1], [A4, 1], [G4, 2]]
const lineB = [[F4, 1], [F4, 1], [E4, 1], [E4, 1], [D4, 1], [D4, 1], [C4, 2]]
const lineC = [[G4, 1], [G4, 1], [F4, 1], [F4, 1], [E4, 1], [E4, 1], [D4, 2]]

export const twinkle = {
  songId: 'practice-twinkle',
  title: 'Twinkle, Twinkle, Little Star',
  credit: 'Traditional melody — public domain',
  bpm: 90,
  notes: buildNotes({
    bpm: 90,
    leadInBeats: 4,
    sequence: [...lineA, ...lineB, ...lineC, ...lineC, ...lineA, ...lineB],
  }),
}
