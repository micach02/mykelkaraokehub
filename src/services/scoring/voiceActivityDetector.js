// Voice activity detection: decides whether a frame is singing, background
// noise, or silence, so silence is never scored as a wrong note.
//
//   silence → too quiet to matter (ignored)
//   noise   → loud enough, but no clear pitch (ignored)
//   voice   → a clear, singable pitch → analyzed
//
// Limitation: the karaoke track coming out of the speakers can also have a
// clear pitch. Calibrated noise floors, a high clarity threshold, and
// browser echo cancellation reduce this, but can't separate voice from music
// perfectly.

import { VOICE_ACTIVITY } from '../../config/scoringConfig'

export const FRAME_KIND = { SILENCE: 'silence', NOISE: 'noise', VOICE: 'voice' }

export function classifyFrame({ rms, frequency, clarity }, { noiseFloor = 0, config = VOICE_ACTIVITY } = {}) {
  const threshold = Math.max(config.minRms, noiseFloor * config.noiseFloorMultiplier)
  if (!(rms >= threshold)) return FRAME_KIND.SILENCE
  const pitched =
    Number.isFinite(frequency) &&
    clarity >= config.minClarity &&
    frequency >= config.minFrequency &&
    frequency <= config.maxFrequency
  return pitched ? FRAME_KIND.VOICE : FRAME_KIND.NOISE
}

// Quiet but clearly pitched — usually a voice that's too far from the mic.
export function isQuietPitchedFrame({ rms, frequency, clarity }, { config = VOICE_ACTIVITY } = {}) {
  return (
    Number.isFinite(frequency) &&
    clarity >= config.minClarity &&
    frequency >= config.minFrequency &&
    frequency <= config.maxFrequency &&
    rms > 0.0005 &&
    rms < config.minRms
  )
}
