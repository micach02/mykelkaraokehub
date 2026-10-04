import { useEffect, useRef, useState } from 'react'
import { useScoring } from '../../context/ScoringContext'
import { Modal } from '../common/Modal'
import { Button } from '../common/Button'
import { evaluateCalibration } from '../../services/scoring/microphoneCalibration'
import { rmsToDb } from '../../services/scoring/musicMath'
import { SCORING_SESSION } from '../../config/scoringConfig'
import { cx } from '../../utils/classNames'

// Level meter position (0–100%) on a -60…0 dB scale.
function meterPercent(rms) {
  return Math.max(0, Math.min(100, ((rmsToDb(rms) + 60) / 60) * 100))
}

// 🎤 Microphone Check: sing or speak for a few seconds. A GOOD result
// continues to the countdown by itself.
export function MicrophoneCalibration() {
  const { phase, getAnalyzer, finishCalibration, cancel } = useScoring()
  const open = phase === 'calibrating'
  const [attempt, setAttempt] = useState(0)
  const [level, setLevel] = useState(0)
  const [progress, setProgress] = useState(0)
  const [result, setResult] = useState(null)
  const framesRef = useRef([])

  useEffect(() => {
    if (!open) return undefined
    const analyzer = getAnalyzer()
    if (!analyzer) return undefined
    framesRef.current = []
    setResult(null)
    setProgress(0)
    const startedAt = performance.now()
    const totalMs = SCORING_SESSION.calibrationSeconds * 1000
    const unsubscribe = analyzer.onFrame((frame) => {
      framesRef.current.push(frame)
    })
    // UI refresh ~10×/s (not per audio frame).
    const timer = window.setInterval(() => {
      const frames = framesRef.current
      const elapsed = performance.now() - startedAt
      setLevel(frames.length ? frames[frames.length - 1].rms : 0)
      setProgress(Math.min(1, elapsed / totalMs))
      if (elapsed >= totalMs) {
        window.clearInterval(timer)
        unsubscribe()
        setResult(evaluateCalibration(frames))
      }
    }, 100)
    return () => {
      window.clearInterval(timer)
      unsubscribe()
    }
  }, [open, attempt, getAnalyzer])

  const good = result?.status === 'good'
  const unusable = result?.status === 'silent'

  // GOOD → continue by itself after a moment. (Cleared if the dialog closes
  // first, e.g. Continue was pressed.)
  useEffect(() => {
    if (!open || !good) return undefined
    const timer = window.setTimeout(() => finishCalibration(result.noiseFloor), SCORING_SESSION.calibrationAutoContinueMs)
    return () => window.clearTimeout(timer)
  }, [open, good, result, finishCalibration])
  const percent = Math.round(meterPercent(level))

  return (
    <Modal
      open={open}
      onClose={cancel}
      title="🎤 Microphone Check"
      footer={
        <>
          <Button onClick={cancel}>Cancel</Button>
          {result && !good && <Button onClick={() => setAttempt((n) => n + 1)}>Try again</Button>}
          {result ? (
            <Button variant="primary" onClick={() => finishCalibration(result.noiseFloor)} disabled={unusable}>
              {good ? 'Continue' : 'Continue anyway'}
            </Button>
          ) : (
            <Button variant="ghost" onClick={() => finishCalibration(0)}>Skip check</Button>
          )}
        </>
      }
    >
      <div className="calibration">
        <p className="scoring-text">Sing or speak for {SCORING_SESSION.calibrationSeconds} seconds.</p>
        <div className="level-meter" role="meter" aria-label="Microphone level" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent}>
          <div className="level-meter__fill" style={{ width: `${percent}%` }} />
        </div>
        <div className="calibration__progress" aria-hidden="true">
          <div style={{ width: `${progress * 100}%` }} />
        </div>
        {result && (
          <p className={cx('calibration__result', `calibration__result--${result.status}`)} role="status">
            {good ? '✅ ' : '⚠️ '}
            {result.message}
            {good && <span className="calibration__next"> Starting…</span>}
          </p>
        )}
      </div>
    </Modal>
  )
}
