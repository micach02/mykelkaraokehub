// Generated cover art for songs without a thumbnail. Deterministic per song,
// so the same song always gets the same colors.

const PALETTES = [
  ['#ff4d94', '#7b3fe4'],
  ['#ffb648', '#e0267a'],
  ['#30c5ff', '#5b3fe4'],
  ['#ff6b5a', '#8f2bd1'],
  ['#2fd6a3', '#2459d6'],
  ['#fcd116', '#ce1126'],
  ['#0038a8', '#ff4d94'],
  ['#b06bff', '#ff8a4c'],
]

function hashString(value) {
  let hash = 0
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) | 0
  }
  return Math.abs(hash)
}

export function getArtworkStyle(seed) {
  const hash = hashString(String(seed))
  const [from, to] = PALETTES[hash % PALETTES.length]
  const angle = 120 + (hash % 120)
  return { background: `linear-gradient(${angle}deg, ${from}, ${to})` }
}

export function getInitials(title) {
  const words = String(title).replace(/[^\p{L}\p{N} ]/gu, ' ').split(/\s+/).filter(Boolean)
  return words.slice(0, 2).map((w) => w[0].toUpperCase()).join('') || '♪'
}
