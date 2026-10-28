import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useRemoteRoom } from '../hooks/useRemoteRoom'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { useToast } from '../context/ToastContext'
import { COMMANDS, toRemoteSong } from '../services/roomService'
import { RemoteNowPlaying } from '../components/remote/RemoteNowPlaying'
import { RemoteReactions } from '../components/remote/RemoteReactions'
import { RemoteMic } from '../components/remote/RemoteMic'
import { isPhoneMicSupported, usePhoneMic, usePhoneMicPreference } from '../hooks/usePhoneMic'
import { RemoteSearch } from '../components/remote/RemoteSearch'
import { RemoteQueue } from '../components/remote/RemoteQueue'
import { RemoteNameForm } from '../components/remote/RemoteNameForm'
import { RemoteInvite } from '../components/remote/RemoteInvite'
import { RemoteTurn, getMyTurn, useTurnAlert } from '../components/remote/RemoteTurn'
import { Leaderboard } from '../components/scoring/Leaderboard'
import { IS_HOSTED_SERVER } from '../services/apiClient'
import { canPhoneControl, canPhoneGoNext } from '../services/roomSettings'
import { Loading } from '../components/common/Loading'
import { BRAND, ROOM_CONFIG } from '../config/appConfig'
import { cx } from '../utils/classNames'
import '../styles/remote.css'

const TABS = [
  { id: 'search', label: '🔍 Search' },
  { id: 'queue', label: '📋 Queue' },
  { id: 'invite', label: '📤 Invite' },
]

function RemoteMessage({ icon, title, text, action }) {
  return (
    <div className="remote remote--message">
      <p className="remote-empty__icon" aria-hidden="true">{icon}</p>
      <h1 className="remote-empty__title">{title}</h1>
      <p>{text}</p>
      {action}
    </div>
  )
}

