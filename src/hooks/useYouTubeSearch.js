import { useEffect, useRef, useState } from 'react'
import { searchKaraokeSongs } from '../services/youtubeService'
import { refreshServerStatus } from './useServerStatus'
import { SEARCH_CONFIG } from '../config/appConfig'

const IDLE = { query: '', results: null, isLoading: false, error: null, derived: false, liveLimited: false }

/**
 * YouTube karaoke search through the karaoke server.
 *
 * mode: 'live' (as you type — pass a debounced query), 'full' (the user asked:
 * Enter, a category, a suggestion), or 'cache' (never spends quota).
 *
 * While a new query loads, the previous results stay visible (isStale) so the
 * list doesn't flash empty between keystrokes.
 */
export function useYouTubeSearch(query, { mode = 'full' } = {}) {
  const q = query.trim()
  const searchable = q.length >= SEARCH_CONFIG.minQueryLength
  const [state, setState] = useState(IDLE)
  const [attempt, setAttempt] = useState(0)
  const lastResults = useRef(null)

  useEffect(() => {
    if (!searchable) {
      lastResults.current = null
      setState(IDLE)
      return undefined
    }
    const controller = new AbortController()
    setState((s) => ({ ...s, query: q, isLoading: true, error: null, liveLimited: false }))
    searchKaraokeSongs(q, { mode, signal: controller.signal }).then(
      ({ results, derived, liveLimited }) => {
        if (results) lastResults.current = results
        setState({ query: q, results, isLoading: false, error: null, derived, liveLimited })
      },
      (error) => {
        if (error.name === 'AbortError') return
        setState({ ...IDLE, query: q, error })
        // Quota or setup problems change what the UI should offer.
        if (['quota', 'not-configured'].includes(error.code)) refreshServerStatus()
      },
    )
    return () => controller.abort()
  }, [q, searchable, mode, attempt])

  const current = state.query === q
  const fresh = current && !state.isLoading
  const results = fresh ? state.results : lastResults.current
  return {
    searchable,
    results: results ?? null,
    hasResults: Array.isArray(results),
    // Showing the previous query's results while the new ones load.
    isStale: !fresh && Array.isArray(lastResults.current),
    isLoading: searchable && (!current || state.isLoading),
    error: current ? state.error : null,
    derived: fresh && state.derived,
    liveLimited: fresh && state.liveLimited,
    retry: () => setAttempt((n) => n + 1),
  }
}
