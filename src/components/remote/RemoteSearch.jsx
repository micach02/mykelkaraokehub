import { useMemo, useState } from 'react'
import { SearchBar } from '../songs/SearchBar'
import { QuickSearchChips } from '../songs/QuickSearchChips'
import { YouTubeSetupNotice } from '../songs/YouTubeResults'
import { RemoteSongRow } from './RemoteSongRow'
import { useYouTubeSearch } from '../../hooks/useYouTubeSearch'
import { useDebouncedValue } from '../../hooks/useDebouncedValue'
import { useRecentSearches } from '../../hooks/useRecentSearches'
import { searchSavedSongs } from '../../services/songService'
import { getFeaturedArtists } from '../../utils/artistLookup'
import { getSuggestions } from '../../utils/suggestions'
import { SEARCH_CONFIG } from '../../config/appConfig'
import { cx } from '../../utils/classNames'
import { FlagPH } from '../common/Icon'

const FEATURED_ARTISTS = getFeaturedArtists().map((a) => a.name)
const EMPTY = []
// Keep the first screen short: a few of each, the rest one tap away.
const SUGGESTIONS_SHOWN = 6
const ARTISTS_SHOWN = 8
const TRENDING_SHOWN = 8

function SongList({ songs, label, songState, onAdd, disabled, stale }) {
  return (
    <ul className={cx('remote-list', stale && 'remote-list--stale')} aria-label={label}>
      {songs.map((song) => (
        <RemoteSongRow key={song.id} song={song} state={songState(song)} onAdd={onAdd} disabled={disabled} />
      ))}
    </ul>
  )
}

function RowSkeletons({ count = 4 }) {
  return (
    <div className="remote-list" role="status" aria-label="Searching YouTube">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="remote-song remote-song--skeleton" aria-hidden="true">
          <span className="skeleton remote-song__thumb" />
          <span className="remote-song__text">
            <span className="skeleton skeleton--line" />
            <span className="skeleton skeleton--line skeleton--short" />
          </span>
        </div>
      ))}
    </div>
  )
}

// Search tab of the phone remote. Results appear as you type (live search);
// Search ↵ forces a fresh YouTube search.
// sungSongs: what this person sang (not everyone's), for one-tap re-adding.
export function RemoteSearch({ savedSongs = EMPTY, sungSongs = EMPTY, singerName = '', songState, onAdd, disabled }) {
  const [query, setQuery] = useState('')
  const [submittedQuery, setSubmittedQuery] = useState('')
  const trimmed = query.trim()
  const instantQuery = useDebouncedValue(trimmed, SEARCH_CONFIG.debounceMs)
  const liveQuery = useDebouncedValue(trimmed, SEARCH_CONFIG.liveDebounceMs)
  const submitted = Boolean(submittedQuery) && submittedQuery === trimmed
  const youtube = useYouTubeSearch(submitted ? trimmed : liveQuery, { mode: submitted ? 'full' : 'live' })
  const recentSearches = useRecentSearches()
  const suggestions = useMemo(() => getSuggestions(sungSongs, { limit: SUGGESTIONS_SHOWN }), [sungSongs])
  const [allArtists, setAllArtists] = useState(false)
  const artists = allArtists ? FEATURED_ARTISTS : FEATURED_ARTISTS.slice(0, ARTISTS_SHOWN)

  // Instant matches from your sung songs + the TV's saved songs (no network).
  const instantMatches = useMemo(() => {
    if (!instantQuery) return EMPTY
    const byId = new Map()
    ;[...sungSongs, ...savedSongs].forEach((song) => byId.has(song.id) || byId.set(song.id, song))
    return searchSavedSongs(instantQuery, [...byId.values()])
  }, [instantQuery, savedSongs, sungSongs])

  const searchFor = (text) => {
    setQuery(text)
    setSubmittedQuery(text.trim())
  }
  const listProps = { songState, onAdd, disabled }
  const waiting = !submitted && trimmed !== liveQuery

  return (
    <div className="remote-search">
      <SearchBar
        value={query}
        onChange={setQuery}
        onSubmit={(value) => setSubmittedQuery(value.trim())}
        size="lg"
        variant="prompt"
        loading={waiting || youtube.isLoading}
        label="Search songs"
        placeholder="Song, artist, or vibe…"
      />

      {!trimmed && (
        <>
          <QuickSearchChips items={suggestions} onSelect={searchFor} label="Suggestions" variant="glow" />
          <h2 className="remote-heading">🕘 Recently sung{singerName ? ` by ${singerName}` : ''}</h2>
          {sungSongs.length > 0 ? (
            <SongList songs={sungSongs} label="Your recently sung songs" {...listProps} />
          ) : (
            <p className="remote-hint">Songs you sing show up here, so you can add them again in one tap.</p>
          )}
          {savedSongs.length > 0 && (
            <>
              <h2 className="remote-heading">⭐ Saved on the TV</h2>
              <SongList songs={savedSongs} label="Saved songs" {...listProps} />
            </>
          )}
          <h2 className="remote-heading"><FlagPH /> OPM artists</h2>
          <QuickSearchChips items={artists} onSelect={searchFor} label="OPM artists" />
          {FEATURED_ARTISTS.length > ARTISTS_SHOWN && (
            <button type="button" className="remote-more" onClick={() => setAllArtists((all) => !all)} aria-expanded={allArtists}>
              {allArtists ? 'Fewer artists ▴' : `More artists (${FEATURED_ARTISTS.length - ARTISTS_SHOWN}) ▾`}
            </button>
          )}
          {recentSearches.length > 0 && (
            <>
              <h2 className="remote-heading">🔥 Trending here</h2>
              <QuickSearchChips items={recentSearches.slice(0, TRENDING_SHOWN)} onSelect={searchFor} label="Recent searches" />
            </>
          )}
        </>
      )}

      {trimmed && instantMatches.length > 0 && (
        <>
          <h2 className="remote-heading">⚡ From your songs</h2>
          <SongList songs={instantMatches} label="Matching songs" {...listProps} />
        </>
      )}

      {trimmed.length >= SEARCH_CONFIG.minQueryLength && (
        <>
          <h2 className="remote-heading">
            ▶ Karaoke on YouTube {youtube.isLoading && <span className="live-dot" aria-hidden="true" />}
          </h2>
          {youtube.isLoading && !youtube.hasResults && <RowSkeletons />}
          {youtube.error && !youtube.isLoading && (
            <p className="notice notice--error" role="alert">{youtube.error.message}</p>
          )}
          {youtube.hasResults && (youtube.results.length > 0 ? (
            <SongList songs={youtube.results} label="YouTube karaoke results" stale={youtube.isStale} {...listProps} />
          ) : (
            <p className="notice">No karaoke versions found. Try the title plus the artist.</p>
          ))}
          {!youtube.hasResults && !youtube.isLoading && !youtube.error && !waiting && (
            <>
              <YouTubeSetupNotice />
              <button type="button" className="remote-search__go" onClick={() => setSubmittedQuery(trimmed)}>
                🔍 Search YouTube for “{trimmed}”
              </button>
            </>
          )}
          {youtube.derived && (
            <button type="button" className="remote-search__more" onClick={() => setSubmittedQuery(trimmed)}>
              Not it? Search YouTube for more
            </button>
          )}
        </>
      )}
    </div>
  )
}
