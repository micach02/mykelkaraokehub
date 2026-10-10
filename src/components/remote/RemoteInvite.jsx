import { useMemo } from 'react'
import { QrCode } from '../room/QrCode'
import { useToast } from '../../context/ToastContext'
import { useServerStatus } from '../../hooks/useServerStatus'
import { getJoinUrl } from '../../services/roomService'
import { IS_HOSTED_SERVER } from '../../services/apiClient'
import { canNativeShare, copyText, messagingLinks, nativeShare } from '../../utils/share'
import { BRAND } from '../../config/appConfig'

// "Invite" tab on the phone remote: anyone already in the room can bring
// friends in — show this QR code to scan, or send the link.
export function RemoteInvite({ code }) {
  const { show } = useToast()
  const { lanOrigins } = useServerStatus()
  const url = getJoinUrl(code, lanOrigins[0])
  const text = `🎤 Join our karaoke! Add songs from your phone — room ${code}:`
  const links = useMemo(() => messagingLinks({ text, url }), [text, url])

  const copy = async () => {
    if (await copyText(url)) show('✓ Link copied')
    else show('Couldn’t copy — press and hold the link to copy it.', { variant: 'info' })
  }

  const share = async () => {
    const result = await nativeShare({ title: BRAND.displayName, text, url })
    if (result === 'unavailable') copy()
  }

  return (
    <section className="remote-invite" aria-labelledby="invite-title">
      <h2 id="invite-title" className="remote-invite__title">Invite friends</h2>
      <p className="remote-invite__text">Let a friend scan this with their phone camera.</p>

      <div className="remote-invite__qr">
        <QrCode value={url} size={220} label={`QR code to join room ${code}`} />
      </div>
      <p className="remote-invite__code">{code}</p>
      <p className="remote-invite__url">{url}</p>

      <div className="remote-invite__actions">
        {canNativeShare() && (
          <button type="button" className="remote-add remote-invite__primary" onClick={share}>
            📤 Share…
          </button>
        )}
        <button type="button" className="remote-invite__button remote-invite__copy" onClick={copy}>
          🔗 Copy link
        </button>
        {links.map((link) => (
          <a key={link.id} className="remote-invite__button" href={link.href} aria-label={`Send the room link by ${link.label}`}>
            <span aria-hidden="true">{link.icon}</span> {link.label}
          </a>
        ))}
      </div>

      <p className="remote-invite__note">
        {IS_HOSTED_SERVER ? 'Friends can join from anywhere, no matter which Wi-Fi they’re on.' : 'Friends need to be on the same Wi-Fi as the TV.'}
      </p>
    </section>
  )
}