// The page phones open after scanning the TV's QR code.
export default function Remote() {
  const { code } = useParams()
  const { identity, setName, room, sungSongs, connection, hostOnline, send, retry } = useRemoteRoom(code)
  const { show } = useToast()
  const [tab, setTab] = useState('search')
  const [pending, setPending] = useState(() => new Set())
  const [nameOpen, setNameOpen] = useState(false)
  useDocumentTitle(`Remote ${code}`)

  const queue = room?.queue ?? []
  const queuedIds = useMemo(
    () => new Set([...queue.map((e) => e.song.id), room?.nowPlaying?.song?.id].filter(Boolean)),
    [queue, room?.nowPlaying],
  )
  const tvOffline = hostOnline === false
  // Phones pause/skip only their own song unless the host lets everyone.
  const canControl = canPhoneControl({ settings: room?.settings, nowPlayingRequestedBy: room?.nowPlaying?.requestedBy, phoneId: identity.id })
  const canNext = canPhoneGoNext({ settings: room?.settings, scoredRequestedBy: room?.nowPlaying?.requestedBy, nextRequestedBy: queue[0]?.requestedBy, phoneId: identity.id })
  const turn = useMemo(() => getMyTurn({ nowPlaying: room?.nowPlaying, queue, myId: identity.id }), [room?.nowPlaying, queue, identity.id])
  // Phone mic: on this phone's turn (for songs it offered to be the mic for,
  // while the TV scores), it listens and sends its analysis to the TV.
  const micSupported = useMemo(() => isPhoneMicSupported(), [])
  const [micPref, setMicPref] = usePhoneMicPreference()
  const [micDismissed, setMicDismissed] = useState(null) // "Not this song"
  const nowPlaying = room?.nowPlaying
  const nowKey = nowPlaying ? `${nowPlaying.song.id}:${nowPlaying.requestedBy?.id ?? ''}` : null
  const micActive = Boolean(
    micSupported && micPref && nowPlaying?.requestedBy?.phoneMic && nowPlaying.requestedBy.id === identity.id
      && room?.micWanted && !room?.results && !tvOffline && micDismissed !== nowKey,
  )
  const mic = usePhoneMic({ code, from: identity, active: micActive })
  useTurnAlert(turn, (song) => show(`🎤 It’s your turn! “${song.title}” is starting.`, { duration: 6000 }))
  const songState = useCallback(
    (song) => (pending.has(song.id) ? 'sending' : queuedIds.has(song.id) ? 'queued' : 'idle'),
    [pending, queuedIds],
  )

  const run = useCallback(async (type, payload, successMessage) => {
    try {
      await send(type, payload)
      if (successMessage) show(successMessage)
      return true
    } catch (error) {
      show(error.message, { variant: 'error', duration: 5000 })
      return false
    }
  }, [send, show])

  // ⏭ / Next ignore taps right after an emoji tap or right as the score
  // appears (the button just moved under a finger that was tapping).
  const tapGuardUntil = useRef(0)
  const guardTaps = () => {
    tapGuardUntil.current = Date.now() + ROOM_CONFIG.remoteTapGuardMs
  }
  const hasResults = Boolean(room?.results)
  useEffect(() => {
    if (hasResults) guardTaps()
  }, [hasResults])
  const skip = () => {
    if (Date.now() < tapGuardUntil.current) return
    run(COMMANDS.SKIP_SONG, {}, room?.results ? '⏭ Next song' : 'Skipped')
  }

  // Reactions go straight to the TV (no message here); at most ~2 per second.
  const lastReaction = useRef(0)
  const react = useCallback((emoji) => {
    guardTaps()
    const now = Date.now()
    if (now - lastReaction.current < 500) return
    lastReaction.current = now
    navigator.vibrate?.(10)
    send(COMMANDS.REACT, { emoji }).catch(() => {})
  }, [send])

  const addSong = useCallback(async (song) => {
    if (queuedIds.has(song.id)) {
      show('Already in the queue', { variant: 'info' })
      return
    }
    setPending((set) => new Set(set).add(song.id))
    const payload = { song: toRemoteSong(song), ...(micSupported && micPref && { phoneMic: true }) }
    const added = await run(COMMANDS.ADD_TO_QUEUE, payload, `✓ Added “${song.title}”`)
    if (added) navigator.vibrate?.(20)
    setPending((set) => {
      const next = new Set(set)
      next.delete(song.id)
      return next
    })
  }, [queuedIds, run, show, micSupported, micPref])

  if (connection === 'waiting') {
    return (
      <RemoteMessage
        icon="⏳"
        title="Waiting for the TV…"
        text={`Room ${code} is reconnecting (the karaoke server may be waking up). This page continues by itself.`}
        action={<span className="spinner" aria-hidden="true" />}
      />
    )
  }
  if (connection === 'not-found') {
    return <RemoteMessage icon="🎤" title="This karaoke room has ended" text="Scan the QR code on the TV again to join." />
  }
  if (connection === 'error') {
    return (
      <RemoteMessage
        icon="📶"
        title="Can't reach the karaoke TV"
        text={IS_HOSTED_SERVER ? 'Check your internet connection and try again.' : "Make sure your phone is on the same Wi-Fi as the TV's computer."}
        action={<button type="button" className="remote-add" onClick={retry}>Try again</button>}
      />
    )
  }
  if (connection === 'connecting' && !room) return <Loading fullscreen label="Joining the karaoke room…" />

  // First visit: a name is required before choosing songs (it shows on the
  // TV next to each song). Remembered on this phone for next time.
  if (!identity.name) {
    return (
      <div className="remote remote--join">
        <header className="remote__header">
          <span className="remote__brand">
            {BRAND.logoIcon} <span className="remote__brand-name">{BRAND.displayName}</span>
          </span>
          <span className={cx('remote__status', connection === 'live' && !tvOffline && 'remote__status--live')}>{code}</span>
        </header>
        {tvOffline && <p className="remote__banner" role="status">📺 The TV isn't connected. Open myKel Karaoke on the TV.</p>}
        <main className="remote-join">
          <p className="remote-join__icon" aria-hidden="true">🎤</p>
          <h1 className="remote-join__title">Join the karaoke</h1>
          <p className="remote-join__text">
            Enter your name to start adding songs.
            {room?.nowPlaying && <> Now playing: <strong>{room.nowPlaying.song.title}</strong></>}
          </p>
          <RemoteNameForm onSave={setName} submitLabel="Join" autoFocus />
        </main>
      </div>
    )
  }

  // Shown while a song is on (also on its score card), but not on Invite.
  const showReactions = Boolean(room?.nowPlaying) && tab !== 'invite'

  return (
    <div className={cx('remote', showReactions && 'remote--reactions')}>
      <header className="remote__header">
        <span className="remote__brand">
          {BRAND.logoIcon} <span className="remote__brand-name">{BRAND.displayName}</span>
        </span>
        <button
          type="button"
          className={cx('remote__status', connection === 'live' && !tvOffline && 'remote__status--live')}
          onClick={() => setTab('invite')}
          aria-label={`Room ${code}. Invite friends`}
        >
          {code}
        </button>
        <button type="button" className="remote__name" onClick={() => setNameOpen(true)}>
          🎤 {identity.name || 'Your name'} ✎
        </button>
      </header>

      {tvOffline && <p className="remote__banner" role="status">📺 The TV isn't connected. Open myKel Karaoke on the TV.</p>}
      {connection === 'reconnecting' && <p className="remote__banner" role="status">Reconnecting…</p>}

      {nameOpen && (
        <RemoteNameForm
          name={identity.name}
          onSave={(name) => {
            setName(name)
            setNameOpen(false)
          }}
          onCancel={() => setNameOpen(false)}
        />
      )}

      {micActive && (
        <RemoteMic
          status={mic.status}
          level={mic.level}
          error={mic.error}
          onStart={mic.start}
          onStop={() => {
            mic.stop()
            setMicDismissed(nowKey)
          }}
          onDismiss={() => setMicDismissed(nowKey)}
        />
      )}

      {/* The Invite tab gives the QR code the whole screen, for easy scanning. */}
      {tab !== 'invite' && (
        <RemoteNowPlaying
          nowPlaying={room?.nowPlaying ?? null}
          isPlaying={Boolean(room?.isPlaying)}
          next={queue[0] ?? null}
          myId={identity.id}
          results={room?.results ?? null}
          receivedAt={room?.receivedAt}
          onTogglePlay={() => run(COMMANDS.TOGGLE_PLAY)}
          onSkip={skip}
          disabled={tvOffline || !room?.nowPlaying}
          canControl={canControl}
          canNext={canNext}
        />
      )}
      {tab !== 'invite' && !room?.results && (
        <RemoteTurn turn={turn} nowPlaying={room?.nowPlaying} isPlaying={Boolean(room?.isPlaying)} receivedAt={room?.receivedAt} />
      )}

      <main className="remote__main">
        {tab === 'search' && (
          <RemoteSearch
            savedSongs={room?.savedSongs}
            sungSongs={sungSongs}
            singerName={identity.name}
            songState={songState}
            onAdd={addSong}
            disabled={tvOffline}
          />
        )}
        {tab === 'queue' && micSupported && (
          <button
            type="button"
            role="switch"
            aria-checked={micPref}
            className={cx('remote-mic-setting', micPref && 'remote-mic-setting--on')}
            onClick={() => setMicPref(!micPref)}
          >
            <span className="remote-mic-setting__text">
              <strong>🎤 Use this phone as the mic</strong>
              <span>On your turn, sing into your phone for the score on the TV. Applies to songs you add from now on.</span>
            </span>
            <span className="remote-mic-setting__track" aria-hidden="true"><span className="remote-mic-setting__thumb" /></span>
          </button>
        )}
        {tab === 'queue' && (
          <RemoteQueue
            queue={queue}
            myId={identity.id}
            disabled={tvOffline}
            onRemove={(entry) => run(COMMANDS.REMOVE_FROM_QUEUE, { entryId: entry.entryId }, `Removed “${entry.song.title}”`)}
            onSetDuet={(entry, partner) => run(COMMANDS.SET_DUET, { entryId: entry.entryId, partner }, partner ? `🎤🎤 Duet with ${partner}` : 'Duet removed')}
          />
        )}
        {tab === 'queue' && room?.leaderboard?.length > 0 && (
          <section aria-labelledby="remote-leaderboard">
            <h2 id="remote-leaderboard" className="remote-heading">🏆 Tonight’s top scores</h2>
            <Leaderboard entries={room.leaderboard} />
          </section>
        )}
        {tab === 'invite' && <RemoteInvite code={code} />}
      </main>

      <div className="remote__dock">
        {showReactions && <RemoteReactions onReact={react} disabled={tvOffline} />}
        <nav className="remote__tabs" aria-label="Remote">
          {TABS.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              className={cx('remote__tab', tab === id && 'remote__tab--active')}
              aria-pressed={tab === id}
              onClick={() => setTab(id)}
            >
              {label}
              {id === 'queue' && <span className="count-badge">{queue.length}</span>}
            </button>
          ))}
        </nav>
      </div>
    </div>
  )
}
