// Stand-in for services/scoring/audioAnalysisProvider in tests (jsdom has no
// microphone). Tests push analysis frames with fakeMic.analyzer.emit(frame).
//   vi.mock('../services/scoring/audioAnalysisProvider', () => import('../test/fakeMicrophone'))

export const fakeMic = { analyzer: null, permission: 'prompt', failWith: null, supported: true }

export class MicrophoneError extends Error {
  constructor(code, message) {
    super(message)
    this.code = code
  }
}

export function getScoringSupport() {
  return fakeMic.supported
    ? { supported: true }
    : { supported: false, reason: 'unsupported', message: 'Your browser does not support karaoke scoring.' }
}

export async function getMicrophonePermissionState() {
  return fakeMic.permission
}

export function createAudioAnalyzer() {
  const listeners = new Set()
  const analyzer = {
    latencySeconds: 0,
    closed: false,
    recording: false,
    async open() {
      if (fakeMic.failWith) throw fakeMic.failWith
      fakeMic.permission = 'granted' // like a browser, remembered once allowed
    },
    onFrame(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    emit(frame) {
      listeners.forEach((listener) => listener({ at: performance.now(), peak: frame.rms * 2, ...frame }))
    },
    startRecording() {
      analyzer.recording = true
      return true
    },
    pauseRecording() {},
    resumeRecording() {},
    async stopRecording() {
      analyzer.recording = false
      return new Blob(['fake audio'], { type: 'audio/webm' })
    },
    close() {
      analyzer.recording = false
      analyzer.closed = true
      listeners.clear()
    },
  }
  fakeMic.analyzer = analyzer
  return analyzer
}
