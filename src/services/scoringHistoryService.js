// Recent karaoke scores and personal bests, stored on this device.
// Small synchronous store (read with useSyncExternalStore).

import { getItem, setItem, STORAGE_KEYS } from './storageService'
import { SCORING_HISTORY } from '../config/scoringConfig'

const listeners = new Set()
let state = load()

function load() {
  const raw = getItem(STORAGE_KEYS.scoreHistory, null)
  const recent = Array.isArray(raw?.recent) ? raw.recent.filter((r) => typeof r?.songId === 'string' && Number.isFinite(r.score)) : []
  const bests = raw?.bests && typeof raw.bests === 'object' ? raw.bests : {}
  return { recent, bests }
}

function commit(next) {
  state = next
  setItem(STORAGE_KEYS.scoreHistory, state)
  listeners.forEach((listener) => listener())
}

export function getScoreHistory() {
  return state
}

export function subscribeScoreHistory(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function getPersonalBest(songId) {
  return state.bests[songId] ?? null
}

export function getLastScore(songId) {
  return state.recent.find((r) => r.songId === songId) ?? null
}

/**
 * Saves a performance. Returns { isPersonalBest, previousBest }.
 * performance: { songId, songTitle, artist, score, grade, mode }
 */
export function recordPerformance(performance) {
  const entry = { ...performance, date: new Date().toISOString() }
  const previous = state.bests[entry.songId] ?? null
  const isPersonalBest = !previous || entry.score > previous.score
  commit({
    recent: [entry, ...state.recent].slice(0, SCORING_HISTORY.maxRecent),
    bests: isPersonalBest ? { ...state.bests, [entry.songId]: entry } : state.bests,
  })
  return { isPersonalBest, previousBest: previous }
}

// For tests.
export function __reloadScoreHistoryForTests() {
  state = load()
  listeners.forEach((listener) => listener())
}
