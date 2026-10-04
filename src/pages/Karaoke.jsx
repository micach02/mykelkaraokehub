import { useOutletContext } from 'react-router-dom'
import { KaraokeMode } from '../components/karaoke/KaraokeMode'
import { useDocumentTitle } from '../hooks/useDocumentTitle'

// The player itself is in MainLayout; this route switches the layout into
// Karaoke Mode and adds the TV control deck.
export default function Karaoke() {
  useDocumentTitle('Karaoke Mode')
  const { openQueue, openPicker } = useOutletContext()
  return <KaraokeMode onOpenQueue={openQueue} onOpenPicker={openPicker} />
}
