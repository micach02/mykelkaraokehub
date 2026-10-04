// Vocal stability: how steadily a note is held. Natural vibrato is allowed;
// wobbling around or jumping off the note is not.

import { STABILITY } from '../../config/scoringConfig'
import { clamp01, standardDeviation } from './musicMath'

/**
 * cents: pitch of each frame within one sung note, in cents.
 * Returns { score (0–1), spread (cents), jumps } or null if too short to judge.
 */
export function analyzeNoteStability(cents, config = STABILITY) {
  if (cents.length < config.minFramesPerNote) return null
  // Ignore the first and last frame (attack/release glides).
  const body = cents.length > 6 ? cents.slice(1, -1) : cents
  const spread = standardDeviation(body)
  let jumps = 0
  for (let i = 1; i < body.length; i += 1) {
    const step = Math.abs(body[i] - body[i - 1])
    // Octave errors (~1200 cents) are the detector's, not the singer's.
    const octaveError = Math.abs(step - 1200) < 80
    if (step > config.jumpCents && !octaveError) jumps += 1
  }
  const spreadScore = 1 - clamp01((spread - config.vibratoAllowanceCents) / (config.maxSpreadCents - config.vibratoAllowanceCents))
  const jumpRatio = body.length > 1 ? jumps / (body.length - 1) : 0
  return { score: clamp01(spreadScore * (1 - Math.min(0.5, jumpRatio))), spread, jumps }
}
