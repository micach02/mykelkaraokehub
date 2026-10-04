import { useEffect, useState } from 'react'
import { getRecentSearches } from '../services/youtubeService'

// Songs people searched recently on this karaoke server (free to repeat).
export function useRecentSearches() {
  const [queries, setQueries] = useState([])
  useEffect(() => {
    const controller = new AbortController()
    getRecentSearches({ signal: controller.signal }).then(setQueries, () => {})
    return () => controller.abort()
  }, [])
  return queries
}
