// One scored performance. Plain JavaScript, outside React:
//
//   analyzer frames (~30/s) → voice activity → timestamped with SONG time
//   → analysis buffer (array in memory) → scored once, when the song ends
//
// Timing reference: every frame is stamped with the karaoke player's own
// playback position (getSongTime), not with timers — so pauses, buffering,
// and seeking stay in sync with the reference melody.

import { SCORING_SESSION } from '../../config/scoringConfig'
import { calculateScore } from './scoringEngine'
import { classifyFrame } from './voiceActivityDetector'

// Smooths the player's position between its updates.
export function createSongClock(getSongTime, now = () => performance.now()) {
  let anchorSong = null
  let anchorAt = 0
  let lastRaw = null
  return {
    now() {
      const raw = getSongTime()
      const at = now()
      if (anchorSong === null || raw !== lastRaw) {
        lastRaw = raw
        anchorSong = raw
        anchorAt = at
        return raw
      }
      // Extrapolate a little, but never drift far from the player.
      return Math.min(anchorSong + (at - anchorAt) / 1000, raw + 0.5)
    },
  }
}

/**
 * analyzer:     audio analysis provider (see audioAnalysisProvider.js)
 * getSongTime:  () => current playback position in seconds
 * isPlaying:    () => boolean; frames are ignored while paused
 * referenceNotes: notes to score against, or null (voice mode)
 * noiseFloor:   from calibration
 */
export function createScoringSession({ analyzer, getSongTime, isPlaying, referenceNotes = null, noiseFloor = 0, config = SCORING_SESSION }) {
  const mode = referenceNotes?.length ? 'melody' : 'voice'
  const clock = createSongClock(getSongTime)
  const latency = (analyzer.latencySeconds ?? 0) + config.inputLatencyMs / 1000
  const frames = []
  let active = true

  const unsubscribe = analyzer.onFrame((frame) => {
    if (!active || !isPlaying()) return
    const t = clock.now() - latency
    const kind = classifyFrame(frame, { noiseFloor })
    frames.push({ t, frequency: frame.frequency, midi: frame.midi, clarity: frame.clarity, rms: frame.rms, peak: frame.peak, kind })
  })

  return {
    mode,

    // Frames so far (for the practice-track piano roll). Read-only.
    getFrames() {
      return frames
    },

    // Stops listening and returns the final score. `upTo` limits scoring to
    // the part sung before that song time.
    finish({ upTo = Infinity } = {}) {
      active = false
      unsubscribe()
      return calculateScore({ frames, referenceNotes, upTo })
    },

    discard() {
      active = false
      unsubscribe()
      frames.length = 0
    },
  }
}
