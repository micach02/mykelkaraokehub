// Turns analysis frames into per-note results.
//
// Melody mode: each reference note is judged on the frames sung during it.
// Voice mode:  sung notes are found by grouping steady frames, then judged
//              against the nearest musical note.
//
// Frames: { t (song seconds), midi, frequency, clarity, rms, peak, kind }.

import { PITCH_THRESHOLDS, TIMING_THRESHOLDS, VOICE_SEGMENTS } from '../../config/scoringConfig'
import { FRAME_KIND } from './voiceActivityDetector'
import { frameCents, pitchScoreFromCents } from './pitchAnalyzer'
import { findOnset, timingScoreFromDeviation } from './timingAnalyzer'
import { analyzeNoteStability } from './stabilityAnalyzer'
import { clamp01, median } from './musicMath'

export function voiceFramesOf(frames) {
  return frames.filter((f) => f.kind === FRAME_KIND.VOICE && Number.isFinite(f.midi))
}

// Typical spacing between frames (pauses don't distort the median).
export function frameIntervalOf(frames, fallback = 1 / 30) {
  if (frames.length < 2) return fallback
  const gaps = []
  for (let i = 1; i < frames.length; i += 1) {
    const gap = frames[i].t - frames[i - 1].t
    if (gap > 0) gaps.push(gap)
  }
  const value = median(gaps)
  return Number.isFinite(value) && value > 0 ? Math.min(value, 0.2) : fallback
}

// Index of the first frame with t >= time (frames sorted by t).
function lowerBound(frames, time) {
  let lo = 0
  let hi = frames.length
  while (lo < hi) {
    const mid = (lo + hi) >> 1
    if (frames[mid].t < time) lo = mid + 1
    else hi = mid
  }
  return lo
}

// Frames in [from, to], each with `afterGap`: true when the singing broke off
// just before it (a re-articulated note).
function framesBetween(frames, from, to, interval) {
  const out = []
  for (let i = lowerBound(frames, from); i < frames.length && frames[i].t <= to; i += 1) {
    out.push({ frame: frames[i], afterGap: i === 0 || frames[i].t - frames[i - 1].t > interval * 2.5 })
  }
  return out
}

/**
 * Melody mode. Returns one result per reference note that has finished by
 * `upTo` (song seconds):
 * { note, attempted, coverage, absCents, signedCents, pitchScore, hit,
 *   perfect, onsetDeviation, timingScore, stability }
 */
export function evaluateReferenceNotes(frames, notes, { upTo = Infinity, frameInterval } = {}) {
  const voice = voiceFramesOf(frames)
  const interval = frameInterval ?? frameIntervalOf(frames)
  const results = []
  let previous = null
  let lastOnset = null

  for (const note of notes) {
    if (note.end > upTo) break
    const duration = note.end - note.start
    const searchFrom = note.start - TIMING_THRESHOLDS.searchWindow
    const nearby = framesBetween(voice, searchFrom, note.end, interval).map(({ frame: f, afterGap }) => ({
      t: f.t,
      cents: frameCents(f, note.midi),
      prevCents: previous && previous.midi !== note.midi ? frameCents(f, previous.midi) : null,
      afterGap,
    }))
    const inNote = nearby.filter((f) => f.t >= note.start)
    const coverage = clamp01((inNote.length * interval) / duration)
    const attempted = coverage >= TIMING_THRESHOLDS.minCoverage

    if (!attempted) {
      results.push({ note, attempted: false, coverage, pitchScore: null, timingScore: 0, onsetDeviation: null, hit: false, perfect: false, stability: null })
    } else {
      const cents = inNote.map((f) => f.cents)
      const absCents = median(cents.map(Math.abs))
      // Onset on the expected pitch; otherwise the first sound in the note.
      // A repeated note sung legato has no onset: its timing isn't judged.
      const repeated = previous?.midi === note.midi
      // An onset belongs to one note only.
      const unclaimed = lastOnset == null ? nearby : nearby.filter((f) => f.t > lastOnset)
      const onset = findOnset(note, unclaimed, previous) ?? (repeated ? null : inNote[0].t)
      if (onset != null) lastOnset = onset
      const onsetDeviation = onset == null ? null : onset - note.start
      results.push({
        note,
        attempted: true,
        coverage,
        absCents,
        signedCents: median(cents),
        pitchScore: pitchScoreFromCents(absCents, 'melody'),
        hit: absCents <= PITCH_THRESHOLDS.hitCents,
        perfect: absCents <= PITCH_THRESHOLDS.melody.perfect,
        onsetDeviation,
        timingScore: onsetDeviation == null ? null : timingScoreFromDeviation(Math.abs(onsetDeviation)),
        stability: analyzeNoteStability(cents),
      })
    }
    previous = note
  }
  return results
}

/**
 * Voice mode: groups steady voice frames into sung notes.
 * Returns [{ start, end, targetMidi, cents[], absCents, signedCents,
 *            pitchScore, hit, perfect, stability }]
 */
export function segmentSungNotes(frames, { upTo = Infinity, frameInterval, config = VOICE_SEGMENTS } = {}) {
  const voice = voiceFramesOf(frames).filter((f) => f.t <= upTo)
  const interval = frameInterval ?? frameIntervalOf(frames)
  const segments = []
  let current = null

  const close = () => {
    if (!current) return
    const duration = current.frames[current.frames.length - 1].t - current.frames[0].t + interval
    if (duration >= config.minNoteSeconds) segments.push(current.frames)
    current = null
  }

  for (const frame of voice) {
    const anchor = current && median(current.frames.slice(-5).map((f) => f.midi))
    const continues =
      current &&
      frame.t - current.frames[current.frames.length - 1].t <= config.maxGapSeconds &&
      Math.abs(frame.midi - anchor) * 100 <= config.maxJumpCents
    if (!continues) {
      close()
      current = { frames: [] }
    }
    current.frames.push(frame)
  }
  close()

  return segments.map((segmentFrames) => {
    const targetMidi = Math.round(median(segmentFrames.map((f) => f.midi)))
    const cents = segmentFrames.map((f) => (f.midi - targetMidi) * 100)
    const absCents = Math.abs(median(cents))
    return {
      start: segmentFrames[0].t,
      end: segmentFrames[segmentFrames.length - 1].t + interval,
      targetMidi,
      cents,
      absCents,
      signedCents: median(cents),
      pitchScore: pitchScoreFromCents(absCents, 'voice'),
      hit: absCents <= PITCH_THRESHOLDS.voice.good,
      perfect: absCents <= PITCH_THRESHOLDS.voice.perfect,
      stability: analyzeNoteStability(cents),
    }
  })
}
