// Phone mic → TV: what travels is the phone's own pitch analysis of the
// singer's voice (~30 small number sets per second), never audio. Shared by
// the phone, the server (validation) and the TV — keep it plain JavaScript.
//
//   batch = { latency, frames: [[ageMs, rms, peak, frequency, clarity], …] }
//
// ageMs: how long before the batch was sent the frame was heard (the TV
// places it on the song's timeline from that). frequency: Hz, or 0 when no
// pitch. latency: the phone's audio pipeline delay, in seconds.

export const MIC_BATCH_MS = 1000
export const MAX_MIC_FRAMES = 90

const round = (value, digits) => {
  const f = 10 ** digits
  return Math.round(value * f) / f
}

export function encodeMicFrame(frame, sentAt) {
  return [
    Math.max(0, Math.round(sentAt - frame.at)),
    round(frame.rms, 5),
    round(frame.peak ?? frame.rms, 5),
    frame.frequency ? round(frame.frequency, 2) : 0,
    round(frame.clarity ?? 0, 3),
  ]
}

const inRange = (value, min, max) => typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max

// A clean copy of a batch from the network, or null if it isn't one.
export function sanitizeMicBatch(batch) {
  if (!batch || typeof batch !== 'object' || !Array.isArray(batch.frames)) return null
  if (batch.frames.length === 0 || batch.frames.length > MAX_MIC_FRAMES) return null
  const frames = []
  for (const frame of batch.frames) {
    if (!Array.isArray(frame) || frame.length !== 5) return null
    const [age, rms, peak, frequency, clarity] = frame
    if (!inRange(age, 0, 10000) || !inRange(rms, 0, 1) || !inRange(peak, 0, 1) || !inRange(clarity, 0, 1)) return null
    if (!inRange(frequency, 0, 4000)) return null
    frames.push([age, rms, peak, frequency, clarity])
  }
  const latency = inRange(batch.latency, 0, 2) ? batch.latency : 0
  return { latency, frames }
}

// Back to analyzer frames (what the scoring session expects), plus `age`
// in seconds.
export function decodeMicFrames(batch, frequencyToMidi) {
  return batch.frames.map(([age, rms, peak, frequency, clarity]) => ({
    age: age / 1000,
    rms,
    peak,
    frequency: frequency || null,
    clarity,
    midi: frequency ? frequencyToMidi(frequency) : null,
  }))
}
