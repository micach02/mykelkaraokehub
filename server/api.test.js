// @vitest-environment node
import http from 'node:http'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { createKaraokeApi } from './api.js'
import { createRoomStore } from './rooms.js'
import { createYouTubeSearch } from './youtubeSearch.js'

let server
let base
let fetchYouTube

beforeAll(async () => {
  fetchYouTube = vi.fn(async () => ({
    ok: true,
    json: async () => ({ items: [{ id: { videoId: 'AAAAAAAAAAA' }, snippet: { title: 'Harana - Parokya ni Edgar (Karaoke)', channelTitle: 'Sing King' } }] }),
  }))
  const api = createKaraokeApi({
    youtube: createYouTubeSearch({ apiKey: 'key', fetchImpl: fetchYouTube }),
    rooms: createRoomStore(),
    getLanOriginsFn: (port) => [`http://192.168.1.50:${port}`],
  })
  server = http.createServer((req, res) => api.middleware(req, res, () => {
    res.writeHead(404)
    res.end()
  }))
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  base = `http://127.0.0.1:${server.address().port}`
})

afterAll(() => {
  server.closeAllConnections?.()
  server.close()
})

const getJson = async (path, init) => {
  const res = await fetch(base + path, init)
  return { status: res.status, body: await res.json() }
}
const postJson = (path, body, headers = {}) =>
  getJson(path, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body) })

// Reads SSE events from a streaming response until `count` events arrive.
async function readEvents(res, count) {
  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  const events = []
  let buffer = ''
  while (events.length < count) {
    const { value, done } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const blocks = buffer.split('\n\n')
    buffer = blocks.pop()
    blocks.forEach((block) => {
      const event = /^event: (.+)$/m.exec(block)?.[1]
      const data = /^data: (.+)$/m.exec(block)?.[1]
      if (event) events.push({ event, data: JSON.parse(data) })
    })
  }
  reader.cancel()
  return events
}

describe('karaoke API', () => {
  it('reports status with LAN addresses for the QR code', async () => {
    const { status, body } = await getJson('/api/status')
    expect(status).toBe(200)
    expect(body.youtube).toMatchObject({ configured: true, quota: { blocked: false, resetsAt: null }, live: { remaining: 60 } })
    expect(body.lanOrigins[0]).toMatch(/^http:\/\/192\.168\.1\.50:\d+$/)
  })

  it('searches YouTube and serves cache-only lookups', async () => {
    expect((await getJson('/api/youtube/search?q=harana&cacheOnly=1')).body.results).toBeNull()
    const { body } = await getJson('/api/youtube/search?q=Harana')
    expect(body.results[0]).toMatchObject({ title: 'Harana', artist: 'Parokya ni Edgar' })
    expect((await getJson('/api/youtube/search?q=harana&cacheOnly=1')).body.cached).toBe(true)
    expect(fetchYouTube).toHaveBeenCalledTimes(1)
    expect((await getJson('/api/youtube/recent')).body.queries).toEqual(['Harana'])
  })

  it('returns JSON errors', async () => {
    expect(await getJson('/api/youtube/search?q=x')).toMatchObject({ status: 400, body: { error: { code: 'bad-query' } } })
    expect(await getJson('/api/rooms/MKH-ZZZZZZ')).toMatchObject({ status: 404, body: { error: { code: 'room-not-found' } } })
    expect(await getJson('/api/nope')).toMatchObject({ status: 404 })
  })

  it('runs a room: phone command reaches the TV stream; TV state reaches the phone stream', async () => {
    const { body: room } = await postJson('/api/rooms', {})
    expect(room.code).toMatch(/^MKH-/)

    // No TV connected yet → phone gets a clear error.
    const offline = await postJson(`/api/rooms/${room.code}/commands`, { type: 'SKIP_SONG', from: { id: 'p1' } })
    expect(offline).toMatchObject({ status: 409, body: { error: { code: 'host-offline' } } })

    // Wrong host token is refused before a stream opens.
    expect((await fetch(`${base}/api/rooms/${room.code}/events?role=host&token=nope`)).status).toBe(403)

    const tv = await fetch(`${base}/api/rooms/${room.code}/events?role=host&token=${room.hostToken}`)
    expect(tv.headers.get('content-type')).toMatch(/text\/event-stream/)
    const tvEvents = readEvents(tv, 2) // presence, command

    await new Promise((r) => setTimeout(r, 50))
    const sent = await postJson(`/api/rooms/${room.code}/commands`, {
      type: 'ADD_TO_QUEUE',
      payload: { song: { youtubeVideoId: 'AAAAAAAAAAA', title: 'Harana', artist: 'Parokya ni Edgar' } },
      from: { id: 'p1', name: 'Mika' },
    })
    expect(sent.status).toBe(202)
    const events = await tvEvents
    expect(events.map((e) => e.event)).toEqual(['presence', 'command'])
    expect(events[1].data).toMatchObject({ type: 'ADD_TO_QUEUE', from: { id: 'p1', name: 'Mika' } })

    // TV publishes state; a phone joining receives it.
    expect((await postJson(`/api/rooms/${room.code}/state`, { queue: [{ entryId: 'e1' }] }, { 'X-Host-Token': room.hostToken })).status).toBe(200)
    expect((await postJson(`/api/rooms/${room.code}/state`, {}, { 'X-Host-Token': 'bad' })).status).toBe(403)
    const phone = await fetch(`${base}/api/rooms/${room.code}/events?role=remote`)
    const [state] = await readEvents(phone, 1)
    expect(state).toMatchObject({ event: 'state', data: { queue: [{ entryId: 'e1' }] } })
  })
})
