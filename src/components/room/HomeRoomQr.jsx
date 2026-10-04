import { useEffect } from 'react'
import { useRoom } from '../../context/RoomContext'
import { QrCode } from './QrCode'
import { RoomButton } from './RoomButton'

// Landing page: the room's QR code above the search box, so guests can scan
// it and add songs from their phones straight away. Tapping it opens the
// Phone Remote panel (bigger QR, share links).
export function HomeRoomQr() {
  const { room, joinUrl, remotes, status, ensureRoom, openPanel } = useRoom()

  useEffect(() => {
    ensureRoom()
  }, [ensureRoom])

  if (room && joinUrl) {
    return (
      <button
        type="button"
        className="home-qr"
        onClick={openPanel}
        aria-label={`Scan to add songs from your phone. Room ${room.code}, ${remotes} ${remotes === 1 ? 'phone' : 'phones'} connected. Show Phone Remote details.`}
      >
        <QrCode value={joinUrl} size={112} label={`QR code to join room ${room.code}`} className="home-qr__code" />
        <span className="home-qr__text">
          <strong className="home-qr__title">📱 Scan to add songs</strong>
          <span>Point your phone camera here. No app needed.</span>
          <span className="home-qr__meta">
            <span className="home-qr__room">{room.code}</span>
            <span aria-hidden="true">·</span>
            <span>{remotes} {remotes === 1 ? 'phone' : 'phones'} connected</span>
          </span>
          <span className="home-qr__more">Share or show bigger ›</span>
        </span>
      </button>
    )
  }

  if (status === 'creating' || (room && !joinUrl)) {
    return (
      <div className="home-qr home-qr--loading" role="status">
        <span className="home-qr__placeholder" aria-hidden="true" />
        <span className="home-qr__text">
          <strong className="home-qr__title">📱 Starting the room…</strong>
          <span>The QR code appears in a moment.</span>
        </span>
      </div>
    )
  }

  // No room (ended, or the server couldn't start one): offer to start it.
  return <RoomButton variant="secondary" size="md" />
}
