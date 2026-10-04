import { lazy, Suspense } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { KaraokeProvider } from './context/KaraokeContext'
import { RoomHostProvider } from './context/RoomContext'
import { ScoringProvider } from './context/ScoringContext'
import { ToastProvider } from './context/ToastContext'
import { MainLayout } from './components/layout/MainLayout'
import { Loading } from './components/common/Loading'
import Home from './pages/Home'

// Home is in the main bundle for a fast first paint; other pages load on demand.
const OPM = lazy(() => import('./pages/OPM'))
const Categories = lazy(() => import('./pages/Categories'))
const QueuePage = lazy(() => import('./pages/QueuePage'))
const Karaoke = lazy(() => import('./pages/Karaoke'))
const NotFound = lazy(() => import('./pages/NotFound'))
const Remote = lazy(() => import('./pages/Remote'))

// The TV/PC app: player, queue, the host side of phone-remote rooms, and
// optional karaoke scoring.
function TvApp() {
  return (
    <KaraokeProvider>
      <RoomHostProvider>
        <ScoringProvider>
          <MainLayout />
        </ScoringProvider>
      </RoomHostProvider>
    </KaraokeProvider>
  )
}

// The folder the app is served from: '/' locally, '/mykelkaraokehub' on GitHub Pages.
const ROUTER_BASENAME = import.meta.env.BASE_URL.replace(/\/+$/, '') || '/'

export default function App() {
  return (
    <BrowserRouter basename={ROUTER_BASENAME}>
      <ToastProvider>
        <Routes>
          {/* Phone remote: its own lightweight page, no player. */}
          <Route
            path="remote/:code"
            element={
              <Suspense fallback={<Loading fullscreen label="Joining the karaoke room…" />}>
                <Remote />
              </Suspense>
            }
          />
          <Route element={<TvApp />}>
            <Route index element={<Home />} />
            <Route path="opm" element={<OPM />} />
            <Route path="categories" element={<Categories />} />
            <Route path="categories/:categoryId" element={<Categories />} />
            <Route path="queue" element={<QueuePage />} />
            <Route path="karaoke" element={<Karaoke />} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </ToastProvider>
    </BrowserRouter>
  )
}
