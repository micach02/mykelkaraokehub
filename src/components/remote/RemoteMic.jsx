import { cx } from '../../utils/classNames'

const BARS = 12

// Your turn, with this phone as the mic (see usePhoneMic): start it, see
// that it hears you, stop it.
export function RemoteMic({ status, level, error, onStart, onStop, onDismiss }) {
  if (status === 'off') return null
  // rms → 0..1 for the meter (singing is roughly 0.02–0.2).
  const lit = Math.round(Math.min(1, Math.sqrt(level / 0.15)) * BARS)

  return (
    <section className={cx('remote-mic', status === 'live' && 'remote-mic--live')} aria-label="Phone mic">
      {status === 'live' ? (
        <>
          <div className="remote-mic__head">
            <span className="remote-mic__dot" aria-hidden="true" />
            <strong>🎤 Your phone is the mic: sing!</strong>
          </div>
          <div className="remote-mic__meter" role="meter" aria-label="Your voice level" aria-valuemin={0} aria-valuemax={BARS} aria-valuenow={lit}>
            {Array.from({ length: BARS }, (_, i) => (
              <span key={i} className={cx('remote-mic__bar', i < lit && 'remote-mic__bar--on')} />
            ))}
          </div>
          <p className="remote-mic__hint">Hold it close and keep this page open. Your score shows on the TV.</p>
          <button type="button" className="remote-mic__link" onClick={onStop}>Stop the phone mic</button>
        </>
      ) : status === 'starting' ? (
        <div className="remote-mic__head" role="status">
          <span className="spinner" aria-hidden="true" /> Starting the phone mic…
        </div>
      ) : (
        <>
          <strong className="remote-mic__title">🎤 It’s your turn! Use this phone as the mic</strong>
          <p className="remote-mic__hint">
            {status === 'error'
              ? error
              : 'Your phone listens to your voice for the score on the TV. Only pitch and loudness numbers are sent, never audio.'}
          </p>
          <div className="remote-mic__actions">
            <button type="button" className="remote-mic__start" onClick={onStart}>
              {status === 'error' ? 'Try again' : '🎤 Start the phone mic'}
            </button>
            <button type="button" className="remote-mic__link" onClick={onDismiss}>Not this song</button>
          </div>
        </>
      )}
    </section>
  )
}
