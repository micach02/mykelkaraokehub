import { useRoom } from '../../context/RoomContext'
import { Button } from '../common/Button'

// Header/deck button: starts a phone-remote room, or shows the active one.
export function RoomButton({ size = 'sm', variant = 'ghost', showLabel = true }) {
  const { room, remotes, status, createRoom, openPanel } = useRoom()

  if (!room) {
    return (
      <Button
        variant={variant}
        size={size}
        icon="📱"
        onClick={() => createRoom()}
        disabled={status === 'creating'}
        aria-label="Phone Remote: let phones add songs by scanning a QR code"
      >
        {showLabel ? (status === 'creating' ? 'Starting…' : 'Phone Remote') : null}
      </Button>
    )
  }

  return (
    <Button
      variant={variant}
      size={size}
      icon="📱"
      onClick={openPanel}
      aria-label={`Phone Remote room ${room.code}, ${remotes} ${remotes === 1 ? 'phone' : 'phones'} connected. Show QR code.`}
    >
      {showLabel ? `${remotes} ${remotes === 1 ? 'phone' : 'phones'}` : null}
    </Button>
  )
}
