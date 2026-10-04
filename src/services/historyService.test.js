import { beforeEach, describe, expect, it } from 'vitest'
import { __reloadRecentSongsForTests, clearRecentSongs, getRecentSongs, recordSong } from './historyService'
import { getSuggestions } from '../utils/suggestions'
import { SONGS } from '../test/fixtures'

beforeEach(() => {
  window.localStorage.clear()
  __reloadRecentSongsForTests()
})

describe('Recently sung', () => {
  it('keeps picked songs newest first, without duplicates, across refreshes', () => {
    recordSong(SONGS.buwan)
    recordSong(SONGS.harana)
    recordSong(SONGS.buwan)
    expect(getRecentSongs().map((s) => s.title)).toEqual(['Buwan', 'Harana'])
    __reloadRecentSongsForTests()
    expect(getRecentSongs().map((s) => s.title)).toEqual(['Buwan', 'Harana'])
    clearRecentSongs()
    expect(getRecentSongs()).toEqual([])
  })

  it('ignores songs without a real YouTube video', () => {
    recordSong({ ...SONGS.buwan, youtubeVideoId: 'PLACEHOLDER_001' })
    expect(getRecentSongs()).toEqual([])
  })
})

describe('suggestions', () => {
  it('suggests artists you sang most recently, then vibes', () => {
    const suggestions = getSuggestions([SONGS.kathangIsip, SONGS.buwan, SONGS.kathangIsip, { ...SONGS.tadhana, artist: 'Some Karaoke Channel' }])
    expect(suggestions.slice(0, 2)).toEqual([
      { label: '✨ More Ben&Ben', query: 'Ben&Ben' },
      { label: '✨ More Juan Karlos', query: 'Juan Karlos' },
    ])
    expect(suggestions[2].label).toBe('💘 Kilig love songs')
  })

  it('falls back to vibes when nothing was sung yet', () => {
    expect(getSuggestions([])[0]).toEqual({ label: '💘 Kilig love songs', query: 'OPM kilig love songs karaoke' })
  })
})
