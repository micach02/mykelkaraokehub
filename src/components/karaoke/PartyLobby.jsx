import { useEffect, useMemo } from 'react'
import { useKaraokeActions, useKaraokeState } from '../../context/KaraokeContext'
import { useRoom } from '../../context/RoomContext'
import { useSurprise } from '../../hooks/useSurprise'
import { Button } from '../common/Button'
import { RequesterBadge } from '../common/RequesterBadge'
import { QrCode } from '../room/QrCode'
import { RoomButton } from '../room/RoomButton'
import { Leaderboard } from '../scoring/Leaderboard'
import { getLeaderboard, usePartyScores } from '../../services/leaderboardService'
import { pluralize } from '../../utils/text'

// Karaoke Mode with nothing playing: the TV becomes the party's welcome
// screen. Big QR code to join from phones, plus what's coming up (or
// tonight's top scores).
export function PartyLobby({ onBrowse }) {
  const { room, joinUrl, remotes, ensureRoom } = useRoom()
  const { queue, lastPlayedSong } = useKaraokeState()
  const actions = useKaraokeActions()
  const surprise = useSurprise(onBrowse)
  const partyScores = usePartyScores()
  const topScores = useMemo(() => getLeaderboard(5), [partyScores])

  // Opened straight into Karaoke Mode (e.g. a TV bookmark): start the room
  // here too, like Home does, so the QR code is ready.
  useEffect(() => {
    ensureRoom()
  }, [ensureRoom])

  return (
    <section className="party-lobby" aria-labelledby="party-lobby-title">
      <div className="party-lobby__intro">
        <p className="party-lobby__eyebrow">🎤 Karaoke night</p>
        <h2 id="party-lobby-title" className="party-lobby__title">
          Grab your phone. <span className="gradient-text">Scan to add songs!</span>
        </h2>
        <ol className="party-lobby__steps">
          <li>Point the <strong>phone camera</strong> at the QR code</li>
          <li><strong>Enter your name</strong></li>
          <li>Pick a song: it plays here</li>
        </ol>
        <div className="party-lobby__actions">
          <Button variant="primary" size="lg" icon="🔍" onClick={onBrowse}>Find a song</Button>
          <Button size="lg" icon="🎲" onClick={surprise}>Surprise me</Button>
          {lastPlayedSong && (
            <Button variant="ghost" size="lg" icon="↻" onClick={() => actions.playSong(lastPlayedSong)}>
              Sing “{lastPlayedSong.title}” again
            </Button>
          )}
        </div>

        {queue.length > 0 ? (
          <div className="party-lobby__board">
            <h3 className="party-lobby__heading">Up next</h3>
            <ol className="party-lobby__queue">
              {queue.slice(0, 3).map((entry) => (
                <li key={entry.entryId}>
                  <span className="party-lobby__song">{entry.song.title}</span>
                  <RequesterBadge requestedBy={entry.requestedBy} duetWith={entry.duetWith} />
                </li>
              ))}
            </ol>
          </div>
        ) : topScores.length > 0 && (
          <div className="party-lobby__board">
            <h3 className="party-lobby__heading">🏆 Tonight’s top scores</h3>
            <Leaderboard entries={topScores} />
          </div>
        )}
      </div>

      <div className="party-lobby__join">
        {room && joinUrl ? (
          <>
            <div className="party-lobby__qr">
              <QrCode value={joinUrl} size={300} label={`QR code to join room ${room.code}`} />
            </div>
            <p className="party-lobby__code">{room.code}</p>
            <p className="party-lobby__phones">📱 {pluralize(remotes, 'phone')} connected</p>
          </>
        ) : (
          <RoomButton size="lg" variant="secondary" />
        )}
      </div>
    </section>
  )
}
