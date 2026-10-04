import { useNavigate } from 'react-router-dom'
import { CategoryTiles } from '../components/songs/CategoryTiles'
import { QuickSearchChips } from '../components/songs/QuickSearchChips'
import { YouTubeSetupNotice } from '../components/songs/YouTubeResults'
import { FlagPH } from '../components/common/Icon'
import { useCategories } from '../hooks/useSongs'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { artists } from '../data/artists'

const OPM_ARTISTS = artists.filter((a) => a.isOPM).map((a) => a.name)

export default function OPM() {
  useDocumentTitle('OPM')
  const navigate = useNavigate()
  const { categories } = useCategories()
  const opmCategories = categories.filter((c) => c.featured || c.opm)
  const searchArtist = (name) => navigate(`/?${new URLSearchParams({ q: name, yt: '1' })}`)

  return (
    <div className="page page--opm">
      <section className="page-banner page-banner--opm">
        <p className="eyebrow"><FlagPH /> Original Pilipino Music</p>
        <h1 className="page-banner__title">OPM</h1>
        <p className="page-banner__text">From Eraserheads to Ben&amp;Ben — the songs every Filipino barkada knows by heart.</p>
      </section>

      <YouTubeSetupNotice />

      <section className="section" aria-labelledby="opm-browse-title">
        <h2 id="opm-browse-title" className="section__title">Browse OPM</h2>
        <CategoryTiles categories={opmCategories} />
      </section>

      <section className="section" aria-labelledby="opm-artists-title">
        <h2 id="opm-artists-title" className="section__title">OPM Artists</h2>
        <p className="section__subtitle section__subtitle--spaced">Tap an artist to find their karaoke songs.</p>
        <QuickSearchChips items={OPM_ARTISTS} onSelect={searchArtist} label="OPM artists" />
      </section>
    </div>
  )
}
