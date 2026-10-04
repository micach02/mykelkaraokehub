import { cx } from '../../utils/classNames'

export function EmptyState({ icon = '🎤', title, description, action, compact = false, className }) {
  return (
    <div className={cx('empty-state', compact && 'empty-state--compact', className)}>
      <div className="empty-state__icon" aria-hidden="true">{icon}</div>
      <h3 className="empty-state__title">{title}</h3>
      {description && <p className="empty-state__description">{description}</p>}
      {action && <div className="empty-state__action">{action}</div>}
    </div>
  )
}
