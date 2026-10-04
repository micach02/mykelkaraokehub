// Test helpers: a fake karaoke server (fetch) and YouTube-shaped songs.
import { vi } from 'vitest'

export function ytSong(videoId, title, artist, extra = {}) {
  return {
    id: `yt-${videoId}`,
    title,
    artist,
    channel: extra.channel ?? 'Sing King',
    category: 'YouTube',
    isOPM: extra.isOPM ?? true,
    source: 'youtube',
    youtubeVideoId: videoId,
    thumbnail: null,
  }
}

export const SONGS = {
  buwan: ytSong('AAAAAAAAAAA', 'Buwan', 'Juan Karlos'),
  kathangIsip: ytSong('BBBBBBBBBBB', 'Kathang Isip', 'Ben&Ben'),
  harana: ytSong('CCCCCCCCCCC', 'Harana', 'Parokya ni Edgar'),
  tadhana: ytSong('DDDDDDDDDDD', 'Tadhana', 'Up Dharma Down'),
  elBimbo: ytSong('EEEEEEEEEEE', 'Ang Huling El Bimbo', 'Eraserheads'),
}

const DEFAULT_RESULTS = {
  buwan: [SONGS.buwan],
  'kathang isip': [SONGS.kathangIsip],
  opm: [SONGS.buwan, SONGS.kathangIsip, SONGS.harana, SONGS.tadhana, SONGS.elBimbo],
  'opm love songs karaoke': [SONGS.kathangIsip, SONGS.tadhana],
}

/**
 * Replaces fetch with a fake karaoke server. Returns { calls, searched } so
 * tests can assert which requests were made.
 */
export function installMockServer({
  results = DEFAULT_RESULTS,
  configured = true,
  room = { code: 'MKH-ABCDEF', hostToken: 'host-token' },
  roomExists = true,
  liveLimited = false,
} = {}) {
  const calls = []
  const searched = new Set()
  const json = (status, body) => ({ ok: status < 400, status, json: async () => body })

  const fetchMock = vi.fn(async (input, init = {}) => {
    const url = new URL(String(input), 'http://localhost')
    const method = init.method ?? 'GET'
    const body = init.body ? JSON.parse(init.body) : undefined
    calls.push({ path: url.pathname, params: Object.fromEntries(url.searchParams), method, body, headers: init.headers })

    if (url.pathname === '/api/status') {
      return json(200, { ok: true, youtube: { configured, quota: { blocked: false, resetsAt: null } }, lanOrigins: ['http://192.168.1.50:5173'] })
    }
    if (url.pathname === '/api/youtube/recent') return json(200, { queries: [] })
    if (url.pathname === '/api/youtube/search') {
      const q = url.searchParams.get('q').trim().toLowerCase()
      const mode = url.searchParams.get('cacheOnly') === '1' ? 'cache' : url.searchParams.get('mode') ?? 'full'
      const nothing = (extra = {}) => json(200, { query: q, results: null, cached: false, ...extra })
      if (searched.has(q)) return json(200, { query: q, results: results[q] ?? [], cached: true })
      if (mode === 'cache') return nothing()
      if (mode === 'live' && (q.length < 3 || liveLimited)) return nothing({ liveLimited })
      if (!configured) return json(503, { error: { code: 'not-configured', message: 'YouTube search is not set up yet.' } })
      searched.add(q)
      return json(200, { query: q, results: results[q] ?? [], cached: false })
    }
    if (url.pathname === '/api/rooms' && method === 'POST') return json(201, room)
    if (/^\/api\/rooms\/[^/]+/.test(url.pathname) && !roomExists) {
      return json(404, { error: { code: 'room-not-found', message: 'This karaoke room no longer exists.' } })
    }
    if (/^\/api\/rooms\/[^/]+$/.test(url.pathname)) return json(200, { code: room.code, hostOnline: true, remotes: 0 })
    if (/^\/api\/rooms\/[^/]+\/state$/.test(url.pathname)) return json(200, { ok: true })
    if (/^\/api\/rooms\/[^/]+\/commands$/.test(url.pathname)) return json(202, { ok: true, type: body?.type })
    return json(404, { error: { code: 'not-found', message: 'Unknown API endpoint.' } })
  })

  vi.stubGlobal('fetch', fetchMock)
  return { calls, searched, fetchMock }
}

// YouTube search requests, optionally of one mode ('live' | 'full' | 'cache').
export function searchCalls(calls, mode) {
  return calls
    .filter((c) => c.path === '/api/youtube/search' && (!mode || (c.params.mode ?? 'full') === mode))
    .map((c) => c.params.q)
}

// Searches the user explicitly asked for (Enter, chips, categories).
export function realSearches(calls) {
  return searchCalls(calls, 'full')
}
