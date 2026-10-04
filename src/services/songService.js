// Song lookups that don't need YouTube: searching My Songs (saved on this
// device) and the browse categories. YouTube search lives in youtubeService.
//
// The async functions are the "API" the UI uses, so they can later be backed
// by a real backend (e.g. Laravel + MySQL) without changing components.

import { categories as categoryList } from '../data/categories'
import { getLibrarySongs } from './libraryService'
import { normalizeText, compactText, looseText } from '../utils/text'

const categoryById = new Map(categoryList.map((c) => [c.id, c]))

function buildEntry(song) {
  const fields = {
    title: normalizeText(song.title),
    artist: normalizeText(song.artist),
    extra: normalizeText([song.channel, song.isOPM ? 'OPM' : ''].join(' ')),
  }
  const all = `${fields.title} ${fields.artist} ${fields.extra}`
  // Space-free variants so "benben", "benandben", and "Ben&Ben" all match.
  const artistVariants = [compactText(song.artist), looseText(song.artist)]
  const compact = [all.replace(/ /g, ''), looseText(song.title), ...artistVariants].join('|')
  return { song, fields, all, compact, artistVariants }
}

// Indexed lazily and cached per song object (the library creates new objects
// whenever it changes).
const indexCache = new WeakMap()
function entryFor(song) {
  let entry = indexCache.get(song)
  if (!entry) {
    entry = buildEntry(song)
    indexCache.set(song, entry)
  }
  return entry
}

function scoreEntry(entry, tokens, compactQuery, normalizedQuery) {
  const allTokensMatch = tokens.every((t) => entry.all.includes(t))
  if (!allTokensMatch && !entry.compact.includes(compactQuery)) return 0

  let score = 1
  const { title, artist } = entry.fields
  if (title === normalizedQuery) score += 100
  else if (title.startsWith(normalizedQuery)) score += 60
  else if (title.includes(normalizedQuery)) score += 40
  if (artist === normalizedQuery) score += 80
  else if (artist.startsWith(normalizedQuery)) score += 50
  else if (artist.includes(normalizedQuery) || entry.artistVariants.some((v) => v.includes(compactQuery))) score += 30
  return score
}

// Instant search over My Songs. Empty query → all saved songs.
export function searchSavedSongs(query, songs = getLibrarySongs()) {
  const normalizedQuery = normalizeText(query)
  if (!normalizedQuery) return songs
  const tokens = normalizedQuery.split(' ')
  const compactQuery = normalizedQuery.replace(/ /g, '')
  return songs
    .map((song) => ({ song, score: scoreEntry(entryFor(song), tokens, compactQuery, normalizedQuery) }))
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((r) => r.song)
}

export async function getCategories() {
  const savedCount = getLibrarySongs().length
  return categoryList.map((c) => ({ ...c, songCount: c.kind === 'saved' ? savedCount : null }))
}

export function getCategoryById(id) {
  return categoryById.get(id) ?? null
}

// Categories hidden from menus while they have nothing to show.
export function isCategoryVisible(category) {
  return !(category.hideWhenEmpty && category.songCount === 0)
}
