// Karaoke scoring settings — every weight and threshold lives here.
// The score is an entertainment "karaoke score", not a professional
// vocal evaluation.

// Two scoring modes:
//  - melody: the song has a reference melody (expected notes + timing)
//  - voice:  no reference — measures how in tune (to the nearest note) and
//            steady the voice is; timing can't be judged without a melody
export const SCORING_WEIGHTS = {
  melody: {
    pitch: 0.5,
    timing: 0.2,
    stability: 0.15,
    energy: 0.1,
    consistency: 0.05,
  },
  voice: {
    pitch: 0.55,
    stability: 0.25,
    energy: 0.12,
    consistency: 0.08,
  },
}

// Pitch error in cents (100 cents = 1 semitone) → score multiplier.
// Linear between the points; 0 beyond `poor`.
export const PITCH_THRESHOLDS = {
  // Against the expected note (melody mode).
  melody: { perfect: 20, good: 50, acceptable: 100, poor: 300 },
  // Against the nearest note (voice mode) — the error can't exceed 50 cents.
  voice: { perfect: 10, good: 20, acceptable: 35, poor: 50 },
  // Score at each point: perfect → 1, good → 0.8, acceptable → 0.5, poor → 0.
  scores: { perfect: 1, good: 0.8, acceptable: 0.5 },
  // Singing an octave higher or lower than the reference still counts
  // (e.g. a male voice singing a melody written for a female voice).
  octaveTolerant: true,
  // A note counts as "hit" at or under this error.
  hitCents: 50,
}

// Note onset error in seconds → score. Missed notes score 0.
export const TIMING_THRESHOLDS = {
  excellent: 0.1,
  good: 0.2,
  fair: 0.4,
  poor: 1.0,
  scores: { excellent: 1, good: 0.8, fair: 0.5 },
  // How far before/after a note we look for the singer's onset.
  searchWindow: 0.6,
  // Part of a note that must be voiced to count as attempted.
  minCoverage: 0.3,
  // Onset within this many cents of the target counts as "on the note".
  onsetPitchCents: 150,
}

export const STABILITY = {
  // Natural vibrato (±30–50 cents) fits within this pitch spread.
  vibratoAllowanceCents: 35,
  // Spread at or above this scores 0.
  maxSpreadCents: 120,
  // Frame-to-frame jumps bigger than this count as wobbles (octave errors
  // from the detector are ignored).
  jumpCents: 100,
  minFramesPerNote: 4,
}

export const ENERGY = {
  // Median voice level (dBFS) inside this range scores full marks.
  idealMinDb: -32,
  idealMaxDb: -6,
  // At or below this, the level score bottoms out.
  floorDb: -50,
  minLevelScore: 0.3,
  // Samples at or above this peak count as clipping.
  clipPeak: 0.99,
  // Clipping on this share of voice frames (or more) halves the score.
  clipRatioForHalf: 0.05,
}

export const VOICE_ACTIVITY = {
  // Absolute minimum RMS for "something is there".
  minRms: 0.006,
  // During singing, sound must be this many times the calibrated noise floor.
  noiseFloorMultiplier: 2.5,
  // Pitch clarity (0–1) needed to trust a frame as a sung note.
  minClarity: 0.88,
  // Human singing range we accept (Hz).
  minFrequency: 70,
  maxFrequency: 1100,
}

export const VOICE_SEGMENTS = {
  // Voice mode: frames within this distance of the running note belong to it.
  maxJumpCents: 70,
  minNoteSeconds: 0.15,
  // Gaps shorter than this don't split a note.
  maxGapSeconds: 0.12,
}

export const SCORING_SESSION = {
  // Analysis rate (frames per second) and analysis window size.
  framesPerSecond: 30,
  frameSize: 2048,
  // Compensates for microphone + processing delay when timestamping frames.
  // Raise it for Bluetooth microphones (often 150–250 ms).
  inputLatencyMs: 40,
  countdownSeconds: 3,
  calibrationSeconds: 3,
  // A GOOD mic check moves on to the countdown by itself after this long
  // (time to read the result). Other results wait for the singer.
  calibrationAutoContinueMs: 1200,
  // Need at least this much detected singing to produce a score. Songs with
  // less (nobody sang) skip the results and go straight to the next song.
  minVoiceSeconds: 2,
  // After the results appear, the next song plays automatically after this
  // many seconds (0 = never).
  resultsAutoNextSeconds: 20,
  // Auto-score only starts if the song is at most this far in when it starts
  // playing (a song resumed halfway isn't scored from the middle).
  autoStartMaxSeconds: 5,
  // Record the singing on this device for playback/saving on the results.
  recordAudio: true,
  // Browser audio processing. Echo cancellation can reduce how much of the
  // karaoke track the microphone picks up; noise suppression and auto gain
  // tend to distort sung notes, so they are off.
  microphoneConstraints: {
    echoCancellation: true,
    noiseSuppression: false,
    autoGainControl: false,
  },
}

export const CALIBRATION = {
  // No meaningful signal at all.
  silentRms: 0.002,
  // Loudest part of the check quieter than this → "too low".
  lowRms: 0.012,
  // Share of frames clipping before we warn.
  clipRatio: 0.03,
  // Highest room-noise level we accept as the voice-detection baseline.
  maxNoiseFloor: 0.02,
}

// Encouraging grades, highest first.
export const SCORE_GRADES = [
  { min: 95, label: 'LEGENDARY', emoji: '👑', headline: 'LEGENDARY!' },
  { min: 90, label: 'EXCELLENT', emoji: '🌟', headline: 'AMAZING!' },
  { min: 80, label: 'GREAT', emoji: '🔥', headline: 'GREAT JOB!' },
  { min: 70, label: 'GOOD', emoji: '👏', headline: 'NICE SINGING!' },
  { min: 60, label: 'KEEP SINGING', emoji: '🎶', headline: 'KEEP SINGING!' },
  { min: 0, label: 'WARM UP', emoji: '🎤', headline: 'GREAT WARM-UP!' },
]

export const SCORING_HISTORY = {
  maxRecent: 20,
}
