import { useNavigate } from 'react-router-dom'
import { Queue } from '../components/karaoke/Queue'
import { RoomButton } from '../components/room/RoomButton'
import { useDocumentTitle } from '../hooks/useDocumentTitle'

export default function QueuePage() {
  useDocumentTitle('Queue')
  const navigate = useNavigate()

  return (
    <div className="page page--queue">
      <section className="page-banner">
        <p className="eyebrow">Your session</p>
        <h1 className="page-banner__title">Queue</h1>
        <p className="page-banner__text">Reorder, remove, or jump to any song. Your queue is saved on this device.</p>
      </section>
      <Queue variant="page" onBrowse={() => navigate('/')} />
      <section className="room-cta">
        <div>
          <h2 className="room-cta__title">Singing with friends?</h2>
          <p className="room-cta__text">Let everyone add songs from their own phone — scan a QR code, no app needed.</p>
        </div>
        <RoomButton variant="secondary" size="md" />
      </section>
    </div>
  )
}
