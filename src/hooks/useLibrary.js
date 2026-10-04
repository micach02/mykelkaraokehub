import { useCallback, useSyncExternalStore } from 'react'
import { getLibrarySongs, isSongSaved, removeSavedSong, saveSong, subscribeLibrary } from '../services/libraryService'
import { useToast } from '../context/ToastContext'

// Saved songs ("My Songs"). Re-renders when the library changes.
export function useLibrarySongs() {
  return useSyncExternalStore(subscribeLibrary, getLibrarySongs, getLibrarySongs)
}

export function useLibrary() {
  const songs = useLibrarySongs()
  const { show } = useToast()

  const isSaved = useCallback((songId) => songs.some((s) => s.id === songId), [songs])

  const toggleSave = useCallback((song) => {
    if (isSongSaved(song.id)) {
      removeSavedSong(song.id)
      show(`Removed “${song.title}” from My Songs`, { variant: 'info' })
    } else if (saveSong(song)) {
      show('★ Saved to My Songs')
    }
  }, [show])

  return { songs, isSaved, toggleSave }
}
