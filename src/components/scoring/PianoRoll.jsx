import { useEffect, useRef } from 'react'
import { midiToNoteName, nearestOctaveTo } from '../../services/scoring/musicMath'
import { FRAME_KIND } from '../../services/scoring/voiceActivityDetector'

const PAST_SECONDS = 2.5
const FUTURE_SECONDS = 6
const PLAYHEAD = 0.28 // playhead position across the width

/**
 * Scrolling note lane for songs with a reference melody (practice tracks).
 * Drawn on a canvas every animation frame from refs — no React re-renders.
 *
 * notes:       [{ start, end, midi }]
 * getTime:     () => current song time (seconds)
 * getFrames:   () => scoring frames (or null when not scoring) → singer trace
 */
export function PianoRoll({ notes, getTime, getFrames, title, subtitle }) {
  const canvasRef = useRef(null)
  const latest = useRef({ getTime, getFrames })
  useEffect(() => {
    latest.current = { getTime, getFrames }
  })

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !notes?.length) return undefined
    const ctx = canvas.getContext?.('2d')
    if (!ctx) return undefined
    const lowest = Math.min(...notes.map((n) => n.midi)) - 3
    const highest = Math.max(...notes.map((n) => n.midi)) + 3
    let frame = 0

    const draw = () => {
      const { width: cssW, height: cssH } = canvas.getBoundingClientRect()
      const ratio = window.devicePixelRatio || 1
      if (canvas.width !== Math.round(cssW * ratio) || canvas.height !== Math.round(cssH * ratio)) {
        canvas.width = Math.round(cssW * ratio)
        canvas.height = Math.round(cssH * ratio)
      }
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0)
      const w = cssW
      const h = cssH
      const top = h * 0.18
      const laneH = h * 0.72
      const rowH = laneH / (highest - lowest + 1)
      const time = latest.current.getTime() || 0
      const xOf = (t) => w * PLAYHEAD + ((t - time) / (PAST_SECONDS + FUTURE_SECONDS)) * w
      const yOf = (midi) => top + (highest - midi) * rowH

      ctx.clearRect(0, 0, w, h)
      // Semitone rows; label the Cs.
      for (let m = lowest; m <= highest; m += 1) {
        const y = yOf(m)
        ctx.fillStyle = m % 12 === 0 ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.03)'
        ctx.fillRect(0, y, w, 1)
        if (m % 12 === 0) {
          ctx.fillStyle = 'rgba(255,255,255,0.35)'
          ctx.font = '12px Inter, system-ui, sans-serif'
          ctx.fillText(midiToNoteName(m), 8, y + rowH * 0.7)
        }
      }

      // Notes.
      notes.forEach((note) => {
        const x1 = xOf(note.start)
        const x2 = xOf(note.end)
        if (x2 < 0 || x1 > w) return
        const y = yOf(note.midi)
        const current = time >= note.start && time < note.end
        const past = note.end < time
        ctx.fillStyle = current ? '#3dd9ff' : past ? 'rgba(124,92,255,0.35)' : 'rgba(180,123,255,0.85)'
        if (current) {
          ctx.shadowColor = '#3dd9ff'
          ctx.shadowBlur = 18
        }
        const r = Math.min(rowH * 0.45, 8)
        ctx.beginPath()
        if (ctx.roundRect) ctx.roundRect(x1, y + rowH * 0.1, Math.max(4, x2 - x1), rowH * 0.8, r)
        else ctx.rect(x1, y + rowH * 0.1, Math.max(4, x2 - x1), rowH * 0.8)
        ctx.fill()
        ctx.shadowBlur = 0
      })

      // Singer's pitch trace (folded to the octave of the expected note).
      const frames = latest.current.getFrames?.()
      if (frames?.length) {
        for (let i = frames.length - 1; i >= 0; i -= 1) {
          const f = frames[i]
          if (f.t < time - PAST_SECONDS) break
          if (f.kind !== FRAME_KIND.VOICE) continue
          const target = notes.find((n) => f.t >= n.start - 0.2 && f.t <= n.end + 0.2)
          const midi = target ? nearestOctaveTo(f.midi, target.midi) : f.midi
          const onNote = target && Math.abs(midi - target.midi) <= 0.5
          ctx.fillStyle = onNote ? '#34d399' : '#ff5fa2'
          ctx.beginPath()
          ctx.arc(xOf(f.t), yOf(midi) + rowH / 2, 3, 0, Math.PI * 2)
          ctx.fill()
        }
      }

      // Playhead.
      ctx.fillStyle = 'rgba(255,255,255,0.7)'
      ctx.fillRect(w * PLAYHEAD - 1, top - 10, 2, laneH + 20)

      frame = window.requestAnimationFrame(draw)
    }
    frame = window.requestAnimationFrame(draw)
    return () => window.cancelAnimationFrame(frame)
  }, [notes])

  return (
    <div className="piano-roll">
      <div className="piano-roll__head">
        <p className="piano-roll__title">{title}</p>
        {subtitle && <p className="piano-roll__subtitle">{subtitle}</p>}
      </div>
      <canvas ref={canvasRef} className="piano-roll__canvas" aria-hidden="true" />
      <p className="sr-only">Practice track. Sing along with the note bars as they reach the line.</p>
    </div>
  )
}
