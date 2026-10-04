import { beforeEach, describe, expect, it } from 'vitest'
import { __reloadLibraryForTests, getLibrarySongs, isSongSaved, removeSavedSong, saveSong } from './libraryService'
import { getCategories, isCategoryVisible, searchSavedSongs } from './songService'

const ytSong = {
  id: 'yt-AAAAAAAAAAA',
  title: 'Mundo',
  artist: 'IV of Spades',
  channel: 'KaraokeyTV',
  category: 'YouTube',
  isOPM: true,
  tags: [],
  source: 'youtube',
  youtubeVideoId: 'AAAAAAAAAAA',
  thumbnail: null,
}

beforeEach(() => {
  window.localStorage.clear()
  __reloadLibraryForTests()
})

describe('libraryService', () => {
  it('saves, dedupes, persists, and removes songs', () => {
    expect(saveSong(ytSong)).toBe(true)
    expect(saveSong(ytSong)).toBe(false)
    expect(isSongSaved(ytSong.id)).toBe(true)
    expect(getLibrarySongs()[0]).toMatchObject({ id: ytSong.id, isSaved: true, category: 'My Songs' })

    __reloadLibraryForTests() // simulate a page refresh
    expect(getLibrarySongs()).toHaveLength(1)

    expect(removeSavedSong(ytSong.id)).toBe(true)
    expect(getLibrarySongs()).toHaveLength(0)
  })

  it('keeps the same array until something changes', () => {
    const before = getLibrarySongs()
    expect(getLibrarySongs()).toBe(before)
    saveSong(ytSong)
    expect(getLibrarySongs()).not.toBe(before)
  })

  it('makes saved songs searchable and counts them in "My Songs"', async () => {
    expect(searchSavedSongs('Mundo')).toEqual([])
    const savedCategory = async () => (await getCategories()).find((c) => c.id === 'saved')
    expect(isCategoryVisible(await savedCategory())).toBe(false)

    saveSong(ytSong)
    expect(searchSavedSongs('Mundo').map((s) => s.id)).toEqual([ytSong.id])
    expect(searchSavedSongs('iv of spades').map((s) => s.id)).toEqual([ytSong.id])
    expect(searchSavedSongs('karaokeytv').map((s) => s.id)).toEqual([ytSong.id]) // channel
    expect(searchSavedSongs('').map((s) => s.id)).toEqual([ytSong.id])
    expect((await savedCategory()).songCount).toBe(1)
    expect(isCategoryVisible(await savedCategory())).toBe(true)
  })

  it('ignores stored songs without a real YouTube video', () => {
    window.localStorage.setItem('mykelkaraokehub:v1:my-songs', JSON.stringify([{ ...ytSong, youtubeVideoId: 'PLACEHOLDER_001' }, ytSong]))
    __reloadLibraryForTests()
    expect(getLibrarySongs().map((s) => s.id)).toEqual([ytSong.id])
  })
})
