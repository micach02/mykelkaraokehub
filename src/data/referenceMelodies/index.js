// Reference melodies: the expected notes a singer is scored against.
//
// Shape:
// {
//   songId: string,          the song's id (YouTube songs: 'yt-<videoId>')
//   title, credit,           where the melody comes from (must be licensed
//                            or public domain — no copyrighted transcriptions)
//   offsetSeconds?: number,  shifts all notes to line up with a specific video
//   notes: [{ start, end, midi }]   seconds; MIDI note numbers (60 = C4)
// }
//
// To add a song: create a file with properly licensed note data, import it
// here, and add it to the list. Songs without a melody still get a Voice score.

import { warmupScale } from './warmupScale.js'
import { twinkle } from './twinkle.js'

export const referenceMelodies = [warmupScale, twinkle]
