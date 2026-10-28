import { describe, expect, it } from 'vitest'
import { pickSurpriseSong } from './useSurprise'

const song = (id, extra = {}) => ({ id, title: id, youtubeVideoId: `v-${id}`, source: 'youtube', ...extra })

describe('🎲 Surprise me', () => {
  it('picks a karaoke song that is not playing or queued', () => {
    const songs = [song('a'), song('b'), song('c'), song('a')]
    expect(pickSurpriseSong(songs, new Set(['a', 'b']), () => 0)).toMatchObject({ id: 'c' })
    expect(pickSurpriseSong(songs, new Set(), () => 0.99)).toMatchObject({ id: 'c' }) // duplicates count once
  })

  it('skips practice tracks, and returns null when there is nothing to pick', () => {
    const practice = song('scale', { source: 'practice', youtubeVideoId: null })
    expect(pickSurpriseSong([practice], new Set())).toBeNull()
    expect(pickSurpriseSong([song('a')], new Set(['a']))).toBeNull()
    expect(pickSurpriseSong([], new Set())).toBeNull()
  })
})
