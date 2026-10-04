import { useRoom } from '../../context/RoomContext'
import { QrCode } from './QrCode'
import { RoomButton } from './RoomButton'

// Karaoke Mode corner: a QR code anyone in the room can scan from the couch.
export function RoomQrCard() {
  const { room, joinUrl, remotes, openPanel } = useRoom()
  if (!room || !joinUrl) return <RoomButton size="lg" variant="secondary" />

  return (
    <button type="button" className="room-qr-card" onClick={openPanel} aria-label={`Show Phone Remote details for room ${room.code}`}>
      <QrCode value={joinUrl} size={104} label={`QR code to join room ${room.code}`} />
      <span className="room-qr-card__text">
        <strong>Scan to add songs</strong>
        <span>{room.code}</span>
        <span>📱 {remotes} connected</span>
      </span>
    </button>
  )
}
