// Pitch detection (fundamental frequency, F0) and the pitch-accuracy score.
//
// Detection uses `pitchy` (McLeod Pitch Method): fast, browser-friendly, and
// returns a clarity value (0–1) that we use as the confidence of each frame.

import { PitchDetector } from 'pitchy'
import { PITCH_THRESHOLDS } from '../../config/scoringConfig'
import { centsFromNearestNote, centsOff, interpolate } from './musicMath'

export function createPitchDetector(frameSize) {
  const detector = PitchDetector.forFloat32Array(frameSize)
  // Ignore the very quiet tail of the signal when looking for periodicity.
  detector.minVolumeDecibels = -60
  return {
    // → { frequency, clarity }; frequency is null when no pitch is found.
    detect(samples, sampleRate) {
      const [frequency, clarity] = detector.findPitch(samples, sampleRate)
      return { frequency: frequency > 0 && Number.isFinite(frequency) ? frequency : null, clarity: clarity || 0 }
    },
  }
}

// RMS and peak level of a block of samples.
export function measureLevel(samples) {
  let sum = 0
  let peak = 0
  for (let i = 0; i < samples.length; i += 1) {
    const v = samples[i]
    sum += v * v
    const a = v < 0 ? -v : v
    if (a > peak) peak = a
  }
  return { rms: Math.sqrt(sum / samples.length), peak }
}

// Absolute pitch error (cents) → 0…1, using the mode's thresholds.
export function pitchScoreFromCents(absCents, mode = 'melody', config = PITCH_THRESHOLDS) {
  const t = config[mode]
  const s = config.scores
  return interpolate(absCents, [
    [0, 1],
    [t.perfect, s.perfect],
    [t.good, s.good],
    [t.acceptable, s.acceptable],
    [t.poor, 0],
  ])
}

// Per-frame signed cents: against the expected note (melody) or the nearest
// note (voice).
export function frameCents(frame, targetMidi, config = PITCH_THRESHOLDS) {
  if (targetMidi == null) return centsFromNearestNote(frame.midi)
  return centsOff(frame.midi, targetMidi, { octaveTolerant: config.octaveTolerant })
}
