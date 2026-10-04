// HTTP API for the karaoke app, as a connect-style middleware
// (req, res, next). Used by the Vite dev/preview servers via vitePlugin.js.
//
//   GET  /api/status                          server + YouTube status, LAN addresses
//   GET  /api/youtube/search?q=&mode=live|full|cache   karaoke search (see youtubeSearch.js)
//   GET  /api/youtube/recent                  recent searches (free to repeat)
//   POST /api/rooms                           create a room (TV) → { code, hostToken }
//   GET  /api/rooms/:code                     room info
//   GET  /api/rooms/:code/events              SSE stream (?role=host&token=… or ?role=remote)
//   POST /api/rooms/:code/state               TV publishes its queue (header X-Host-Token)
//   POST /api/rooms/:code/commands            phone sends a command

import { ApiError, openEventStream, readJson, sendError, sendJson } from './http.js'
import { getLanOrigins, portFromHostHeader } from './network.js'

const ROOM_ROUTE = /^\/api\/rooms\/([^/]+)(?:\/(events|state|commands))?$/

export function createKaraokeApi({ youtube, rooms, getLanOriginsFn = getLanOrigins }) {
  async function handle(req, res) {
    const url = new URL(req.url, 'http://localhost')
    const { pathname, searchParams } = url
    const method = req.method ?? 'GET'

    if (pathname === '/api/status' && method === 'GET') {
      const port = portFromHostHeader(req.headers.host)
      return sendJson(res, 200, { ok: true, youtube: youtube.status(), lanOrigins: getLanOriginsFn(port) })
    }

    if (pathname === '/api/youtube/search' && method === 'GET') {
      const result = await youtube.search(searchParams.get('q'), {
        mode: searchParams.get('mode') ?? 'full',
        cacheOnly: searchParams.get('cacheOnly') === '1',
      })
      return sendJson(res, 200, result)
    }

    if (pathname === '/api/youtube/recent' && method === 'GET') {
      return sendJson(res, 200, { queries: youtube.recent() })
    }

    if (pathname === '/api/rooms' && method === 'POST') {
      return sendJson(res, 201, rooms.createRoom())
    }

    const match = ROOM_ROUTE.exec(pathname)
    if (match) {
      const [, code, action] = match
      if (!action && method === 'GET') return sendJson(res, 200, rooms.getRoomInfo(decodeURIComponent(code)))

      if (action === 'events' && method === 'GET') {
        const role = searchParams.get('role')
        const token = searchParams.get('token')
        // Validate before opening the stream so errors come back as JSON.
        if (role === 'host') rooms.assertHost(code, token)
        else if (role === 'remote') rooms.getRoomInfo(code)
        else throw new ApiError(400, 'bad-role', 'role must be host or remote.')
        const stream = openEventStream(res)
        if (role === 'host') rooms.attachHost(code, token, stream)
        else rooms.attachRemote(code, stream)
        return undefined
      }

      if (action === 'state' && method === 'POST') {
        const body = await readJson(req)
        rooms.publishState(code, req.headers['x-host-token'], body)
        return sendJson(res, 200, { ok: true })
      }

      if (action === 'commands' && method === 'POST') {
        const body = await readJson(req)
        const command = rooms.sendCommand(code, body)
        return sendJson(res, 202, { ok: true, type: command.type })
      }
    }

    throw new ApiError(404, 'not-found', 'Unknown API endpoint.')
  }

  return {
    middleware(req, res, next) {
      if (!req.url?.startsWith('/api/')) return next()
      handle(req, res).catch((error) => {
        if (!res.headersSent) sendError(res, error)
        else res.end()
      })
      return undefined
    },
    close() {
      youtube.close?.()
      rooms.close?.()
    },
  }
}
