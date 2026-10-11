import { useReactions } from '../../services/reactionBus'

// Reactions from phones float up over the right side of the video, with the
// sender's name. Never catches taps.
export function ReactionLayer() {
  const reactions = useReactions()
  if (!reactions.length) return null
  return (
    <div className="reaction-layer" aria-hidden="true">
      {reactions.map((reaction) => (
        <span key={reaction.id} className="reaction" style={{ '--lane': reaction.lane }}>
          <span className="reaction__emoji">{reaction.emoji}</span>
          {reaction.name && <span className="reaction__name">{reaction.name}</span>}
        </span>
      ))}
    </div>
  )
}
