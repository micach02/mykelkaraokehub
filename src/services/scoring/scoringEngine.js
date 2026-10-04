// Scoring engine: combines the analyzers into a 0–100 karaoke score.
// Pure functions — no audio, no React — so it can be tested on its own.
//
//   calculateScore({ frames, referenceNotes, upTo })
//
// With reference notes → melody mode (pitch vs expected notes, timing, …).
// Without → voice mode (in-tune-ness vs nearest note, stability, …); timing
// is reported as null because it can't be judged without a melody.

import { SCORE_GRADES, SCORING_SESSION, SCORING_WEIGHTS } from '../../config/scoringConfig'
import { evaluateReferenceNotes, frameIntervalOf, segmentSungNotes, voiceFramesOf } from './noteMatcher'
import { analyzeEnergy } from './energyAnalyzer'
import { clamp01, mean, midiToNoteName, percentile, standardDeviation } from './musicMath'

export function getGrade(score, grades = SCORE_GRADES) {
  return grades.find((g) => score >= g.min) ?? grades[grades.length - 1]
}

function weightedMean(items, value, weight) {
  let total = 0
  let weights = 0
  items.forEach((item) => {
    const w = weight(item)
    total += value(item) * w
    weights += w
  })
  return weights > 0 ? total / weights : null
}

// How even the singing was across the song: pitch scores in four
// chronological chunks should be similar. Needs 4+ notes.
function consistencyOf(noteScores) {
  if (noteScores.length < 4) return null
  const chunkSize = Math.ceil(noteScores.length / 4)
  const chunks = []
  for (let i = 0; i < noteScores.length; i += chunkSize) chunks.push(mean(noteScores.slice(i, i + chunkSize)))
  return clamp01(1 - standardDeviation(chunks) / 0.25)
}

function longestStreak(flags) {
  let best = 0
  let run = 0
  flags.forEach((hit) => {
    run = hit ? run + 1 : 0
    best = Math.max(best, run)
  })
  return best
}

const round = (value, digits = 0) => (value == null || !Number.isFinite(value) ? null : Number(value.toFixed(digits)))
const percent = (value) => (value == null ? null : Math.round(value * 100))

// Weighted total over the components that could be measured.
function combine(components, weights) {
  let total = 0
  let used = 0
  Object.entries(weights).forEach(([key, weight]) => {
    if (components[key] == null) return
    total += components[key] * weight
    used += weight
  })
  return used > 0 ? (total / used) * 100 : 0
}

export function calculateScore({ frames, referenceNotes = null, upTo = Infinity }) {
  const mode = referenceNotes?.length ? 'melody' : 'voice'
  const scoped = frames.filter((f) => f.t <= upTo)
  const interval = frameIntervalOf(scoped)
  const voice = voiceFramesOf(scoped)
  const voiceSeconds = voice.length * interval

  const notes = mode === 'melody'
    ? evaluateReferenceNotes(scoped, referenceNotes, { upTo, frameInterval: interval })
    : segmentSungNotes(scoped, { upTo, frameInterval: interval })
  const sung = mode === 'melody' ? notes.filter((n) => n.attempted) : notes
  const durationOf = (n) => (mode === 'melody' ? n.note.end - n.note.start : n.end - n.start)

  const pitch = weightedMean(sung, (n) => n.pitchScore, durationOf)
  // Missed notes count as 0; legato repeated notes (no onset) are skipped.
  const timing = mode === 'melody' ? weightedMean(notes.filter((n) => n.timingScore != null), (n) => n.timingScore, durationOf) : null
  const stabilityNotes = sung.filter((n) => n.stability)
  const stability = stabilityNotes.length ? mean(stabilityNotes.map((n) => n.stability.score)) : null
  const energyInfo = analyzeEnergy(voice)
  const energy = energyInfo?.score ?? null
  const consistency = consistencyOf(sung.map((n) => n.pitchScore))

  const components = { pitch, timing, stability, energy, consistency }
  const totalScore = Math.round(combine(components, SCORING_WEIGHTS[mode]))
  const insufficient = voiceSeconds < SCORING_SESSION.minVoiceSeconds || sung.length === 0

  // Vocal range only when there's enough singing to trust it.
  const midis = voice.map((f) => f.midi)
  const range = midis.length >= 45
    ? { lowestNote: midiToNoteName(percentile(midis, 5)), highestNote: midiToNoteName(percentile(midis, 95)) }
    : { lowestNote: null, highestNote: null }

  const timed = mode === 'melody' ? sung.filter((n) => n.onsetDeviation != null) : []
  const grade = getGrade(totalScore)

  return {
    mode,
    insufficient,
    totalScore: insufficient ? null : totalScore,
    pitch: percent(pitch),
    timing: percent(timing),
    stability: percent(stability),
    energy: percent(energy),
    consistency: percent(consistency),
    grade: insufficient ? null : grade.label,
    gradeInfo: insufficient ? null : grade,
    statistics: {
      totalNotes: mode === 'melody' ? notes.length : null,
      notesAttempted: sung.length,
      notesHit: sung.filter((n) => n.hit).length,
      perfectNotes: sung.filter((n) => n.perfect).length,
      missedNotes: mode === 'melody' ? notes.length - sung.length : null,
      longestStreak: longestStreak(mode === 'melody' ? notes.map((n) => n.hit) : sung.map((n) => n.hit)),
      averagePitchDeviation: round(mean(sung.map((n) => n.absCents)), 1),
      averageTimingDeviation: timed.length ? round(mean(timed.map((n) => Math.abs(n.onsetDeviation))), 2) : null,
      timingTendency: timed.length ? round(mean(timed.map((n) => n.onsetDeviation)), 2) : null,
      voiceSeconds: round(voiceSeconds, 1),
      medianLevelDb: round(energyInfo?.medianDb, 1),
      clipRatio: round(energyInfo?.clipRatio, 3),
      ...range,
    },
    notes,
  }
}
