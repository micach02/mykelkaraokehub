// "Recently sung": every song picked on this TV (Play or Queue, including
// from phones), newest first. One tap to sing it again — no search, no quota.
//
// Same small synchronous store pattern as libraryService (read with
// useSyncExternalStore). Stored on this device via storageService.

import { getItem, setItem, removeItem, STORAGE_KEYS } from './storageService'

const MAX_RECENT_SONGS = 40
const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/

const listeners = new Set()
let songs = load()

function isSong(value) {
  return Boolean(value) && typeof value.id === 'string' && typeof value.title === 'string' && VIDEO_ID.test(value.youtubeVideoId ?? '')
}

function load() {
  const raw = getItem(STORAGE_KEYS.recentSongs, [])
  return Array.isArray(raw) ? raw.filter(isSong) : []
}

function commit(next) {
  songs = next
  setItem(STORAGE_KEYS.recentSongs, songs)
  listeners.forEach((listener) => listener())
}

export function getRecentSongs() {
  return songs
}

export function subscribeRecentSongs(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

// Moves the song to the front (no duplicates).
export function recordSong(song) {
  if (!isSong(song)) return
  if (songs[0]?.id === song.id) return
  const { isSaved, savedAt, ...rest } = song
  commit([{ ...rest, pickedAt: Date.now() }, ...songs.filter((s) => s.id !== song.id)].slice(0, MAX_RECENT_SONGS))
}

export function clearRecentSongs() {
  songs = []
  removeItem(STORAGE_KEYS.recentSongs)
  listeners.forEach((listener) => listener())
}

// For tests.
export function __reloadRecentSongsForTests() {
  songs = load()
  listeners.forEach((listener) => listener())
}
