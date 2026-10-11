import { cx } from '../../utils/classNames'

const MEDALS = ['🥇', '🥈', '🥉']

// Tonight's top scores: medal/rank, singer, song, score. entries are sorted
// best first; the leader gets a crown.
export function Leaderboard({ entries, label = 'Tonight’s top scores', className }) {
  if (!entries.length) return null
  return (
    <ol className={cx('leaderboard', className)} aria-label={label}>
      {entries.map((entry, index) => (
        <li key={entry.id} className={cx('leaderboard__row', index === 0 && 'leaderboard__row--top')}>
          <span className="leaderboard__rank" aria-label={`Rank ${index + 1}`}>{MEDALS[index] ?? index + 1}</span>
          <span className="leaderboard__who">
            <span className="leaderboard__singer">{index === 0 && <span aria-hidden="true">👑 </span>}{entry.singer}</span>
            <span className="leaderboard__song">{entry.songTitle}</span>
          </span>
          <span className="leaderboard__score" aria-label={`${entry.score} points`}>{entry.score}</span>
        </li>
      ))}
    </ol>
  )
}
