// Lowercase, strip accents, and turn "&" into "and" so searches like
// "ben and ben", "benben", and "Ben&Ben" all find the same artist.
export function normalizeText(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

// Same as normalizeText, without spaces. Used for loose matching.
export function compactText(value) {
  return normalizeText(value).replace(/ /g, '')
}

export function pluralize(count, singular, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`
}

// YouTube Data API returns HTML-escaped titles ("Ben&amp;Ben").
export function decodeHtmlEntities(value) {
  const map = { '&amp;': '&', '&quot;': '"', '&#39;': "'", '&lt;': '<', '&gt;': '>', '&apos;': "'" }
  return String(value ?? '').replace(/&(amp|quot|#39|lt|gt|apos);/g, (m) => map[m])
}

// Lowercase alphanumerics only, with "&" dropped: "Ben&Ben" → "benben".
export function looseText(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')
}
