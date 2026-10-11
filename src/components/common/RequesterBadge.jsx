import { cx } from '../../utils/classNames'

// Name to show for whoever requested a song from a phone. Phones that
// skipped the name prompt show as "Guest". Songs picked on the TV have no
// requester (null).
export function requesterName(requestedBy, { myId } = {}) {
  if (!requestedBy) return null
  if (myId && requestedBy.id === myId) return 'You'
  return requestedBy.name?.trim() || 'Guest'
}

// "🎤 Mika" pill ("🎤 Mika & Jo" for a duet). Never truncated, so the name
// is always readable.
export function RequesterBadge({ requestedBy, duetWith = null, myId, size = 'sm', className }) {
  const name = requesterName(requestedBy, { myId })
  if (!name) return null
  return (
    <span
      className={cx('requester', `requester--${size}`, name === 'You' && 'requester--me', className)}
      title={duetWith ? `Requested by ${name}, a duet with ${duetWith}` : `Requested by ${name}`}
    >
      <span aria-hidden="true">{duetWith ? '🎤🎤' : '🎤'}</span> {name}
      {duetWith && <> &amp; {duetWith}</>}
      <span className="sr-only"> requested this song{duetWith ? ` (a duet with ${duetWith})` : ''}</span>
    </span>
  )
}
