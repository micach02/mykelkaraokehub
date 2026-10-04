import { vibes } from '../data/vibes'
import { findKnownArtist } from './artistLookup'

/**
 * "Suggested for you": simple, explainable picks — no AI service involved.
 * Artists you sang recently ("More from Juan Karlos"), then vibe prompts.
 * Returns [{ label, query }].
 */
export function getSuggestions(recentSongs = [], { limit = 8 } = {}) {
  const counts = new Map()
  recentSongs.slice(0, 20).forEach((song, index) => {
    const known = findKnownArtist(song.artist)
    if (!known) return // only real artists, not channel names
    // Recent picks weigh more than older ones.
    counts.set(known.artist, (counts.get(known.artist) ?? 0) + (20 - index))
  })
  const fromArtists = [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([artist]) => ({ label: `✨ More ${artist}`, query: artist }))
  return [...fromArtists, ...vibes].slice(0, limit)
}
