// Timing: when did the singer start each expected note, compared with the
// reference melody? (Melody mode only — timing needs a reference.)

import { TIMING_THRESHOLDS } from '../../config/scoringConfig'
import { interpolate } from './musicMath'

// |onset deviation| (seconds) → 0…1.
export function timingScoreFromDeviation(absSeconds, config = TIMING_THRESHOLDS) {
  const s = config.scores
  return interpolate(absSeconds, [
    [0, 1],
    [config.excellent, s.excellent],
    [config.good, s.good],
    [config.fair, s.fair],
    [config.poor, 0],
  ])
}

/**
 * Finds when the singer started `note`.
 * voiceFrames: voice frames with { t, cents, prevCents, afterGap } — the
 * distance to this note's pitch and to the previous note's pitch (null if
 * none), and whether the frame follows a break in the singing.
 * previous: the note before (or null).
 * Returns the onset time in seconds, or null if no onset was found.
 *
 * Early singing is looked for in the second half of the previous note.
 * A frame only counts as the new note if it is closer to it than to the
 * previous note (half steps are just 100 cents apart).
 * A repeated pitch only has an onset where the singer re-articulates (a short
 * break); sung legato, it can't be told apart from the note before.
 */
export function findOnset(note, voiceFrames, previous, config = TIMING_THRESHOLDS) {
  let searchFrom = note.start - config.searchWindow
  if (previous) searchFrom = Math.max(searchFrom, (previous.start + previous.end) / 2)
  const repeated = previous?.midi === note.midi
  const searchTo = Math.min(note.end, note.start + config.searchWindow)
  const onPitch = voiceFrames.find(
    (f) =>
      f.t >= searchFrom &&
      f.t <= searchTo &&
      Math.abs(f.cents) <= config.onsetPitchCents &&
      (repeated ? f.afterGap : f.prevCents == null || Math.abs(f.cents) < Math.abs(f.prevCents)),
  )
  return onPitch ? onPitch.t : null
}
