import { useScoring } from '../../context/ScoringContext'
import { getScoringSupport } from '../../services/scoring/audioAnalysisProvider'
import { cx } from '../../utils/classNames'

// Auto-score on/off: when on, scoring and recording start by themselves
// whenever a song starts playing. Where scoring can't run (e.g. a plain
// http:// Wi-Fi address), tapping it explains why.
export function AutoScoreToggle({ size = 'md' }) {
  const { autoScore, setAutoScore, explainUnavailable } = useScoring()
  const support = getScoringSupport()
  const on = autoScore && support.supported
  const title = !support.supported
    ? support.message
    : on
      ? 'Auto-score is on: your singing is scored whenever a song plays'
      : 'Turn on to score your singing whenever a song plays'

  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-disabled={!support.supported || undefined}
      aria-label="Auto-score: score my singing whenever a song plays"
      className={cx('auto-score', `auto-score--${size}`, on && 'auto-score--on', !support.supported && 'auto-score--unavailable')}
      onClick={() => (support.supported ? setAutoScore(!autoScore) : explainUnavailable())}
      title={title}
    >
      <span className="auto-score__track" aria-hidden="true">
        <span className="auto-score__thumb" />
      </span>
      <span className="auto-score__label">🎤 Auto-score</span>
    </button>
  )
}
