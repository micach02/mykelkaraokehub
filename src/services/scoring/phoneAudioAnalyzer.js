// An audio analysis provider (same shape as createLocalAudioAnalyzer) whose
// frames come from the singer's phone instead of this device's microphone.
// The phone analyzes its own mic and sends the results once a second; each
// frame carries its `age`, so the session can place it on the song's timeline.
// No audio reaches this device, so there's nothing to record.

import { subscribeMic } from '../phoneMicBus'
import { decodeMicFrames } from '../../utils/micFrames'
import { frequencyToMidi } from './musicMath'

// Typical delay from the phone sending a batch to the TV receiving it.
const NETWORK_SECONDS = 0.25

export function createPhoneAudioAnalyzer(phoneId) {
  const listeners = new Set()
  let unsubscribe = null
  let phoneLatency = 0
  let framesReceived = 0

  return {
    kind: 'phone',
    phoneId,

    async open() {
      unsubscribe = subscribeMic(phoneId, (batch) => {
        phoneLatency = batch.latency
        const frames = decodeMicFrames(batch, frequencyToMidi)
        framesReceived += frames.length
        frames.forEach((frame) => listeners.forEach((listener) => listener(frame)))
      })
    },

    onFrame(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },

    get latencySeconds() {
      return phoneLatency + NETWORK_SECONDS
    },

    // Has the phone sent anything yet? (For "Listening to Mika's phone".)
    get framesReceived() {
      return framesReceived
    },

    startRecording() {
      return false
    },
    pauseRecording() {},
    resumeRecording() {},
    async stopRecording() {
      return null
    },

    close() {
      unsubscribe?.()
      unsubscribe = null
      listeners.clear()
    },
  }
}
