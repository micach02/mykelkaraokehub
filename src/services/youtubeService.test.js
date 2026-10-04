import { beforeEach, describe, expect, it } from 'vitest'
import { clearSessionSearchCache, getThumbnailUrl, isValidVideoId, searchKaraokeSongs } from './youtubeService'
import { installMockServer, realSearches, SONGS } from '../test/fixtures'

let server

beforeEach(() => {
  clearSessionSearchCache()
  server = installMockServer()
})

describe('client YouTube search (via the karaoke server)', () => {
  it('asks the server, never YouTube directly', async () => {
    const { results } = await searchKaraokeSongs('Buwan')
    expect(results).toEqual([SONGS.buwan])
    expect(server.calls[0].path).toBe('/api/youtube/search')
    expect(realSearches(server.calls)).toEqual(['Buwan'])
  })

  it('passes the search mode to the server', async () => {
    expect((await searchKaraokeSongs('Harana', { mode: 'cache' })).results).toBeNull()
    expect(server.calls[0].params.mode).toBe('cache')
    expect((await searchKaraokeSongs('ha', { mode: 'live' })).results).toBeNull()
    expect(realSearches(server.calls)).toEqual([])
  })

  it('reports when live search is out of budget', async () => {
    installMockServer({ liveLimited: true })
    expect(await searchKaraokeSongs('Harana', { mode: 'live' })).toMatchObject({ results: null, liveLimited: true })
  })

  it('remembers results for this tab', async () => {
    await searchKaraokeSongs('Buwan')
    await searchKaraokeSongs('  buwan ')
    expect(server.calls).toHaveLength(1)
  })

  it('surfaces server errors with their codes', async () => {
    installMockServer({ configured: false })
    await expect(searchKaraokeSongs('Tadhana')).rejects.toMatchObject({ code: 'not-configured' })
  })
})

describe('video helpers', () => {
  it('validates video IDs and builds thumbnails', () => {
    expect(isValidVideoId('AAAAAAAAAAA')).toBe(true)
    expect(isValidVideoId('PLACEHOLDER_001')).toBe(false)
    expect(getThumbnailUrl('AAAAAAAAAAA')).toBe('https://i.ytimg.com/vi/AAAAAAAAAAA/hqdefault.jpg')
    expect(getThumbnailUrl('nope')).toBeNull()
  })
})
