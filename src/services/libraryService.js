// "My Songs": karaoke videos the user saved from YouTube search, so they are
// always available without spending YouTube search quota again.
//
// Stored on this device via storageService. It's a small synchronous store
// (getLibrarySongs + subscribeLibrary) so React can read it with
// useSyncExternalStore. To share the list across devices later, back these
// functions with your API and keep this module as the local cache.

import { getItem, setItem, STORAGE_KEYS } from './storageService'

const MAX_SAVED_SONGS = 500

const listeners = new Set()
let songs = load()

function isSong(value) {
  return Boolean(value) && typeof value.id === 'string' && typeof value.title === 'string' && /^[A-Za-z0-9_-]{11}$/.test(value.youtubeVideoId ?? '')
}

function load() {
  const raw = getItem(STORAGE_KEYS.library, [])
  return Array.isArray(raw) ? raw.filter(isSong) : []
}

function commit(next) {
  songs = next
  setItem(STORAGE_KEYS.library, songs)
  listeners.forEach((listener) => listener())
}

// Returns the same array reference until something changes.
export function getLibrarySongs() {
  return songs
}

export function subscribeLibrary(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function isSongSaved(songId) {
  return songs.some((s) => s.id === songId)
}

// Returns false if the song was already saved.
export function saveSong(song) {
  if (!isSong(song) || isSongSaved(song.id)) return false
  const saved = { ...song, isSaved: true, category: 'My Songs', savedAt: Date.now() }
  commit([saved, ...songs].slice(0, MAX_SAVED_SONGS))
  return true
}

export function removeSavedSong(songId) {
  if (!isSongSaved(songId)) return false
  commit(songs.filter((s) => s.id !== songId))
  return true
}

// For tests.
export function __reloadLibraryForTests() {
  songs = load()
  listeners.forEach((listener) => listener())
}
