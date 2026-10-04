import { cx } from '../../utils/classNames'

// One-tap searches. items: strings, or { label, query } objects.
export function QuickSearchChips({ items, onSelect, label, className, variant }) {
  if (!items.length) return null
  return (
    <div className={cx('quick-chips', variant && `quick-chips--${variant}`, className)} role="group" aria-label={label}>
      {items.map((item) => {
        const { label: text, query } = typeof item === 'string' ? { label: item, query: item } : item
        return (
          <button key={text} type="button" className="quick-chip" onClick={() => onSelect(query)}>
            {text}
          </button>
        )
      })}
    </div>
  )
}
