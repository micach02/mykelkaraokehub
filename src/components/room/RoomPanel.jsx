import { useRoom } from '../../context/RoomContext'
import { Modal } from '../common/Modal'
import { Button } from '../common/Button'
import { QrCode } from './QrCode'
import { pluralize } from '../../utils/text'
import { cx } from '../../utils/classNames'

const STATUS_TEXT = {
  creating: 'Starting the room…',
  connecting: 'Connecting…',
  live: 'Live',
  reconnecting: 'Reconnecting…',
  error: 'Not connected',
}

function isLocalPage() {
  const { hostname } = window.location
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]'
}

// QR code + room details. Rendered once in the layout; opened from anywhere.
export function RoomPanel() {
  const { room, status, remotes, joinUrl, lanOrigins, selectedOrigin, setSelectedOrigin, panelOpen, closePanel, closeRoom } = useRoom()
  const noNetworkAddress = isLocalPage() && lanOrigins.length === 0

  return (
    <Modal
      open={panelOpen && Boolean(room)}
      onClose={closePanel}
      title="📱 Phone Remote"
      description="Friends scan this with their phone camera to search songs and add them to the queue."
      footer={
        <>
          <Button variant="ghost" onClick={closeRoom}>End room</Button>
          <Button variant="primary" onClick={closePanel}>Done</Button>
        </>
      }
    >
      {room && (
        <div className="room-card">
          <p className={cx('room-status', `room-status--${status}`)}>
            <span className="room-status__dot" aria-hidden="true" />
            {STATUS_TEXT[status] ?? status} · {pluralize(remotes, 'phone')} connected
          </p>

          {noNetworkAddress ? (
            <p className="notice notice--error" role="alert">
              This computer doesn't seem to be on a Wi-Fi or local network, so phones can't reach it. Connect it to the same Wi-Fi as the phones and reopen this panel.
            </p>
          ) : (
            <div className="room-card__qr">
              <QrCode value={joinUrl} size={232} label={`QR code to join room ${room.code}`} />
            </div>
          )}

          <p className="room-card__label">Room</p>
          <p className="room-card__code">{room.code}</p>
          <p className="room-card__url">
            Or open <strong>{joinUrl}</strong>
          </p>

          {lanOrigins.length > 1 && isLocalPage() && (
            <label className="room-card__network">
              Network address
              <select value={selectedOrigin ?? ''} onChange={(event) => setSelectedOrigin(event.target.value)}>
                {lanOrigins.map((origin) => <option key={origin} value={origin}>{origin}</option>)}
              </select>
            </label>
          )}

          <ul className="room-card__tips">
            <li>Phones must be on the <strong>same Wi-Fi</strong> as this computer.</li>
            <li>If the page won't open on a phone, allow <strong>Node.js</strong> through Windows Firewall for private networks.</li>
          </ul>
        </div>
      )}
    </Modal>
  )
}
