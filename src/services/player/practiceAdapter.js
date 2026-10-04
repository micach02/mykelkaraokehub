// Player engine for practice tracks: plays the reference melody itself with
// Web Audio (a soft guide tone), so melody scoring has exact timing.
// Same interface as youtubeAdapter, plus setGuideEnabled().
//
// While scoring, the guide tone is muted by default — a microphone near the
// speakers would otherwise "hear" the guide and score it as singing. A short
// unpitched tick on each note keeps the rhythm (pitch detection rejects it).

import { getMelodyDuration, getReferenceMelody } from '../scoring/referenceMelodyService'
import { midiToFrequency } from '../scoring/musicMath'

const TAIL_SECONDS = 1.5

export function createPracticeAdapter(handlers) {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext
  let context = null
  let master = null
  let melody = null
  let duration = 0
  let position = 0 // seconds, while paused
  let startedAt = 0 // context time that corresponds to position 0
  let playing = false
  let voices = []
  let endTimer = null
  let volume = 1
  let guideEnabled = true

  function ensureContext() {
    if (context) return true
    if (!AudioContextClass) {
      handlers.onError({ code: 'unsupported', message: 'Practice tracks need a browser with Web Audio support.' })
      return false
    }
    context = new AudioContextClass()
    master = context.createGain()
    master.gain.value = volume
    master.connect(context.destination)
    return true
  }

  const now = () => (playing ? context.currentTime - startedAt : position)

  function silence() {
    voices.forEach((node) => {
      try {
        node.stop()
      } catch {
        // already stopped
      }
    })
    voices = []
    window.clearTimeout(endTimer)
  }

  function scheduleFrom(from) {
    const base = context.currentTime
    melody.notes.forEach((note) => {
      if (note.end <= from) return
      const begin = base + Math.max(0, note.start - from)
      const end = base + (note.end - from)
      // Rhythm tick: a burst of noise (no clear pitch).
      if (note.start >= from) {
        const noise = context.createBufferSource()
        const buffer = context.createBuffer(1, Math.floor(context.sampleRate * 0.03), context.sampleRate)
        const data = buffer.getChannelData(0)
        for (let i = 0; i < data.length; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length)
        noise.buffer = buffer
        const tickGain = context.createGain()
        tickGain.gain.value = 0.15
        noise.connect(tickGain).connect(master)
        noise.start(begin)
        voices.push(noise)
      }
      if (!guideEnabled) return
      const osc = context.createOscillator()
      osc.type = 'triangle'
      osc.frequency.value = midiToFrequency(note.midi)
      const gain = context.createGain()
      gain.gain.setValueAtTime(0, begin)
      gain.gain.linearRampToValueAtTime(0.18, begin + 0.03)
      gain.gain.setValueAtTime(0.18, Math.max(begin + 0.03, end - 0.05))
      gain.gain.linearRampToValueAtTime(0, end)
      osc.connect(gain).connect(master)
      osc.start(begin)
      osc.stop(end + 0.02)
      voices.push(osc)
    })
    endTimer = window.setTimeout(() => {
      silence()
      playing = false
      position = duration
      handlers.onStatus('ended')
    }, Math.max(0, (duration - from) * 1000))
  }

  function play() {
    if (!melody || !ensureContext()) return
    if (position >= duration) position = 0
    context.resume?.()
    startedAt = context.currentTime - position
    playing = true
    scheduleFrom(position)
    handlers.onStatus('playing')
  }

  function pause() {
    if (!playing) return
    position = now()
    playing = false
    silence()
    handlers.onStatus('paused')
  }

  return {
    kind: 'practice',
    load(song, { autoplay = true } = {}) {
      silence()
      playing = false
      position = 0
      melody = getReferenceMelody(song.id)
      if (!melody) {
        handlers.onError({ code: 'invalid-video', message: 'This practice track is missing its melody.' })
        return
      }
      duration = getMelodyDuration(melody) + TAIL_SECONDS
      handlers.onStatus('loading')
      // Browsers only allow audio after a tap; autoplay works when the user
      // just picked the song.
      if (autoplay) queueMicrotask(play)
      else handlers.onStatus('ready')
    },
    play,
    pause,
    stop() {
      silence()
      playing = false
      position = 0
      handlers.onStatus('stopped')
    },
    seek(seconds) {
      const wasPlaying = playing
      if (playing) {
        silence()
        playing = false
      }
      position = Math.min(Math.max(0, seconds), duration)
      if (wasPlaying) play()
    },
    setVolume(value) {
      volume = value / 100
      if (master) master.gain.value = volume
    },
    setGuideEnabled(enabled) {
      guideEnabled = enabled
      if (playing) {
        const at = now()
        silence()
        startedAt = context.currentTime - at
        scheduleFrom(at)
      }
    },
    getCurrentTime: () => (context ? now() : position),
    getDuration: () => duration,
    destroy() {
      silence()
      context?.close?.().catch(() => {})
      context = null
    },
  }
}
