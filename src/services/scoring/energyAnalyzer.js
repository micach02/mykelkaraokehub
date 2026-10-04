// Vocal energy: is the voice coming through at a healthy level? Loudness is
// not singing quality, so this is a small part of the score — mainly it
// catches a microphone that's too quiet or clipping.

import { ENERGY } from '../../config/scoringConfig'
import { clamp01, interpolate, median, rmsToDb } from './musicMath'

// voiceFrames: [{ rms, peak }] → { score, medianDb, clipRatio } or null.
export function analyzeEnergy(voiceFrames, config = ENERGY) {
  if (!voiceFrames.length) return null
  const medianDb = median(voiceFrames.map((f) => rmsToDb(f.rms)))
  const levelScore = medianDb > config.idealMaxDb
    ? interpolate(medianDb, [[config.idealMaxDb, 1], [0, 0.7]])
    : interpolate(medianDb, [[config.floorDb, config.minLevelScore], [config.idealMinDb, 1]])
  const clipRatio = voiceFrames.filter((f) => f.peak >= config.clipPeak).length / voiceFrames.length
  const clipPenalty = clamp01(clipRatio / config.clipRatioForHalf) * 0.5
  return { score: clamp01(levelScore * (1 - clipPenalty)), medianDb, clipRatio }
}
