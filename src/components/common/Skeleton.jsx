import { cx } from '../../utils/classNames'

// Shimmering placeholders shown while songs load.
// layout: 'grid' (cards) | 'list' (rows)
export function SongSkeletons({ count = 6, layout = 'grid', label = 'Loading songs' }) {
  return (
    <div className={cx('skeletons', `skeletons--${layout}`)} role="status" aria-label={label}>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="skeleton-card" aria-hidden="true">
          <div className="skeleton skeleton--art" />
          <div className="skeleton-card__body">
            <div className="skeleton skeleton--line" />
            <div className="skeleton skeleton--line skeleton--short" />
          </div>
        </div>
      ))}
    </div>
  )
}
