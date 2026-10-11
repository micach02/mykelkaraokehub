import { cx } from '../../utils/classNames'

// On/off switch in the app's pill style (same look as Auto-score).
export function PillSwitch({ checked, onChange, label, ariaLabel, title, size = 'md', className }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      title={title}
      className={cx('auto-score', `auto-score--${size}`, checked && 'auto-score--on', className)}
      onClick={() => onChange(!checked)}
    >
      <span className="auto-score__track" aria-hidden="true">
        <span className="auto-score__thumb" />
      </span>
      <span className="auto-score__label">{label}</span>
    </button>
  )
}
