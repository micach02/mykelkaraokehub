import { BRAND } from '../../config/appConfig'
import { cx } from '../../utils/classNames'

export function Loading({ label = 'Loading…', fullscreen = false, compact = false }) {
  return (
    <div className={cx('loading', fullscreen && 'loading--fullscreen', compact && 'loading--compact')} role="status">
      <div className="loading__bars" aria-hidden="true">
        <span /><span /><span /><span />
      </div>
      {fullscreen && <div className="loading__brand">{BRAND.logo}</div>}
      <div className="loading__label">{label}</div>
    </div>
  )
}
