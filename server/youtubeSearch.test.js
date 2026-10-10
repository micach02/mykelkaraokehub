// @vitest-environment node
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { describe, expect, it, vi } from 'vitest'
import { createYouTubeSearch, msUntilQuotaReset } from './youtubeSearch.js'

export const sampleResponse = {
  items: [
    {
      id: { videoId: 'AAAAAAAAAAA' },
      snippet: { title: 'BUWAN - Juan Carlos Labajo (HD Karaoke)', channelTitle: 'Atomic Karaoke', thumbnails: { high: { url: 'https://i.ytimg.com/vi/AAAAAAAAAAA/hqdefault.jpg' } } },
    },
    { id: { videoId: 'BBBBBBBBBBB' }, snippet: { title: 'Juan Karlos - Buwan (Official Music Video)', channelTitle: 'Juan Karlos' } },
    { id: { videoId: 'CCCCCCCCCCC' }, snippet: { title: 'Buwan by juan karlos | Videoke', channelTitle: 'KBKaraoke' } },
    { id: { channelId: 'x' }, snippet: { title: 'Karaoke channel' } },
  ],
}

const ok = (body) => ({ ok: true, status: 200, json: async () => body })
const fail = (status, reason, message = '', detailReason) => ({
  ok: false,
  status,
  json: async () => ({ error: { code: status, message, errors: [{ reason }], details: detailReason ? [{ reason: detailReason }] : [] } }),
})

function setup({ apiKey = 'key', cacheFile = null, response = ok(sampleResponse) } = {}) {
  const fetchImpl = vi.fn(async () => response)
  const youtube = createYouTubeSearch({ apiKey, cacheFile, fetchImpl })
  return { youtube, fetchImpl }
}

describe('server YouTube search', () => {
  it('keeps karaoke versions only and tidies titles, using artist aliases', async () => {
    const { youtube, fetchImpl } = setup()
    const { results, cached } = await youtube.search('Buwan')
    expect(cached).toBe(false)
    expect(results.map((s) => s.youtubeVideoId)).toEqual(['AAAAAAAAAAA', 'CCCCCCCCCCC'])
    expect(results[0]).toMatchObject({ title: 'Buwan', artist: 'Juan Karlos', isOPM: true, channel: 'Atomic Karaoke' })
    expect(results[1]).toMatchObject({ title: 'Buwan', artist: 'Juan Karlos' })
    const url = new URL(fetchImpl.mock.calls[0][0])
    expect(url.searchParams.get('q')).toBe('Buwan karaoke')
    expect(url.searchParams.get('key')).toBe('key')
    expect(url.searchParams.get('videoEmbeddable')).toBe('true')
  })

  it('shares one cache across devices and answers cache-only lookups for free', async () => {
    const { youtube, fetchImpl } = setup()
    expect((await youtube.search('buwan', { cacheOnly: true })).results).toBeNull()
    await youtube.search('Buwan')
    expect((await youtube.search('  BUWAN ', { cacheOnly: true })).cached).toBe(true)
    await youtube.search('buwan')
    expect(fetchImpl).toHaveBeenCalledTimes(1)
    expect(youtube.recent()).toEqual(['Buwan'])
  })

  it('saves the cache to disk and loads it on restart', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mkh-'))
    const cacheFile = path.join(dir, 'cache.json')
    const first = setup({ cacheFile })
    await first.youtube.search('Buwan')
    first.youtube.close()
    const second = setup({ cacheFile })
    expect((await second.youtube.search('buwan')).cached).toBe(true)
    expect(second.fetchImpl).not.toHaveBeenCalled()
  })

  it('stops calling YouTube once the daily quota is used up', async () => {
    const { youtube, fetchImpl } = setup({ response: fail(403, 'quotaExceeded') })
    await expect(youtube.search('Harana')).rejects.toMatchObject({ code: 'quota', status: 429 })
    expect(youtube.status().quota.blocked).toBe(true)
    await expect(youtube.search('Tadhana')).rejects.toMatchObject({ code: 'quota' })
    expect(fetchImpl).toHaveBeenCalledTimes(1)
  })

  it('explains a website-restricted key', async () => {
    const { youtube } = setup({ response: fail(403, 'forbidden', 'Requests from referer <empty> are blocked.', 'API_KEY_HTTP_REFERRER_BLOCKED') })
    await expect(youtube.search('Buwan')).rejects.toMatchObject({ code: 'key-referrer-blocked' })
  })

  it('explains an invalid key and a missing key', async () => {
    await expect(setup({ response: fail(400, 'badRequest', 'API key not valid.') }).youtube.search('Buwan')).rejects.toMatchObject({ code: 'invalid-key' })
    const noKey = setup({ apiKey: '' })
    expect(noKey.youtube.status().configured).toBe(false)
    await expect(noKey.youtube.search('Buwan')).rejects.toMatchObject({ code: 'not-configured' })
  })

  it('rejects too-short queries', async () => {
    await expect(setup().youtube.search('a')).rejects.toMatchObject({ code: 'bad-query' })
  })

  it('computes the time until the quota resets', () => {
    expect(msUntilQuotaReset(new Date('2026-10-03T12:00:00Z'))).toBe(19 * 60 * 60 * 1000) // 05:00 Pacific
  })
})

