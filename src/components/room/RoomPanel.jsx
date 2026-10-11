import { useRoom } from '../../context/RoomContext'
import { useToast } from '../../context/ToastContext'
import { Modal } from '../common/Modal'
import { Button } from '../common/Button'
import { QrCode } from './QrCode'
import { useRoomSettings } from '../../services/roomSettings'
import { IS_HOSTED_SERVER } from '../../services/apiClient'
import { copyText } from '../../utils/share'
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

// One host setting: title + what it means, switch on the right.
function SettingRow({ checked, onChange, title, description, ariaLabel }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      className={cx('room-setting', checked && 'room-setting--on')}
      onClick={() => onChange(!checked)}
    >
      <span className="room-setting__text">
        <span className="room-setting__title">{title}</span>
        <span className="room-setting__description">{description}</span>
      </span>
      <span className="auto-score__track room-setting__track" aria-hidden="true">
        <span className="auto-score__thumb" />
      </span>
    </button>
  )
}

// QR code + room details + host settings. Rendered once in the layout;
// opened from anywhere. Two columns on wide screens (QR left), one on phones.
export function RoomPanel() {
  const { room, status, remotes, joinUrl, lanOrigins, selectedOrigin, setSelectedOrigin, panelOpen, closePanel, closeRoom } = useRoom()
  const { show } = useToast()
  const noNetworkAddress = !IS_HOSTED_SERVER && isLocalPage() && lanOrigins.length === 0
  const [settings, updateSettings] = useRoomSettings()

  const copyLink = async () => {
    show((await copyText(joinUrl)) ? '🔗 Room link copied' : 'Couldn’t copy. Select the link and copy it.', { variant: 'info' })
  }

  return (
    <Modal
      open={panelOpen && Boolean(room)}
      onClose={closePanel}
      title="📱 Phone Remote"
      className="modal--room"
      footer={
        <>
          <Button variant="ghost" className="room-panel__end" onClick={closeRoom}>End room</Button>
          <Button variant="primary" onClick={closePanel}>Done</Button>
        </>
      }
    >
      {room && (
        <div className="room-panel">
          <section className="room-panel__join" aria-label="Join the room">
            {noNetworkAddress ? (
              <p className="notice notice--error" role="alert">
                This computer doesn't seem to be on a Wi-Fi or local network, so phones can't reach it. Connect it to the same Wi-Fi as the phones and reopen this panel.
              </p>
            ) : (
              <div className="room-panel__qr">
                <QrCode value={joinUrl} size={260} label={`QR code to join room ${room.code}`} />
              </div>
            )}
            <p className="room-panel__code" aria-label={`Room ${room.code}`}>{room.code}</p>
            <p className={cx('room-status', `room-status--${status}`)}>
              <span className="room-status__dot" aria-hidden="true" />
              {STATUS_TEXT[status] ?? status} · {pluralize(remotes, 'phone')} connected
            </p>
          </section>

          <div className="room-panel__details">
            <section aria-labelledby="room-steps-title">
              <h3 id="room-steps-title" className="room-panel__heading">How friends join</h3>
              <ol className="room-panel__steps">
                <li>Open the <strong>phone camera</strong> and point it at the QR code.</li>
                <li>Tap the link and <strong>enter a name</strong>.</li>
                <li>Search and add songs. They show here with the name.</li>
              </ol>
            </section>

            <section aria-labelledby="room-link-title">
              <h3 id="room-link-title" className="room-panel__heading">Or share the link</h3>
              <div className="room-panel__link">
                <span className="room-panel__url">{joinUrl}</span>
                <Button size="sm" icon="🔗" onClick={copyLink} aria-label="Copy the room link">Copy</Button>
              </div>
              {lanOrigins.length > 1 && isLocalPage() && (
                <label className="room-panel__network">
                  Network address
                  <select value={selectedOrigin ?? ''} onChange={(event) => setSelectedOrigin(event.target.value)}>
                    {lanOrigins.map((origin) => <option key={origin} value={origin}>{origin}</option>)}
                  </select>
                </label>
              )}
              <p className="room-panel__tip">
                {IS_HOSTED_SERVER ? (
                  <>Phones can join from <strong>anywhere</strong>, on any Wi-Fi or mobile data.</>
                ) : (
                  <>Phones must be on the <strong>same Wi-Fi</strong> as this computer. If the page won't open on a phone, allow <strong>Node.js</strong> through Windows Firewall for private networks.</>
                )}
              </p>
            </section>

            <section className="room-settings" aria-labelledby="room-settings-title">
              <h3 id="room-settings-title" className="room-panel__heading">Host settings</h3>
              <SettingRow
                checked={settings.phonesControlAll}
                onChange={(on) => updateSettings({ phonesControlAll: on })}
                title="Phones can pause or skip any song"
                description={settings.phonesControlAll ? 'Anyone with the QR code can pause or skip.' : 'Phones can only pause or skip their own song.'}
                ariaLabel="Phones can pause or skip any song (otherwise only the singer's own song)"
              />
              <SettingRow
                checked={settings.takeTurns}
                onChange={(on) => updateSettings({ takeTurns: on })}
                title="Take turns"
                description={settings.takeTurns ? 'New songs wait their turn, so one person can’t fill the queue.' : 'Songs play in the order they were added.'}
                ariaLabel="Take turns: new songs are queued so singers alternate"
              />
            </section>
          </div>
        </div>
      )}
    </Modal>
  )
}
