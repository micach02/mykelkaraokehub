import { useEffect, useState } from 'react'

export function useMediaQuery(query) {
  const getMatch = () => typeof window !== 'undefined' && window.matchMedia?.(query).matches === true
  const [matches, setMatches] = useState(getMatch)
  useEffect(() => {
    const mql = window.matchMedia?.(query)
    if (!mql) return undefined
    const onChange = () => setMatches(mql.matches)
    onChange()
    mql.addEventListener('change', onChange)
    return () => mql.removeEventListener('change', onChange)
  }, [query])
  return matches
}
