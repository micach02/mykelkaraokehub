import { describe, expect, it } from 'vitest'
import { calculateScore, getGrade } from './scoringEngine'
import { getReferenceMelody, validateMelody } from './referenceMelodyService'
import { referenceMelodies } from '../../data/referenceMelodies'
import { centsOff, foldOctave, frequencyToMidi, midiToNoteName } from './musicMath'
import { classifyFrame, FRAME_KIND } from './voiceActivityDetector'

const FPS = 30
const melody = getReferenceMelody('practice-twinkle')

// Deterministic pseudo-random jitter.
function rng(seed) {
  let s = seed
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296
    return s / 4294967296 - 0.5
  }
}

/**
 * Synthetic performance of a melody, as analysis frames.
 * centsError: how far off every note is; lateBy: onset delay in seconds;
 * jitter: random per-frame wobble in cents; octave: sing octaves away;
 * breath: stop this many seconds before each note ends (re-articulation).
 */
function perform(notes, { centsError = 0, lateBy = 0, jitter = 4, octave = 0, rms = 0.08, clarity = 0.95, singRatio = 1, seed = 7, kind = FRAME_KIND.VOICE, breath = 0 } = {}) {
  const rand = rng(seed)
  const frames = []
  const end = notes[notes.length - 1].end + 1
  for (let t = 0; t <= end; t += 1 / FPS) {
    const note = notes.find((n) => t >= n.start + lateBy && t < n.end + lateBy)
    const singing = note && notes.indexOf(note) < notes.length * singRatio && t < note.end + lateBy - breath
    if (singing) {
      const midi = note.midi + octave * 12 + (centsError + rand() * jitter * 2) / 100
      frames.push({ t, midi, frequency: 440 * 2 ** ((midi - 69) / 12), clarity, rms, peak: rms * 3, kind })
    } else {
      frames.push({ t, midi: null, frequency: null, clarity: 0.2, rms: 0.001, peak: 0.003, kind: FRAME_KIND.SILENCE })
    }
  }
  return frames
}

describe('music math', () => {
  it('converts frequencies to notes and cents', () => {
    expect(frequencyToMidi(440)).toBe(69)
    expect(midiToNoteName(60)).toBe('C4')
    expect(midiToNoteName(frequencyToMidi(261.63))).toBe('C4')
    // 438 Hz vs 440 Hz ≈ -7.9 cents
    expect(centsOff(frequencyToMidi(438), 69)).toBeCloseTo(-7.89, 1)
    expect(foldOctave(1210)).toBeCloseTo(10)
    expect(centsOff(57, 69, { octaveTolerant: true })).toBeCloseTo(0)
  })
})

describe('voice activity detection', () => {
  it('separates silence, noise, and singing', () => {
    expect(classifyFrame({ rms: 0.001, frequency: 220, clarity: 0.99 })).toBe('silence')
    expect(classifyFrame({ rms: 0.1, frequency: 220, clarity: 0.5 })).toBe('noise')
    expect(classifyFrame({ rms: 0.1, frequency: 30, clarity: 0.99 })).toBe('noise')
    expect(classifyFrame({ rms: 0.1, frequency: 220, clarity: 0.95 })).toBe('voice')
    // A loud room raises the bar.
    expect(classifyFrame({ rms: 0.02, frequency: 220, clarity: 0.95 }, { noiseFloor: 0.01 })).toBe('silence')
  })
})

describe('reference melodies', () => {
  it('bundled melodies are valid', () => {
    referenceMelodies.forEach((m) => expect(validateMelody(m), m.songId).toEqual([]))
    expect(getReferenceMelody('yt-unknown')).toBeNull()
  })
})

