// Frequency ↔ musical note helpers. A4 = 440 Hz = MIDI 69.

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']

export function frequencyToMidi(frequency) {
  return 69 + 12 * Math.log2(frequency / 440)
}

export function midiToFrequency(midi) {
  return 440 * 2 ** ((midi - 69) / 12)
}

// "C4", "A#3"… for a (possibly fractional) MIDI number.
export function midiToNoteName(midi) {
  const rounded = Math.round(midi)
  return `${NOTE_NAMES[((rounded % 12) + 12) % 12]}${Math.floor(rounded / 12) - 1}`
}

// Signed distance in cents from `targetMidi` to `sungMidi` (+ = sharp).
// With octaveTolerant, an octave up/down is treated as the same note.
export function centsOff(sungMidi, targetMidi, { octaveTolerant = false } = {}) {
  const cents = (sungMidi - targetMidi) * 100
  return octaveTolerant ? foldOctave(cents) : cents
}

// Folds cents into -600…+600 (the nearest octave of the target).
export function foldOctave(cents) {
  return ((((cents + 600) % 1200) + 1200) % 1200) - 600
}

// Signed distance in cents to the nearest equal-tempered note.
export function centsFromNearestNote(midi) {
  return (midi - Math.round(midi)) * 100
}

// Moves `midi` by whole octaves so it lands as close as possible to `target`.
// Used to draw an octave-down singer's pitch on the expected note.
export function nearestOctaveTo(midi, target) {
  return midi + 12 * Math.round((target - midi) / 12)
}

export function rmsToDb(rms) {
  return rms > 0 ? 20 * Math.log10(rms) : -Infinity
}

// Piecewise-linear lookup: points = [[x0, y0], [x1, y1], …] with x ascending.
export function interpolate(x, points) {
  if (x <= points[0][0]) return points[0][1]
  for (let i = 1; i < points.length; i += 1) {
    const [x1, y1] = points[i]
    if (x <= x1) {
      const [x0, y0] = points[i - 1]
      return y0 + ((x - x0) / (x1 - x0)) * (y1 - y0)
    }
  }
  return points[points.length - 1][1]
}

export function median(values) {
  if (!values.length) return NaN
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

export function mean(values) {
  return values.length ? values.reduce((sum, v) => sum + v, 0) / values.length : NaN
}

export function standardDeviation(values) {
  if (values.length < 2) return 0
  const m = mean(values)
  return Math.sqrt(mean(values.map((v) => (v - m) ** 2)))
}

export function percentile(values, p) {
  if (!values.length) return NaN
  const sorted = [...values].sort((a, b) => a - b)
  const index = Math.min(sorted.length - 1, Math.max(0, Math.round((p / 100) * (sorted.length - 1))))
  return sorted[index]
}

export function clamp01(value) {
  return Math.min(1, Math.max(0, value))
}
