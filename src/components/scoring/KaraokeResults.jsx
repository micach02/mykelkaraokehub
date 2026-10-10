import { useEffect, useState } from 'react'
import { useScoring } from '../../context/ScoringContext'
import { useKaraokeState } from '../../context/KaraokeContext'
import { Modal } from '../common/Modal'
import { Button } from '../common/Button'
import { PerformanceStats } from './PerformanceStats'
import { PersonalBest } from './PersonalBest'
import { SCORING_SESSION } from '../../config/scoringConfig'
import scoreRevealSound from '../../assets/sounds/mixkit-score-casino-counter-1998.wav'

function fileNameFor(song, score) {
  const slug = song.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  return `mykel-karaoke-${slug || 'song'}-${score}.webm`
}

// Results screen after a scored song: the final score, the stats, and the
// recording (play / save, on this device only). The
// next song plays automatically after SCORING_SESSION.resultsAutoNextSeconds,
// unless someone taps the results to read them.
export function KaraokeResults() {
  const { phase, results, singAgain, nextSong, backToSongs, dismissResults, autoNextAt, stopAutoNext } = useScoring()
  const { queue, volume, isMuted } = useKaraokeState()
  const open = phase === 'results' && Boolean(results)
  const hasNext = queue.length > 0

  // The countdown itself runs in ScoringContext (phones show it too); this
  // just redraws the seconds.
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (autoNextAt == null) return undefined
    setNow(Date.now())
    const timer = window.setInterval(() => setNow(Date.now()), 250)
    return () => window.clearInterval(timer)
  }, [autoNextAt])

  // Score counter sound as the final score appears (follows the app's volume
  // and Mute). Stops if the results close first.
  const soundKey = open ? results : null
  useEffect(() => {
    const level = SCORING_SESSION.resultsSoundVolume * (isMuted ? 0 : volume / 100)
    if (!soundKey || level <= 0) return undefined
    const audio = new Audio(scoreRevealSound)
    audio.volume = Math.min(1, level)
    audio.play()?.catch?.(() => {}) // the browser may block it; the score still shows
    return () => audio.pause()
  }, [soundKey]) // once per score screen, not on every volume change

  const secondsLeft = autoNextAt == null
    ? null
    : Math.min(SCORING_SESSION.resultsAutoNextSeconds, Math.max(0, Math.ceil((autoNextAt - now) / 1000)))

  if (!open) return <Modal open={false} onClose={dismissResults} title="Results" />
  const { result, song, personalBest, recordingUrl } = results
  const grade = result.gradeInfo

  return (
    <Modal open={open} onClose={dismissResults} title="Karaoke Score" className="modal--results">
      <div className="results" onPointerDown={stopAutoNext}>
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
