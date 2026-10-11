import { REACTIONS } from '../../utils/reactions'

// Emoji bar docked above the tabs: far from ⏸ / ⏭ / Next, and it stays put
// when the now-playing card turns into the score card.
export function RemoteReactions({ onReact, disabled }) {
  return (
    <div className="remote-reactions" role="group" aria-label="Send a reaction to the TV">
      {REACTIONS.map((emoji) => (
        <button key={emoji} type="button" className="remote-reaction" onClick={() => onReact(emoji)} disabled={disabled} aria-label={`React ${emoji}`}>
          {emoji}
        </button>
      ))}
    </div>
  )
}
