import { useMemo } from 'react'
import { categories as categoryList } from '../data/categories'
import { searchSavedSongs } from '../services/songService'
import { useLibrarySongs } from './useLibrary'
import { useRecentSongs } from './useRecentSongs'

// My Songs matching a query (all saved songs when the query is empty).
export function useSavedSongs(query = '') {
  const library = useLibrarySongs()
  return useMemo(() => searchSavedSongs(query, library), [query, library])
}

// Instant matches from your own songs (My Songs + Recently sung), no
// network needed. Empty query → nothing.
export function useInstantMatches(query = '') {
  const library = useLibrarySongs()
  const recent = useRecentSongs()
  return useMemo(() => {
    if (!query.trim()) return []
    const byId = new Map()
    ;[...library, ...recent].forEach((song) => {
      if (!byId.has(song.id)) byId.set(song.id, song)
    })
    return searchSavedSongs(query, [...byId.values()])
  }, [query, library, recent])
}

// Browse categories, with the My Songs count kept up to date.
export function useCategories() {
  const library = useLibrarySongs()
  const categories = useMemo(
    () => categoryList.map((c) => ({ ...c, songCount: c.kind === 'saved' ? library.length : null })),
    [library],
  )
  return { categories }
}
