// Helpers for turning messy YouTube karaoke titles into clean song info, e.g.
//   "BUWAN - Juan Carlos Labajo (HD Karaoke)"  →  "Buwan" by "Juan Karlos"
// Shared with the karaoke server — no imports, plain functions.

const KARAOKE_PATTERN = /karaoke|videoke|minus[\s-]?one|instrumental|backing[\s-]?track|sing[\s-]?along|no[\s-]?vocals?|off[\s-]?vocal/i

const NOISE_PATTERN =
  /karaoke|videoke|version|lyrics?|instrumental|minus[\s-]?one|backing[\s-]?track|sing[\s-]?along|no[\s-]?vocals?|off[\s-]?vocal|\bhd\b|\bhq\b|\b4k\b|\bmv\b|official|audio|video|with\s+guide|key\s+of|lower\s+key|higher\s+key|\bkey\b/i

// True when a video looks like a karaoke/instrumental version (not the original song).
export function isLikelyKaraoke(title, channelTitle = '') {
  return KARAOKE_PATTERN.test(title) || KARAOKE_PATTERN.test(channelTitle)
}

export function cleanKaraokeTitle(raw) {
  let text = String(raw ?? '')
  // Drop bracketed noise: (Karaoke Version), [HD], 【Videoke】 …
  text = text.replace(/[([{【「][^)\]}】」]*[)\]}】」]/g, (segment) => (NOISE_PATTERN.test(segment) ? ' ' : segment))
  // Drop "| Karaoke …"-style trailing segments.
  text = text
    .split(/\s[|•｜]\s?|\s?[|•｜]\s/)
    .filter((part, index) => index === 0 || !NOISE_PATTERN.test(part))
    .join(' | ')
  // Drop leftover standalone noise words.
  text = text.replace(/\b(karaoke|videoke)(\s+version)?\b/gi, ' ').replace(/\bminus[\s-]?one\b/gi, ' ')
  text = text.replace(/\s{2,}/g, ' ').replace(/^[\s\-–—|:•]+|[\s\-–—|:•]+$/g, '').trim()
  return text || String(raw ?? '').trim()
}

// "BUWAN" → "Buwan". Leaves mixed-case text alone ("SB19", "IV of Spades").
export function tidyCase(text) {
  const value = String(text ?? '')
  const letters = value.replace(/[^\p{L}]/gu, '')
  if (letters.length < 3 || value !== value.toUpperCase()) return value
  return value.toLowerCase().replace(/(^|[\s(\-–—"'“‘/])(\p{L})/gu, (_, before, char) => before + char.toUpperCase())
}

// "Buwan - Juan Karlos" / "Juan Karlos - Buwan" / "Buwan by Juan Karlos"
//   → { title: 'Buwan', artist: 'Juan Karlos', isOPM: true }
// Only when one side is a known artist; otherwise null (we can't tell which
// side is which).
export function splitTitleAndArtist(text, findArtist) {
  const dashParts = text.split(/\s+[-–—|]\s+/)
  if (dashParts.length === 2) {
    const [left, right] = dashParts.map((p) => p.trim())
    const rightArtist = findArtist(right)
    if (rightArtist) return { title: left, artist: rightArtist.artist, isOPM: rightArtist.isOPM }
    const leftArtist = findArtist(left)
    if (leftArtist) return { title: right, artist: leftArtist.artist, isOPM: leftArtist.isOPM }
  }
  const byMatch = text.match(/^(.+?)\s+by\s+(.+)$/i)
  if (byMatch) {
    const artist = findArtist(byMatch[2].trim())
    if (artist) return { title: byMatch[1].trim(), artist: artist.artist, isOPM: artist.isOPM }
  }
  return null
}
