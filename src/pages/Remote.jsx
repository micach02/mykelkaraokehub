import { useCallback, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useRemoteRoom } from '../hooks/useRemoteRoom'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { useToast } from '../context/ToastContext'
import { COMMANDS, toRemoteSong } from '../services/roomService'
import { RemoteNowPlaying } from '../components/remote/RemoteNowPlaying'
import { RemoteSearch } from '../components/remote/RemoteSearch'
import { RemoteQueue } from '../components/remote/RemoteQueue'
import { RemoteNameForm } from '../components/remote/RemoteNameForm'
import { RemoteInvite } from '../components/remote/RemoteInvite'
import { Loading } from '../components/common/Loading'
import { BRAND } from '../config/appConfig'
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

  const addSong = useCallback(async (song) => {
    if (queuedIds.has(song.id)) {
      show('Already in the queue', { variant: 'info' })
      return
    }
    setPending((set) => new Set(set).add(song.id))
    await run(COMMANDS.ADD_TO_QUEUE, { song: toRemoteSong(song) }, `✓ Added “${song.title}”`)
    setPending((set) => {
      const next = new Set(set)
      next.delete(song.id)
      return next
    })
  }, [queuedIds, run, show])

  if (connection === 'not-found') {
    return <RemoteMessage icon="🎤" title="This karaoke room has ended" text="Scan the QR code on the TV again to join." />
  }
  if (connection === 'error') {
    return (
      <RemoteMessage
        icon="📶"
        title="Can't reach the karaoke TV"
        text="Make sure your phone is on the same Wi-Fi as the TV's computer."
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

  return (
    <div className="remote">
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
          onSkip={() => run(COMMANDS.SKIP_SONG, {}, room?.results ? '⏭ Next song' : 'Skipped')}
          disabled={tvOffline || !room?.nowPlaying}
        />
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
        {tab === 'queue' && (
          <RemoteQueue
            queue={queue}
            myId={identity.id}
            disabled={tvOffline}
            onRemove={(entry) => run(COMMANDS.REMOVE_FROM_QUEUE, { entryId: entry.entryId }, `Removed “${entry.song.title}”`)}
          />
        )}
        {tab === 'invite' && <RemoteInvite code={code} />}
      </main>

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
  )
}
