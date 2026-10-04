import { MicrophonePermission } from './MicrophonePermission'
import { MicrophoneCalibration } from './MicrophoneCalibration'
import { SingingCountdown } from './SingingCountdown'
import { KaraokeResults } from './KaraokeResults'

// All scoring dialogs, rendered once in the layout. Each shows itself for
// its own phase of the flow.
export function ScoringFlow() {
  return (
    <>
      <MicrophonePermission />
      <MicrophoneCalibration />
      <SingingCountdown />
      <KaraokeResults />
    </>
  )
}
