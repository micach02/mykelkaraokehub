// 🏆 NEW PERSONAL BEST! — or the song's best so far.
export function PersonalBest({ score, personalBest }) {
  if (!personalBest) return null
  if (personalBest.isPersonalBest) {
    return (
      <p className="personal-best personal-best--new" role="status">
        🏆 NEW PERSONAL BEST!
        {personalBest.previousBest && <span> (was {personalBest.previousBest.score})</span>}
      </p>
    )
  }
  return (
    <p className="personal-best">
      🏆 Personal best: <strong>{personalBest.previousBest.score}</strong>
      <span> · This time: {score}</span>
    </p>
  )
}
