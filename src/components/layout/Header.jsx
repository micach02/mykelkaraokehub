import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { BRAND } from '../../config/appConfig'
import { NAV_ITEMS } from './navItems'
import { SearchBar } from '../songs/SearchBar'
import { Button } from '../common/Button'
import { RoomButton } from '../room/RoomButton'
import { useSearchQuery } from '../../hooks/useSearchQuery'
import { useKaraokeState } from '../../context/KaraokeContext'
import { enterFullscreen } from '../../utils/fullscreen'
import { cx } from '../../utils/classNames'
import { GLOBAL_SEARCH_ID, HOME_SEARCH_ID } from '../../config/domIds'

export function Header() {
  const { query, setQuery, submitQuery } = useSearchQuery()
  const { queue } = useKaraokeState()
  const navigate = useNavigate()
  const onHome = useLocation().pathname === '/'

  // Phones: Home has the big search box, so the header one is hidden there.
  // Elsewhere, tapping it jumps to Home's search instead of typing up here.
  function jumpToHomeSearch() {
    if (onHome || !window.matchMedia?.('(max-width: 900px)').matches) return
    navigate('/')
    window.requestAnimationFrame(() => document.getElementById(HOME_SEARCH_ID)?.focus())
  }

  function openKaraokeMode() {
    navigate('/karaoke')
    // Going fullscreen needs a user gesture, so it happens here, on click.
    // Skipped on touch devices, where it gets in the way.
    if (window.matchMedia?.('(pointer: fine)').matches) enterFullscreen()
  }

  return (
    <header className={cx('header', onHome && 'header--home')}>
      <Link to="/" className="brand" aria-label={`${BRAND.appName} home`}>
        <span className="brand__icon" aria-hidden="true">{BRAND.logoIcon}</span>
        <span className="brand__name">myKel<span className="brand__accent">KaraokeHub</span></span>
      </Link>

      <nav className="header__nav" aria-label="Main">
        {NAV_ITEMS.filter((item) => item.to !== '/karaoke').map((item) => (
          <NavLink key={item.to} to={item.to} end={item.end} className={({ isActive }) => cx('nav-link', isActive && 'nav-link--active')}>
            {item.label}
            {item.showQueueCount && queue.length > 0 && <span className="count-badge">{queue.length}</span>}
          </NavLink>
        ))}
      </nav>

      <SearchBar
        id={GLOBAL_SEARCH_ID}
        className="header__search"
        value={query}
        onChange={setQuery}
        onSubmit={submitQuery}
        onFocus={jumpToHomeSearch}
        label="Search songs or artists"
        size="sm"
      />

      <div className="header__actions">
        <RoomButton size="sm" />
        <Button variant="primary" size="sm" icon="🎤" onClick={openKaraokeMode}>Karaoke Mode</Button>
      </div>
    </header>
  )
}
