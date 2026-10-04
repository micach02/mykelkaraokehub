// Microphone check before singing: is there a signal, is it loud enough,
// is it clipping? Also measures the room's noise floor for voice detection.

import { CALIBRATION, ENERGY } from '../../config/scoringConfig'
import { percentile } from './musicMath'

/**
 * frames: [{ rms, peak }] collected while the user sings/speaks.
 * Returns { status: 'good' | 'low' | 'silent' | 'clipping', noiseFloor,
 *           loudRms, message }.
 */
export function evaluateCalibration(frames, config = CALIBRATION) {
  if (!frames.length) return { status: 'silent', noiseFloor: 0, loudRms: 0, message: 'Microphone problem detected. Please check your microphone and try again.' }
  const levels = frames.map((f) => f.rms)
  const loudRms = percentile(levels, 90)
  // The check asks people to sing, so the quietest moments may still be
  // singing. Cap the floor well below the singing level (and at an absolute
  // ceiling) so the voice always clears the voice-activity threshold.
  const noiseFloor = Math.min(percentile(levels, 10), loudRms / 4, config.maxNoiseFloor)
  const clipRatio = frames.filter((f) => f.peak >= ENERGY.clipPeak).length / frames.length

  if (loudRms < config.silentRms) {
    return { status: 'silent', noiseFloor, loudRms, message: 'We can’t hear anything. Check that the right microphone is selected and not muted.' }
  }
  if (clipRatio > config.clipRatio) {
    return { status: 'clipping', noiseFloor, loudRms, message: 'Your microphone is too loud and distorting. Move back a little or lower the input volume.' }
  }
  if (loudRms < config.lowRms) {
    return { status: 'low', noiseFloor, loudRms, message: '🎤 Microphone volume is too low. Move closer to the microphone or increase input volume.' }
  }
  return { status: 'good', noiseFloor, loudRms, message: 'Microphone level: GOOD' }
}
