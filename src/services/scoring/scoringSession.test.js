import { beforeEach, describe, expect, it } from 'vitest'
import { createScoringSession, createSongClock } from './scoringSession'
import { createPitchDetector, measureLevel } from './pitchAnalyzer'
import { getReferenceMelody } from './referenceMelodyService'
import { frequencyToMidi, midiToFrequency } from './musicMath'
import { __reloadScoreHistoryForTests, getLastScore, getPersonalBest, recordPerformance } from '../scoringHistoryService'

function sine(frequency, { sampleRate = 44100, size = 2048, amplitude = 0.3, noise = 0 } = {}) {
  const samples = new Float32Array(size)
  for (let i = 0; i < size; i += 1) {
    samples[i] = amplitude * Math.sin((2 * Math.PI * frequency * i) / sampleRate) + noise * (Math.random() * 2 - 1)
  }
  return samples
}

describe('pitch detection on real audio samples', () => {
  const detector = createPitchDetector(2048)

  it('finds the fundamental of a sung-range tone with high confidence', () => {
    ;[110, 220, 261.63, 440].forEach((hz) => {
      const { frequency, clarity } = detector.detect(sine(hz), 44100)
      expect(Math.abs(frequencyToMidi(frequency) - frequencyToMidi(hz)) * 100).toBeLessThan(5) // < 5 cents
      expect(clarity).toBeGreaterThan(0.95)
    })
  })

  it('reports low confidence for noise', () => {
    const noise = Float32Array.from({ length: 2048 }, () => Math.random() * 2 - 1)
    expect(detector.detect(noise, 44100).clarity).toBeLessThan(0.88)
  })

  it('measures level and clipping', () => {
    const { rms, peak } = measureLevel(sine(220, { amplitude: 1 }))
    expect(rms).toBeCloseTo(Math.SQRT1_2, 2)
    expect(peak).toBeCloseTo(1, 2)
  })
})

// Minimal analyzer for driving a session by hand.
function fakeAnalyzer() {
  const listeners = new Set()
  return {
    latencySeconds: 0,
    onFrame(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    emit(frame) {
      listeners.forEach((l) => l({ at: 0, peak: frame.rms * 2, ...frame }))
    },
  }
}

describe('scoring session', () => {
  const melody = getReferenceMelody('practice-scale')
  let songTime
  let playing
  let analyzer

  const session = () =>
    createScoringSession({
      analyzer,
      getSongTime: () => songTime,
      isPlaying: () => playing,
      referenceNotes: melody.notes,
      config: { framesPerSecond: 30, inputLatencyMs: 0 },
    })

  // Sing `midi` from song time a to b.
  function singRange(a, b, midi) {
    for (songTime = a; songTime < b; songTime += 1 / 30) {
      analyzer.emit({ rms: 0.08, clarity: 0.97, midi, frequency: midiToFrequency(midi) })
    }
  }

  beforeEach(() => {
    songTime = 0
    playing = true
    analyzer = fakeAnalyzer()
  })

  it('stamps frames with song time and ignores frames while paused', () => {
    const s = session()
    const [first] = melody.notes
    singRange(first.start, first.end, first.midi)
    const count = s.getFrames().length
    playing = false
    singRange(first.end, first.end + 1, first.midi)
    expect(s.getFrames().length).toBe(count)
    expect(s.getFrames()[0].t).toBeCloseTo(first.start, 3)
  })

  it('scores the whole song when it ends', () => {
    const s = session()
    melody.notes.forEach((n) => singRange(n.start, n.end, n.midi))
    const result = s.finish()
    expect(result.mode).toBe('melody')
    expect(result.statistics.totalNotes).toBe(melody.notes.length)
    expect(result.totalScore).toBeGreaterThanOrEqual(95)
  })

  it('finishing early scores only the part sung', () => {
    const s = session()
    melody.notes.slice(0, 4).forEach((n) => singRange(n.start, n.end, n.midi))
    const result = s.finish({ upTo: melody.notes[3].end + 0.1 })
    expect(result.statistics.totalNotes).toBe(4)
    expect(result.totalScore).toBeGreaterThanOrEqual(95)
    // No more frames after finishing.
    singRange(melody.notes[4].start, melody.notes[4].end, melody.notes[4].midi)
    expect(s.getFrames().every((f) => f.t <= melody.notes[3].end + 0.2)).toBe(true)
  })

  it('smooths the player clock between updates', () => {
    let raw = 10
    let now = 0
    const clock = createSongClock(() => raw, () => now)
    expect(clock.now()).toBe(10)
    now = 200
    expect(clock.now()).toBeCloseTo(10.2)
    now = 2000
    expect(clock.now()).toBeCloseTo(10.5) // never drifts far from the player
    raw = 12
    expect(clock.now()).toBe(12)
  })
})

describe('score history and personal bests', () => {
  beforeEach(() => {
    window.localStorage.clear()
    __reloadScoreHistoryForTests()
  })

  it('tracks personal bests and the last score per song', () => {
    const song = { songId: 'yt-AAAAAAAAAAA', songTitle: 'Buwan', artist: 'Juan Karlos', grade: 'GREAT', mode: 'voice' }
    expect(recordPerformance({ ...song, score: 88 })).toEqual({ isPersonalBest: true, previousBest: null })
    expect(recordPerformance({ ...song, score: 94 }).isPersonalBest).toBe(true)
    const third = recordPerformance({ ...song, score: 90 })
    expect(third.isPersonalBest).toBe(false)
    expect(third.previousBest.score).toBe(94)
    expect(getPersonalBest(song.songId).score).toBe(94)
    expect(getLastScore(song.songId).score).toBe(90)
    __reloadScoreHistoryForTests() // survives a refresh
    expect(getPersonalBest(song.songId).score).toBe(94)
  })

  it('keeps only the last 20 performances, but never forgets a best', () => {
    for (let i = 0; i < 25; i += 1) recordPerformance({ songId: `song-${i}`, songTitle: 'x', artist: 'y', score: 50 + i, grade: 'GOOD', mode: 'voice' })
    __reloadScoreHistoryForTests()
    expect(getLastScore('song-0')).toBeNull()
    expect(getPersonalBest('song-0').score).toBe(50)
  })
})
