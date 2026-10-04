import { useCallback } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'

// The global search lives in the URL (/?q=buwan) so results can be shared,
// bookmarked, and survive a refresh. Searching from any page jumps to the Home
// results.
//
//   setQuery(text)     typing: instant catalog search, YouTube untouched
//   submitQuery(text)  Enter: also searches YouTube (adds &yt=1)
export function useSearchQuery() {
  const [params] = useSearchParams()
  const location = useLocation()
  const navigate = useNavigate()
  const onHome = location.pathname === '/'
  const query = onHome ? params.get('q') ?? '' : ''
  const submitted = onHome && params.get('yt') === '1' && query.trim().length > 0

  const update = useCallback((next, { submit = false } = {}) => {
    const search = new URLSearchParams(onHome ? location.search : '')
    if (next) search.set('q', next)
    else search.delete('q')
    if (submit && next?.trim()) search.set('yt', '1')
    else search.delete('yt')
    const qs = search.toString()
    navigate({ pathname: '/', search: qs ? `?${qs}` : '' }, { replace: onHome })
  }, [onHome, location.search, navigate])

  const setQuery = useCallback((next) => update(next), [update])
  const submitQuery = useCallback((next = query) => update(next, { submit: true }), [update, query])

  return { query, setQuery, submitted, submitQuery }
}
