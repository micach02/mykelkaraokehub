// Tonight's party leaderboard: every scored song with the singer's name.
// Kept on the TV; entries older than PARTY_HOURS drop off by themselves.

import { useSyncExternalStore } from 'react'
import { getItem, setItem, STORAGE_KEYS } from './storageService'

const PARTY_HOURS = 12
const MAX_ENTRIES = 200

let entries = load()
const listeners = new Set()
const notify = () => listeners.forEach((listener) => listener())

function load(now = Date.now()) {
  const saved = getItem(STORAGE_KEYS.partyScores, [])
  if (!Array.isArray(saved)) return []
  return saved.filter((e) => e && typeof e.score === 'number' && typeof e.at === 'number' && now - e.at < PARTY_HOURS * 3600 * 1000)
}

// Best first; an earlier score wins a tie.
const byScore = (a, b) => b.score - a.score || a.at - b.at

// { singer, songTitle, score, grade, emoji } → { entry, rank, total }
export function recordPartyScore({ singer, songTitle, score, grade, emoji }, now = Date.now()) {
  const entry = { id: `${now}-${Math.random().toString(36).slice(2, 7)}`, singer: singer || 'TV', songTitle, score, grade, emoji, at: now }
  entries = [...load(now), entry].slice(-MAX_ENTRIES)
  setItem(STORAGE_KEYS.partyScores, entries)
  notify()
  const ranked = [...entries].sort(byScore)
  return { entry, rank: ranked.findIndex((e) => e.id === entry.id) + 1, total: ranked.length }
}

export function getLeaderboard(limit = 10) {
  return [...entries].sort(byScore).slice(0, limit)
}

export function clearLeaderboard() {
  entries = []
  setItem(STORAGE_KEYS.partyScores, [])
  notify()
}

const subscribe = (listener) => {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function usePartyScores() {
  return useSyncExternalStore(subscribe, () => entries, () => entries)
}

// For tests.
export function __reloadLeaderboardForTests() {
  entries = load()
  notify()
}
