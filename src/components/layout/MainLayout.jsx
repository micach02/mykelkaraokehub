import { Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { Header } from './Header'
import { GLOBAL_SEARCH_ID, HOME_SEARCH_ID } from '../../config/domIds'
import { Sidebar } from './Sidebar'
import { MobileNav } from './MobileNav'
import { MiniPlayerBar } from './MiniPlayerBar'
import { PlayerStage } from '../karaoke/PlayerStage'
import { Queue } from '../karaoke/Queue'
import { SongPicker } from '../songs/SongPicker'
import { RoomPanel } from '../room/RoomPanel'
import { ScoringFlow } from '../scoring/ScoringFlow'
import { Modal } from '../common/Modal'
import { Loading } from '../common/Loading'
import { useKaraokeActions, useKaraokeState } from '../../context/KaraokeContext'
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts'
import { useIdle } from '../../hooks/useIdle'
import { exitFullscreen, getFullscreenElement } from '../../utils/fullscreen'
import { cx } from '../../utils/classNames'

// App shell. The player is rendered here, in the same tree position on every
// page, so it never remounts: navigating or entering Karaoke Mode only changes
// layout classes around it.
export function MainLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  const isKaraokeMode = location.pathname === '/karaoke'
  const rootRef = useRef(null)
  const [queueOpen, setQueueOpen] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)
  const { isPlaying, currentSong, queue, lastPlayedSong } = useKaraokeState()
  // Fresh visit with nothing to play: hide the empty player so the search
  // comes first. It stays mounted (just hidden) and reappears when a song is
  // picked, or after a song ends (to show "Queue is empty").
  const stageHidden = !isKaraokeMode && !currentSong && queue.length === 0 && !lastPlayedSong
  const actions = useKaraokeActions()
  const controlsHidden = useIdle(4000, isKaraokeMode && isPlaying && !queueOpen && !pickerOpen)

  const openQueue = useCallback(() => setQueueOpen(true), [])
  const openPicker = useCallback(() => setPickerOpen(true), [])

  // Close sheets when the page changes, and leave app-level fullscreen when
  // leaving Karaoke Mode.
  useEffect(() => {
    setQueueOpen(false)
    setPickerOpen(false)
    if (!isKaraokeMode && getFullscreenElement() === document.documentElement) exitFullscreen()
  }, [location.pathname, isKaraokeMode])

  const browse = useCallback(() => {
    setQueueOpen(false)
    if (isKaraokeMode) {
      setPickerOpen(true)
      return
    }
    navigate('/')
    window.requestAnimationFrame(() => {
      const input = document.getElementById(HOME_SEARCH_ID) ?? document.getElementById(GLOBAL_SEARCH_ID)
      input?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      input?.focus({ preventScroll: true })
    })
  }, [isKaraokeMode, navigate])

  useKeyboardShortcuts({
    '/': () => {
      const input = document.getElementById(GLOBAL_SEARCH_ID)
      if (input && input.offsetParent !== null) input.focus()
      else browse()
    },
    ...(isKaraokeMode && {
      space: actions.togglePlay,
      k: actions.togglePlay,
      n: actions.skipSong,
      f: () => actions.toggleFullscreen(document.documentElement),
      q: openQueue,
      a: openPicker,
      escape: () => navigate('/'),
    }),
  })

  return (
    <div
      ref={rootRef}
      className={cx('app', isKaraokeMode && 'app--karaoke', controlsHidden && 'app--controls-hidden', stageHidden && 'app--stage-hidden')}
    >
      <a href="#main" className="skip-link">Skip to content</a>
      {!isKaraokeMode && <Header />}

      <div className="app__top">
        <PlayerStage isKaraokeMode={isKaraokeMode} onBrowse={browse} />
        {!isKaraokeMode && <Sidebar onBrowse={browse} />}
      </div>

      <main id="main" className="app__main" tabIndex={-1}>
        <Suspense fallback={<Loading label="Loading…" />}>
          <Outlet context={{ openQueue, openPicker }} />
        </Suspense>
      </main>

      {!isKaraokeMode && <MiniPlayerBar onOpenQueue={openQueue} />}
      {!isKaraokeMode && <MobileNav />}

      <Modal open={queueOpen} onClose={() => setQueueOpen(false)} title="Queue" variant="sheet">
        <Queue variant="sheet" onBrowse={browse} />
      </Modal>
      <Modal open={pickerOpen} onClose={() => setPickerOpen(false)} title="Add songs" className="modal--wide">
        <SongPicker />
      </Modal>
      <RoomPanel />
      <ScoringFlow />
    </div>
  )
}
