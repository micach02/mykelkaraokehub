import { buildNotes } from './buildNotes.js'

// Do-Re-Mi warm-up: the C major scale up and back down. Not copyrighted.
const C4 = 60, D4 = 62, E4 = 64, F4 = 65, G4 = 67, A4 = 69, B4 = 71, C5 = 72

export const warmupScale = {
  songId: 'practice-scale',
  title: 'Do-Re-Mi Warm-up',
  credit: 'C major scale — free to use',
  bpm: 72,
  notes: buildNotes({
    bpm: 72,
    leadInBeats: 4,
    sequence: [
      [C4, 1], [D4, 1], [E4, 1], [F4, 1], [G4, 1], [A4, 1], [B4, 1], [C5, 2],
      [B4, 1], [A4, 1], [G4, 1], [F4, 1], [E4, 1], [D4, 1], [C4, 2],
    ],
  }),
}
