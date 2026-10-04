// Audio analysis providers. The scoring session only needs this interface,
// so a cloud or ML-based analyzer could replace the local one later:
//
//   open()              ask for the microphone and start analyzing
//   onFrame(listener)   ~30×/s: { at, rms, peak, frequency, clarity, midi }
//   latencySeconds      processing delay to subtract from timestamps
//   startRecording() / pauseRecording() / resumeRecording()
//   stopRecording()     → Promise<Blob | null>   (stays on this device)
//   close()             release the microphone
//
// LocalAudioAnalyzer runs entirely in the browser:
//   Microphone → AudioContext → AnalyserNode → pitch detector (pitchy)
// The singing is also recorded (MediaRecorder) for playback on the results
// screen. Nothing is uploaded. The analyzer is never connected to the speakers,
// so there is no feedback loop. The per-frame work (~0.5 ms) runs on a
// timer outside React; the score is calculated once, when the song ends.

import { createPitchDetector, measureLevel } from './pitchAnalyzer'
import { frequencyToMidi } from './musicMath'
import { SCORING_SESSION } from '../../config/scoringConfig'

export class MicrophoneError extends Error {
  constructor(code, message) {
    super(message)
    this.name = 'MicrophoneError'
    this.code = code
  }
}

const MESSAGES = {
  insecure: 'Karaoke scoring needs a secure page. Open myKel Karaoke at http://localhost on the computer, or use HTTPS.',
  unsupported: 'Your browser does not support karaoke scoring. Please use a modern version of Chrome, Edge, Firefox, or Safari.',
  denied: 'Microphone access was blocked. Allow the microphone for this site (click the 🔒 icon in the address bar), then try again.',
  'not-found': 'No microphone was found. Plug one in or check your sound settings, then try again.',
  busy: 'The microphone is being used by another app. Close it and try again.',
  unknown: 'Microphone problem detected. Please check your microphone and try again.',
}

function AudioContextClass() {
  return typeof window !== 'undefined' ? window.AudioContext || window.webkitAudioContext : undefined
}

// { supported, reason?, message? }
export function getScoringSupport() {
  if (typeof window === 'undefined') return { supported: false, reason: 'unsupported', message: MESSAGES.unsupported }
  if (!navigator.mediaDevices?.getUserMedia || !AudioContextClass()) {
    // Browsers hide getUserMedia on insecure (plain http, non-localhost) pages.
    if (window.isSecureContext === false) return { supported: false, reason: 'insecure', message: MESSAGES.insecure }
    return { supported: false, reason: 'unsupported', message: MESSAGES.unsupported }
  }
  return { supported: true }
}

// 'granted' | 'denied' | 'prompt' | 'unknown' (Permissions API isn't everywhere).
export async function getMicrophonePermissionState() {
  try {
    const status = await navigator.permissions?.query({ name: 'microphone' })
    return status?.state ?? 'unknown'
  } catch {
    return 'unknown'
  }
}

function toMicrophoneError(error) {
  switch (error?.name) {
    case 'NotAllowedError':
    case 'SecurityError':
      return new MicrophoneError('denied', MESSAGES.denied)
    case 'NotFoundError':
    case 'OverconstrainedError':
      return new MicrophoneError('not-found', MESSAGES['not-found'])
    case 'NotReadableError':
    case 'AbortError':
      return new MicrophoneError('busy', MESSAGES.busy)
    default:
      return new MicrophoneError('unknown', MESSAGES.unknown)
  }
}

export function createLocalAudioAnalyzer({
  constraints = SCORING_SESSION.microphoneConstraints,
  frameSize = SCORING_SESSION.frameSize,
  framesPerSecond = SCORING_SESSION.framesPerSecond,
} = {}) {
  let stream = null
  let context = null
  let analyser = null
  let timer = null
  let samples = null
  let detector = null
  let recorder = null
  let chunks = []
  const listeners = new Set()

  function tick() {
    analyser.getFloatTimeDomainData(samples)
    const { rms, peak } = measureLevel(samples)
    // Skip pitch detection on near-silence to save work.
    const { frequency, clarity } = rms > 0.0015 ? detector.detect(samples, context.sampleRate) : { frequency: null, clarity: 0 }
    const frame = { at: performance.now(), rms, peak, frequency, clarity, midi: frequency ? frequencyToMidi(frequency) : null }
    listeners.forEach((listener) => listener(frame))
  }

  return {
    kind: 'local',

    async open() {
      const support = getScoringSupport()
      if (!support.supported) throw new MicrophoneError(support.reason, support.message)
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: { ...constraints }, video: false })
      } catch (error) {
        throw toMicrophoneError(error)
      }
      const Context = AudioContextClass()
      context = new Context()
      await context.resume?.()
      const source = context.createMediaStreamSource(stream)
      analyser = context.createAnalyser()
      analyser.fftSize = frameSize
      analyser.smoothingTimeConstant = 0
      source.connect(analyser) // not connected to the speakers
      samples = new Float32Array(analyser.fftSize)
      detector = createPitchDetector(analyser.fftSize)
      timer = window.setInterval(tick, 1000 / framesPerSecond)
    },

    onFrame(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },

    // Half the analysis window + the audio pipeline's own delay.
    get latencySeconds() {
      if (!context) return 0
      return frameSize / 2 / context.sampleRate + (context.baseLatency || 0)
    },

    // Records the microphone on this device (for playback/saving only — the
    // score comes from the live analysis above).
    startRecording() {
      if (!stream || typeof window.MediaRecorder === 'undefined') return false
      try {
        recorder = new window.MediaRecorder(stream)
      } catch {
        recorder = null
        return false
      }
      chunks = []
      recorder.ondataavailable = (event) => {
        if (event.data?.size) chunks.push(event.data)
      }
      recorder.start(1000)
      return true
    },

    pauseRecording() {
      if (recorder?.state === 'recording') recorder.pause()
    },

    resumeRecording() {
      if (recorder?.state === 'paused') recorder.resume()
    },

    stopRecording() {
      return new Promise((resolve) => {
        if (!recorder) return resolve(null)
        const finish = () => resolve(chunks.length ? new Blob(chunks, { type: recorder.mimeType || 'audio/webm' }) : null)
        if (recorder.state === 'inactive') return finish()
        recorder.onstop = finish
        recorder.stop()
      })
    },

    close() {
      window.clearInterval(timer)
      timer = null
      listeners.clear()
      try {
        if (recorder && recorder.state !== 'inactive') recorder.stop()
      } catch {
        // ignore
      }
      stream?.getTracks().forEach((track) => track.stop())
      stream = null
      context?.close?.().catch(() => {})
      context = null
    },
  }
}

// The provider the app uses. Swap here for a CloudAudioAnalyzer / MLAudioAnalyzer.
export function createAudioAnalyzer(options) {
  return createLocalAudioAnalyzer(options)
}
