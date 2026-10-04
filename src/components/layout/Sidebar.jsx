import { Queue } from '../karaoke/Queue'

// Desktop queue panel beside the player. On small screens the queue lives in
// a bottom sheet instead.
export function Sidebar({ onBrowse }) {
  return (
    <aside className="sidebar" aria-label="Song queue">
      <Queue variant="sidebar" onBrowse={onBrowse} />
    </aside>
  )
}
