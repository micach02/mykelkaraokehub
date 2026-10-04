import { cx } from '../../utils/classNames'

// Name to show for whoever requested a song from a phone. Phones that
// skipped the name prompt show as "Guest". Songs picked on the TV have no
// requester (null).
export function requesterName(requestedBy, { myId } = {}) {
  if (!requestedBy) return null
  if (myId && requestedBy.id === myId) return 'You'
  return requestedBy.name?.trim() || 'Guest'
}

// "🎤 Mika" pill. Never truncated, so the name is always readable.
export function RequesterBadge({ requestedBy, myId, size = 'sm', className }) {
  const name = requesterName(requestedBy, { myId })
  if (!name) return null
  return (
    <span className={cx('requester', `requester--${size}`, name === 'You' && 'requester--me', className)} title={`Requested by ${name}`}>
      <span aria-hidden="true">🎤</span> {name}
      <span className="sr-only"> requested this song</span>
    </span>
  )
}
