import { useEffect, useState } from 'react'
import { useScoring } from '../../context/ScoringContext'
import { useKaraokeState } from '../../context/KaraokeContext'
import { Modal } from '../common/Modal'
import { Button } from '../common/Button'
import { PerformanceStats } from './PerformanceStats'
import { PersonalBest } from './PersonalBest'
import { SCORING_SESSION } from '../../config/scoringConfig'

function fileNameFor(song, score) {
  const slug = song.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  return `mykel-karaoke-${slug || 'song'}-${score}.webm`
}

// Results screen after a scored song: the final score, the stats, and the
// recording (play / save, on this device only). The
// next song plays automatically after SCORING_SESSION.resultsAutoNextSeconds,
// unless someone taps the results to read them.
export function KaraokeResults() {
  const { phase, results, singAgain, nextSong, backToSongs, dismissResults } = useScoring()
  const { queue } = useKaraokeState()
  const open = phase === 'results' && Boolean(results)
  const hasNext = queue.length > 0
  const autoSeconds = SCORING_SESSION.resultsAutoNextSeconds
  const [secondsLeft, setSecondsLeft] = useState(null)

  // At a party, keep the queue moving: continue automatically unless someone
  // interacts with the results.
  useEffect(() => {
    setSecondsLeft(open && hasNext && autoSeconds > 0 ? autoSeconds : null)
  }, [open, hasNext, autoSeconds])

  useEffect(() => {
    if (secondsLeft == null) return undefined
    if (secondsLeft <= 0) {
      setSecondsLeft(null) // fire once
      nextSong()
      return undefined
    }
    const timer = window.setTimeout(() => setSecondsLeft((s) => (s == null ? s : s - 1)), 1000)
    return () => window.clearTimeout(timer)
  }, [secondsLeft, nextSong])

  if (!open) return <Modal open={false} onClose={dismissResults} title="Results" />
  const { result, song, personalBest, recordingUrl } = results
  const grade = result.gradeInfo

  return (
    <Modal open={open} onClose={dismissResults} title="Karaoke Score" className="modal--results">
      <div className="results" onPointerDown={() => setSecondsLeft(null)}>
        <p className="results__song">{song.title} · {song.artist}</p>

        <div className="results__hero">
          <p className="results__headline">{grade.emoji} {grade.headline}</p>
          <p className="results__score" aria-label={`Karaoke Score ${result.totalScore} out of 100`}>
            <span className="results__number">{result.totalScore}</span>
            <span className="results__out-of">/ 100</span>
          </p>
          <p className="results__grade">{grade.label}</p>
          <PersonalBest score={result.totalScore} personalBest={personalBest} />
        </div>

        <PerformanceStats result={result} />

        {recordingUrl && (
          <section className="results__recording" aria-label="Your recording">
            <audio controls src={recordingUrl} />
            <a className="results__download" href={recordingUrl} download={fileNameFor(song, result.totalScore)}>⬇ Save recording</a>
          </section>
        )}

        <div className="results__actions">
          <Button size="lg" icon="↻" onClick={singAgain}>Sing Again</Button>
          {hasNext && (
            <Button size="lg" variant="primary" icon="⏭" onClick={nextSong}>
              Next Song{secondsLeft != null ? ` (${secondsLeft})` : ''}
            </Button>
          )}
          <Button size="lg" variant={hasNext ? 'ghost' : 'primary'} icon="🎵" onClick={backToSongs}>Back to Songs</Button>
        </div>
      </div>
    </Modal>
  )
}
