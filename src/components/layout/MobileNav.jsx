import { NavLink } from 'react-router-dom'
import { NAV_ITEMS } from './navItems'
import { useKaraokeState } from '../../context/KaraokeContext'
import { cx } from '../../utils/classNames'
import { Icon } from '../common/Icon'

export function MobileNav() {
  const { queue } = useKaraokeState()
  return (
    <nav className="mobile-nav" aria-label="Main">
      {NAV_ITEMS.map((item) => (
        <NavLink key={item.to} to={item.to} end={item.end} className={({ isActive }) => cx('mobile-nav__link', isActive && 'mobile-nav__link--active')}>
          <span className="mobile-nav__icon" aria-hidden="true">
            <Icon symbol={item.icon} />
            {item.showQueueCount && queue.length > 0 && <span className="mobile-nav__badge">{queue.length}</span>}
          </span>
          <span className="mobile-nav__label">{item.shortLabel ?? item.label}</span>
        </NavLink>
      ))}
    </nav>
  )
}
