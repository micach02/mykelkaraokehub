import { cx } from '../../utils/classNames'

// ● Recording / ⏸ Paused — always visible while the microphone is in use.
export function RecordingIndicator({ paused = false }) {
  return (
    <span className={cx('recording-indicator', paused && 'recording-indicator--paused')} role="status">
      <span className="recording-indicator__dot" aria-hidden="true" />
      {paused ? 'Paused' : 'Recording'}
    </span>
  )
}
