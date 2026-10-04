import { useMemo } from 'react'
import { SearchBar } from '../components/songs/SearchBar'
import { SongGrid } from '../components/songs/SongGrid'
import { CategoryTiles } from '../components/songs/CategoryTiles'
import { QuickSearchChips } from '../components/songs/QuickSearchChips'
import { YouTubeResults, YouTubeSetupNotice } from '../components/songs/YouTubeResults'
import { HomeRoomQr } from '../components/room/HomeRoomQr'
import { Button, ButtonLink } from '../components/common/Button'
import { FlagPH } from '../components/common/Icon'
import { HOME_SEARCH_ID } from '../config/domIds'
import { useSearchQuery } from '../hooks/useSearchQuery'
import { useDebouncedValue } from '../hooks/useDebouncedValue'
import { useCategories, useInstantMatches, useSavedSongs } from '../hooks/useSongs'
import { useRecentSongs } from '../hooks/useRecentSongs'
import { useRecentSearches } from '../hooks/useRecentSearches'
import { useMediaQuery } from '../hooks/useMediaQuery'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { clearRecentSongs } from '../services/historyService'
import { getFeaturedArtists } from '../utils/artistLookup'
import { getSuggestions } from '../utils/suggestions'
import { vibes } from '../data/vibes'
import { practiceSongs } from '../data/practiceSongs'
import { BRAND, SEARCH_CONFIG } from '../config/appConfig'
import { pluralize } from '../utils/text'

const FEATURED_ARTISTS = getFeaturedArtists().map((a) => a.name)
const HERO_VIBES = vibes.slice(0, 6)

function SectionHeader({ id, eyebrow, title, count, action }) {
  return (
    <div className="section__header">
      <div>
        {eyebrow && <p className="section__eyebrow">{eyebrow}</p>}
        <h2 id={id} className="section__title">
          {title}
          {count != null && <span className="section__count">{pluralize(count, 'song')}</span>}
        </h2>
      </div>
      {action}
    </div>
  )
}

export default function Home() {
  const { query, setQuery, submitted, submitQuery } = useSearchQuery()
  const trimmed = query.trim()
  const instantQuery = useDebouncedValue(trimmed, SEARCH_CONFIG.debounceMs)
  const liveQuery = useDebouncedValue(trimmed, SEARCH_CONFIG.liveDebounceMs)
  const isSearching = trimmed.length > 0
  const instantMatches = useInstantMatches(instantQuery)
  const savedSongs = useSavedSongs('')
  const recentSongs = useRecentSongs()
  // Skip vibes already shown under the search box.
  const suggestions = useMemo(
    () => getSuggestions(recentSongs, { limit: 14 }).filter((s) => !HERO_VIBES.includes(s)).slice(0, 8),
    [recentSongs],
  )
  const narrow = useMediaQuery('(max-width: 560px)')
  const { categories } = useCategories()
  const recentSearches = useRecentSearches()
  useDocumentTitle(isSearching ? `“${trimmed}”` : null)

  // Typing: live search (debounced). Enter / a chip: a full search, right away.
  const youtubeQuery = submitted ? trimmed : liveQuery
  const typing = !submitted && trimmed !== liveQuery

  return (
    <div className="page page--home">
      <section className="hero" aria-labelledby="hero-title">
        <p className="hero__brand">
          <span aria-hidden="true">🎤</span> {BRAND.appName}
          <span className="hero__brand-tagline">
            <span className="hero__brand-sep" aria-hidden="true">·</span> {BRAND.tagline}
          </span>
        </p>
        <h1 id="hero-title" className="hero__title">
          What do you want to <span className="gradient-text">sing tonight?</span>
        </h1>
        <p className="hero__text">Type a song, an artist, or a vibe. Karaoke versions appear as you type.</p>
        <HomeRoomQr />
        <SearchBar
          id={HOME_SEARCH_ID}
          size="xl"
          variant="prompt"
          value={query}
          onChange={setQuery}
          onSubmit={submitQuery}
          loading={typing}
          label="Search songs"
          placeholder={narrow ? 'Song, artist, or vibe…' : 'Try “Buwan”, “Ben&Ben”, or “90s OPM love songs”'}
          className="hero__search"
        />
        {!isSearching && (
          <QuickSearchChips items={HERO_VIBES} onSelect={submitQuery} label="Vibes" variant="glow" className="hero__quick" />
        )}
      </section>

      {isSearching ? (
        <>
          {instantMatches.length > 0 && (
            <section className="section" aria-labelledby="instant-title">
              <SectionHeader id="instant-title" eyebrow="⚡ Instant" title="From your songs" count={instantMatches.length} />
              <SongGrid songs={instantMatches} label="Matching songs you sang or saved" />
            </section>
          )}
          <YouTubeResults
            query={youtubeQuery}
            mode={submitted ? 'full' : 'live'}
            onSubmit={() => submitQuery(query)}
          />
        </>
      ) : (
        <>
          <YouTubeSetupNotice />

          {recentSongs.length > 0 && (
            <section className="section" aria-labelledby="recent-songs-title">
              <SectionHeader
                id="recent-songs-title"
                eyebrow="🕘 Recently sung"
                title="Sing it again"
                count={recentSongs.length}
                action={<Button size="sm" variant="ghost" onClick={clearRecentSongs}>Clear</Button>}
              />
              <SongGrid songs={recentSongs} layout="row" label="Recently sung" />
            </section>
          )}

          <section className="section" aria-labelledby="for-you-title">
            <SectionHeader id="for-you-title" eyebrow="✨ For you" title="Suggested for you" />
            <QuickSearchChips items={suggestions} onSelect={submitQuery} label="Suggestions" variant="glow" />
          </section>

          <section className="section" aria-labelledby="practice-title">
            <SectionHeader id="practice-title" eyebrow="🎯 Karaoke Score" title="Sing for a score" />
            <p className="section__subtitle section__subtitle--spaced">
              With <strong>🎤 Auto-score</strong> on, every song you sing gets a Voice score — or try a practice track with a melody guide for a full Melody score.
            </p>
            <SongGrid songs={practiceSongs} layout="row" label="Practice tracks" />
          </section>

          {savedSongs.length > 0 && (
            <section className="section" aria-labelledby="my-songs-title">
              <SectionHeader
                id="my-songs-title"
                eyebrow="⭐ Saved"
                title="My Songs"
                count={savedSongs.length}
                action={<ButtonLink to="/categories/saved" size="sm" variant="ghost">See all →</ButtonLink>}
              />
              <SongGrid songs={savedSongs} layout="row" label="My saved songs" />
            </section>
          )}

          <section className="section" aria-labelledby="browse-title">
            <SectionHeader
              id="browse-title"
              eyebrow="🧭 Explore"
              title="Browse"
              action={<ButtonLink to="/opm" size="sm" variant="ghost">More OPM →</ButtonLink>}
            />
            <CategoryTiles categories={categories} compact />
          </section>

          <section className="section" aria-labelledby="artists-title">
            <SectionHeader id="artists-title" eyebrow={<><FlagPH /> OPM</>} title="OPM Artists" />
            <QuickSearchChips items={FEATURED_ARTISTS} onSelect={submitQuery} label="OPM artists" />
          </section>

          {recentSearches.length > 0 && (
            <section className="section" aria-labelledby="trending-title">
              <SectionHeader id="trending-title" eyebrow="🔥 Trending here" title="Recent searches" />
              <QuickSearchChips items={recentSearches} onSelect={submitQuery} label="Recent searches" />
            </section>
          )}
        </>
      )}
    </div>
  )
}
