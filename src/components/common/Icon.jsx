import { cx } from '../../utils/classNames'

// Philippine flag as inline SVG — Windows has no flag emoji and would show "PH".
export function FlagPH({ className }) {
  return (
    <svg className={cx('flag-ph', className)} viewBox="0 0 36 24" aria-hidden="true" focusable="false">
      <rect width="36" height="12" fill="#0038a8" />
      <rect y="12" width="36" height="12" fill="#ce1126" />
      <path d="M0 0 20.8 12 0 24Z" fill="#fff" />
      <circle cx="7" cy="12" r="2.8" fill="#fcd116" />
      <circle cx="2.4" cy="3" r="1" fill="#fcd116" />
      <circle cx="2.4" cy="21" r="1" fill="#fcd116" />
      <circle cx="16.6" cy="12" r="1" fill="#fcd116" />
    </svg>
  )
}

// Renders a decorative icon from data (emoji), swapping in SVGs where emoji
// support is unreliable.
export function Icon({ symbol, className }) {
  if (!symbol) return null
  if (symbol === '🇵🇭') return <FlagPH className={className} />
  return <span className={className} aria-hidden="true">{symbol}</span>
}
