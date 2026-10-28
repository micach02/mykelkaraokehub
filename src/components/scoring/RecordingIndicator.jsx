import { cx } from '../../utils/classNames'

// ● Recording / ⏸ Paused — always visible while the microphone is in use.
// label: what's listening instead of "Recording" (e.g. a phone mic).
export function RecordingIndicator({ paused = false, label = 'Recording' }) {
  return (
    <span className={cx('recording-indicator', paused && 'recording-indicator--paused')} role="status">
      <span className="recording-indicator__dot" aria-hidden="true" />
      {paused ? 'Paused' : label}
    </span>
  )
}
