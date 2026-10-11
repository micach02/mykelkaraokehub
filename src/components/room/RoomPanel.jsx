import { useRoom } from '../../context/RoomContext'
import { Modal } from '../common/Modal'
import { Button } from '../common/Button'
import { QrCode } from './QrCode'
import { PillSwitch } from '../common/PillSwitch'
import { useRoomSettings } from '../../services/roomSettings'
import { IS_HOSTED_SERVER } from '../../services/apiClient'
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
  const noNetworkAddress = !IS_HOSTED_SERVER && isLocalPage() && lanOrigins.length === 0
  const [settings, updateSettings] = useRoomSettings()

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

          <section className="room-settings" aria-label="Host settings">
            <p className="room-card__label">Host settings</p>
            <PillSwitch
              checked={settings.phonesControlAll}
              onChange={(on) => updateSettings({ phonesControlAll: on })}
              label="Phones can pause or skip any song"
              ariaLabel="Phones can pause or skip any song (otherwise only the singer's own song)"
            />
            <PillSwitch
              checked={settings.takeTurns}
              onChange={(on) => updateSettings({ takeTurns: on })}
              label="Take turns: singers alternate"
              ariaLabel="Take turns: new songs are queued so singers alternate"
            />
            <p className="room-settings__hint">
              {settings.phonesControlAll ? 'Anyone with the QR code can pause or skip.' : 'Phones can only pause or skip their own song.'}
              {settings.takeTurns ? ' New songs wait their turn, so one person can’t fill the queue.' : ''}
            </p>
          </section>

          <ul className="room-card__tips">
            {IS_HOSTED_SERVER ? (
              <li>Phones can join from <strong>anywhere</strong>, on any Wi-Fi or mobile data.</li>
            ) : (
              <>
                <li>Phones must be on the <strong>same Wi-Fi</strong> as this computer.</li>
                <li>If the page won't open on a phone, allow <strong>Node.js</strong> through Windows Firewall for private networks.</li>
              </>
            )}
          </ul>
        </div>
      )}
    </Modal>
  )
}
