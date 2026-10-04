// Shared with the karaoke server, so imports use explicit .js extensions.
import { artists } from '../data/artists.js'
import { looseText } from './text.js'

const byName = new Map()
artists.forEach((artist) => {
  const entry = { artist: artist.name, isOPM: artist.isOPM }
  ;[artist.name, ...artist.aliases].forEach((name) => {
    const key = looseText(name)
    if (key && !byName.has(key)) byName.set(key, entry)
  })
})

// "juan carlos labajo" → { artist: 'Juan Karlos', isOPM: true }, or null.
export function findKnownArtist(name) {
  return byName.get(looseText(name)) ?? null
}

export function getFeaturedArtists() {
  return artists.filter((a) => a.featured)
}
