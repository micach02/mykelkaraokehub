import { useMemo, useState } from 'react'
import { SearchBar } from './SearchBar'
import { SongGrid } from './SongGrid'
import { YouTubeResults } from './YouTubeResults'
import { QuickSearchChips } from './QuickSearchChips'
import { useInstantMatches, useSavedSongs } from '../../hooks/useSongs'
import { useRecentSongs } from '../../hooks/useRecentSongs'
import { useDebouncedValue } from '../../hooks/useDebouncedValue'
import { getSuggestions } from '../../utils/suggestions'
import { SEARCH_CONFIG } from '../../config/appConfig'

// Search-and-add panel used inside Karaoke Mode, so singers can add songs
// without leaving the TV view. Results appear as you type.
export function SongPicker() {
  const [query, setQuery] = useState('')
  // The query the user pressed Enter on (or picked) — searched in full.
  const [submittedQuery, setSubmittedQuery] = useState('')
  const trimmed = query.trim()
  const instantQuery = useDebouncedValue(trimmed, SEARCH_CONFIG.debounceMs)
  const liveQuery = useDebouncedValue(trimmed, SEARCH_CONFIG.liveDebounceMs)
  const submitted = Boolean(submittedQuery) && submittedQuery === trimmed
  const instantMatches = useInstantMatches(instantQuery)
  const recentSongs = useRecentSongs()
  const savedSongs = useSavedSongs('')
  const suggestions = useMemo(() => getSuggestions(recentSongs), [recentSongs])

  const searchFor = (text) => {
    setQuery(text)
    setSubmittedQuery(text.trim())
  }

  return (
    <div className="song-picker">
      <SearchBar
        value={query}
        onChange={setQuery}
        onSubmit={(value) => setSubmittedQuery(value.trim())}
        size="lg"
        variant="prompt"
        loading={!submitted && trimmed !== liveQuery}
        autoFocus
        label="Search songs to add"
        placeholder="Song, artist, or vibe…"
      />

      {!trimmed && (
        <>
          <QuickSearchChips items={suggestions} onSelect={searchFor} label="Suggestions" variant="glow" />
          {recentSongs.length > 0 && (
            <>
              <p className="song-picker__hint">🕘 Recently sung</p>
              <SongGrid songs={recentSongs.slice(0, 12)} layout="list" label="Recently sung" />
            </>
          )}
          {savedSongs.length > 0 && (
            <>
              <p className="song-picker__hint">⭐ My Songs</p>
              <SongGrid songs={savedSongs} layout="list" label="Saved songs" />
            </>
          )}
        </>
      )}

      {trimmed && instantMatches.length > 0 && (
        <>
          <p className="song-picker__hint">⚡ From your songs</p>
          <SongGrid songs={instantMatches} layout="list" label="Matching songs you sang or saved" />
        </>
      )}

      {trimmed && (
        <YouTubeResults
          query={submitted ? trimmed : liveQuery}
          mode={submitted ? 'full' : 'live'}
          onSubmit={() => setSubmittedQuery(trimmed)}
          layout="list"
        />
      )}
    </div>
  )
}