describe('melody scoring', () => {
  it('a perfect performance scores close to 100', () => {
    const result = calculateScore({ frames: perform(melody.notes), referenceNotes: melody.notes })
    expect(result.mode).toBe('melody')
    expect(result.totalScore).toBeGreaterThanOrEqual(97)
    expect(result.pitch).toBeGreaterThanOrEqual(98)
    expect(result.timing).toBeGreaterThanOrEqual(97)
    expect(result.statistics.notesHit).toBe(melody.notes.length)
    expect(result.statistics.longestStreak).toBe(melody.notes.length)
    expect(result.grade).toBe('LEGENDARY')
  })

  it('a slightly inaccurate performance scores in the 80s', () => {
    const result = calculateScore({ frames: perform(melody.notes, { centsError: 45, lateBy: 0.18 }), referenceNotes: melody.notes })
    expect(result.totalScore).toBeGreaterThanOrEqual(80)
    expect(result.totalScore).toBeLessThanOrEqual(90)
    expect(result.statistics.averageTimingDeviation).toBeCloseTo(0.18, 1)
    expect(result.statistics.timingTendency).toBeGreaterThan(0) // late
  })

  it('times repeated notes only when the singer re-articulates them', () => {
    // Twinkle starts C C G G: sung legato, the second C has no audible onset.
    const legato = calculateScore({ frames: perform(melody.notes, { lateBy: 0.3 }), referenceNotes: melody.notes })
    const [, secondC, firstG] = legato.notes
    expect(secondC.onsetDeviation).toBeNull()
    expect(secondC.timingScore).toBeNull()
    expect(firstG.onsetDeviation).toBeCloseTo(0.3, 1) // pitch change → timed

    // With a short breath before each note, every onset is measured.
    const detached = calculateScore({ frames: perform(melody.notes, { lateBy: 0.3, breath: 0.15 }), referenceNotes: melody.notes })
    expect(detached.notes.every((n) => n.onsetDeviation != null)).toBe(true)
    expect(detached.statistics.averageTimingDeviation).toBeCloseTo(0.3, 1)
  })

  it('poor pitch lowers the pitch score', () => {
    const result = calculateScore({ frames: perform(melody.notes, { centsError: 300 }), referenceNotes: melody.notes })
    expect(result.pitch).toBeLessThan(20)
    expect(result.statistics.notesHit).toBe(0)
  })

  it('singing an octave lower still counts', () => {
    const result = calculateScore({ frames: perform(melody.notes, { octave: -1 }), referenceNotes: melody.notes })
    expect(result.pitch).toBeGreaterThanOrEqual(98)
  })

  it('silence is not scored as wrong notes', () => {
    const silent = perform(melody.notes, { singRatio: 0 })
    const result = calculateScore({ frames: silent, referenceNotes: melody.notes })
    expect(result.insufficient).toBe(true)
    expect(result.totalScore).toBeNull()
    expect(result.statistics.notesAttempted).toBe(0)
  })

  it('skipped sections count as missed notes, not wrong pitch', () => {
    const result = calculateScore({ frames: perform(melody.notes, { singRatio: 0.5 }), referenceNotes: melody.notes })
    expect(result.pitch).toBeGreaterThanOrEqual(98) // what was sung was in tune
    expect(result.timing).toBeLessThan(60) // half the notes were missed
    expect(result.statistics.missedNotes).toBeGreaterThan(15)
  })

  it('ignores unreliable (noisy, low-confidence) frames', () => {
    const noisy = perform(melody.notes, { centsError: 400, kind: FRAME_KIND.NOISE })
    const result = calculateScore({ frames: noisy, referenceNotes: melody.notes })
    expect(result.insufficient).toBe(true)
  })

  it('scores only the part sung before finishing early', () => {
    const frames = perform(melody.notes)
    const upTo = melody.notes[13].end + 0.05
    const result = calculateScore({ frames, referenceNotes: melody.notes, upTo })
    expect(result.statistics.totalNotes).toBe(14)
    expect(result.totalScore).toBeGreaterThanOrEqual(97)
  })

  it('wobbly notes lower stability, natural vibrato does not', () => {
    const vibrato = calculateScore({ frames: perform(melody.notes, { jitter: 25 }), referenceNotes: melody.notes })
    const wobbly = calculateScore({ frames: perform(melody.notes, { jitter: 160 }), referenceNotes: melody.notes })
    expect(vibrato.stability).toBeGreaterThanOrEqual(90)
    expect(wobbly.stability).toBeLessThan(vibrato.stability - 30)
  })

  it('quiet and clipping microphones lower energy', () => {
    const quiet = calculateScore({ frames: perform(melody.notes, { rms: 0.004 }), referenceNotes: melody.notes })
    const clipping = calculateScore({ frames: perform(melody.notes, { rms: 0.4 }), referenceNotes: melody.notes })
    const healthy = calculateScore({ frames: perform(melody.notes), referenceNotes: melody.notes })
    expect(healthy.energy).toBe(100)
    expect(quiet.energy).toBeLessThan(50)
    expect(clipping.energy).toBeLessThan(healthy.energy)
  })
})

describe('voice scoring (no reference melody)', () => {
  it('in-tune, steady singing scores high and timing is not invented', () => {
    const result = calculateScore({ frames: perform(melody.notes) })
    expect(result.mode).toBe('voice')
    expect(result.timing).toBeNull()
    expect(result.statistics.averageTimingDeviation).toBeNull()
    expect(result.totalScore).toBeGreaterThanOrEqual(95)
    // Repeated same-pitch notes sung legato merge into one sung note.
    expect(result.statistics.notesAttempted).toBeGreaterThan(20)
  })

  it('singing between notes lowers the score', () => {
    const result = calculateScore({ frames: perform(melody.notes, { centsError: 40 }) })
    expect(result.pitch).toBeLessThan(50)
  })

  it('reports vocal range only when there is enough singing', () => {
    const result = calculateScore({ frames: perform(melody.notes) })
    expect(result.statistics.lowestNote).toBe('C4')
    expect(result.statistics.highestNote).toBe('A4')
  })
})

describe('grades', () => {
  it('maps scores to encouraging grades', () => {
    expect(getGrade(97).label).toBe('LEGENDARY')
    expect(getGrade(92).label).toBe('EXCELLENT')
    expect(getGrade(85).label).toBe('GREAT')
    expect(getGrade(72).label).toBe('GOOD')
    expect(getGrade(61).label).toBe('KEEP SINGING')
    expect(getGrade(10).label).toBe('WARM UP')
  })
})

describe('microphone check', () => {
  it('keeps the noise floor below the singing level, even for continuous singing', async () => {
    const { evaluateCalibration } = await import('./microphoneCalibration')
    const { classifyFrame } = await import('./voiceActivityDetector')
    const singing = Array.from({ length: 90 }, () => ({ rms: 0.08, peak: 0.2 }))
    const result = evaluateCalibration(singing)
    expect(result.status).toBe('good')
    expect(classifyFrame({ rms: 0.08, frequency: 220, clarity: 0.95 }, { noiseFloor: result.noiseFloor })).toBe('voice')
    expect(evaluateCalibration(singing.map(() => ({ rms: 0.0005, peak: 0.001 }))).status).toBe('silent')
    expect(evaluateCalibration(singing.map(() => ({ rms: 0.006, peak: 0.02 }))).status).toBe('low')
    expect(evaluateCalibration(singing.map(() => ({ rms: 0.5, peak: 1 }))).status).toBe('clipping')
  })
})
