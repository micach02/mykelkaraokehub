import { cx } from '../../utils/classNames'

// One-tap searches. items: strings, or { label, query } objects.
// children: extra buttons at the end of the row (e.g. 🎲 Surprise me).
export function QuickSearchChips({ items, onSelect, label, className, variant, children }) {
  if (!items.length && !children) return null
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
      {children}
    </div>
  )
}
