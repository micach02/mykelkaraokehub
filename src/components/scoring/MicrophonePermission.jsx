import { useScoring } from '../../context/ScoringContext'
import { Modal } from '../common/Modal'
import { Button } from '../common/Button'
import { ScoringModeNote } from './ScoringModeNote'

export const PRIVACY_NOTE = 'Your voice is analyzed locally in your browser and is not uploaded.'

// Permission explanation, waiting for the browser prompt, and mic errors.
export function MicrophonePermission() {
  const { phase, error, take, allowMicrophone, retry, cancel } = useScoring()
  const open = ['permission', 'requesting', 'error', 'unsupported'].includes(phase)
  const problem = phase === 'error' || phase === 'unsupported'
  const title = problem
    ? phase === 'unsupported' ? 'Karaoke scoring unavailable' : 'Microphone problem detected'
    : '🎤 Microphone Access Required'

  return (
    <Modal
      open={open}
      onClose={cancel}
      title={title}
      footer={
        problem ? (
          <>
            <Button onClick={cancel}>Got it</Button>
            {phase === 'error' && <Button variant="primary" onClick={retry}>Try again</Button>}
          </>
        ) : (
          <>
            <Button onClick={cancel}>Not now</Button>
            <Button variant="primary" icon="🎤" onClick={allowMicrophone} disabled={phase === 'requesting'}>
              {phase === 'requesting' ? 'Waiting for permission…' : 'Allow Microphone'}
            </Button>
          </>
        )
      }
    >
      {problem ? (
        <p className="scoring-text" role="alert">{error?.message}</p>
      ) : (
        <div className="scoring-text">
          <p>myKelKaraokeHub needs access to your microphone to analyze your singing performance.</p>
          {phase === 'requesting' && (
            <p className="notice">Your browser is asking for permission — choose <strong>Allow</strong>.</p>
          )}
          {take && <ScoringModeNote melody={Boolean(take.melody)} />}
          <p className="scoring-privacy">🔒 {PRIVACY_NOTE}</p>
        </div>
      )}
    </Modal>
  )
}
