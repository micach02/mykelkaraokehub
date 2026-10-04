import { cx } from '../../utils/classNames'
import { Icon } from '../common/Icon'

// Filter chips. Categories come from data (songService.getCategories).
export function CategoryTabs({ categories, activeId, onChange, allLabel = 'All', label = 'Filter by category', exclude = [] }) {
  const visible = categories.filter((c) => !exclude.includes(c.id) && (c.id === activeId || !(c.hideWhenEmpty && c.songCount === 0)))
  return (
    <div className="category-tabs" role="group" aria-label={label}>
      {allLabel && (
        <button
          type="button"
          className={cx('category-tab', !activeId && 'category-tab--active')}
          aria-pressed={!activeId}
          onClick={() => onChange(null)}
        >
          {allLabel}
        </button>
      )}
      {visible.map((category) => (
        <button
          key={category.id}
          type="button"
          className={cx(
            'category-tab',
            activeId === category.id && 'category-tab--active',
            category.featured && 'category-tab--featured',
          )}
          aria-pressed={activeId === category.id}
          onClick={() => onChange(activeId === category.id ? null : category.id)}
        >
          <Icon symbol={category.icon} /> {category.label}
        </button>
      ))}
    </div>
  )
}