describe('recent searches ("Trending here")', () => {
  it('lists searches people chose, not the ones made while typing', async () => {
    const { youtube } = setup()
    await youtube.search('umagang kay g', { mode: 'live' })
    await youtube.search('umagang kay gabi', { mode: 'live' })
    expect(youtube.recent()).toEqual([])
    await youtube.search('Umagang kay gabi') // Enter (from the cache)
    await youtube.search('Buwan')
    expect(youtube.recent()).toEqual(['Buwan', 'umagang kay gabi'])
  })
})

describe('live search (as you type)', () => {
  const songsFor = (titles) => ({
    items: titles.map((title, i) => ({
      id: { videoId: `VID${String(i).padStart(8, '0')}` },
      snippet: { title: `${title} (Karaoke)`, channelTitle: 'Sing King' },
    })),
  })

  it('answers longer queries from earlier results without calling YouTube', async () => {
    const { youtube, fetchImpl } = setup({ response: ok(songsFor(['Kathang Isip - Ben&Ben', 'Kathang Isip Acoustic', 'Kathang Isip Piano', 'Pagtingin - Ben&Ben'])) })
    await youtube.search('kathang', { mode: 'live' })
    const result = await youtube.search('kathang isip', { mode: 'live' })
    expect(result).toMatchObject({ cached: true, derived: true })
    expect(result.results.map((s) => s.title)).toEqual(['Kathang Isip', 'Kathang Isip Acoustic', 'Kathang Isip Piano'])
    expect(fetchImpl).toHaveBeenCalledTimes(1)
    // Enter (full) asks YouTube for the exact query.
    await youtube.search('kathang isip', { mode: 'full' })
    expect(fetchImpl).toHaveBeenCalledTimes(2)
  })

  it('waits for 3+ characters before spending quota', async () => {
    const { youtube, fetchImpl } = setup()
    expect((await youtube.search('bu', { mode: 'live' })).results).toBeNull()
    expect(fetchImpl).not.toHaveBeenCalled()
  })

  it('stops live searches at the daily budget but still allows Enter', async () => {
    const fetchImpl = vi.fn(async () => ok(sampleResponse))
    const youtube = createYouTubeSearch({ apiKey: 'key', fetchImpl, options: { liveSearchesPerDay: 2 } })
    await youtube.search('song one', { mode: 'live' })
    await youtube.search('song two', { mode: 'live' })
    expect(youtube.status().live).toEqual({ limit: 2, used: 2, remaining: 0 })
    expect(await youtube.search('song three', { mode: 'live' })).toMatchObject({ results: null, liveLimited: true })
    expect(fetchImpl).toHaveBeenCalledTimes(2)
    expect((await youtube.search('song three', { mode: 'full' })).results).toHaveLength(2)
  })

  it('resets the live budget when the YouTube day resets', async () => {
    let time = Date.parse('2026-10-03T12:00:00Z')
    const fetchImpl = vi.fn(async () => ok(sampleResponse))
    const youtube = createYouTubeSearch({ apiKey: 'key', fetchImpl, now: () => time, options: { liveSearchesPerDay: 1 } })
    await youtube.search('song one', { mode: 'live' })
    expect(youtube.status().live.remaining).toBe(0)
    time += 20 * 60 * 60 * 1000 // past midnight Pacific
    expect(youtube.status().live.remaining).toBe(1)
  })
})
