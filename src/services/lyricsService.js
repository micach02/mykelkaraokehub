// Synchronized lyrics — interface only.
//
// The MVP stores no lyrics: the karaoke video shows its own on-screen lyrics.
// A licensed lyrics provider can be plugged in later by implementing
// getSyncedLyrics() against that provider. Do not add copyrighted lyrics here.
//
// Lyrics shape:
// {
//   songId: string,
//   source: string,            provider name, for attribution
//   lines: [{ start: number, end: number, text: string }]   seconds
// }

export async function getSyncedLyrics(/* songId */) {
  return null
}

export function hasSyncedLyrics(lyrics) {
  return Boolean(lyrics?.lines?.length)
}

// Returns the index of the line that should be highlighted at `time`, or -1.
export function getActiveLineIndex(lyrics, time) {
  if (!hasSyncedLyrics(lyrics)) return -1
  return lyrics.lines.findIndex((line) => time >= line.start && time < line.end)
}
