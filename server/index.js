// Standalone karaoke server for hosting online (e.g. Render), when the web
// app is served from somewhere else (e.g. GitHub Pages). Locally, `npm run
// dev` runs the same API inside Vite instead (see vitePlugin.js).
//
//   node server/index.js
//
// Environment:
//   PORT              port to listen on (hosts set this; default 8787)
//   YOUTUBE_API_KEY   YouTube Data API v3 key (stays on the server)
//   ALLOWED_ORIGINS   comma-separated web app origins allowed to call the API
//                     from a browser, e.g. https://micach02.github.io

import http from 'node:http'
import path from 'node:path'
import { createKaraokeApi } from './api.js'
import { createRoomStore } from './rooms.js'
import { createYouTubeSearch } from './youtubeSearch.js'
import { createCors } from './cors.js'
import { createRateLimiter } from './rateLimit.js'
import { sendJson } from './http.js'

const port = Number(process.env.PORT) || 8787
const apiKey = process.env.YOUTUBE_API_KEY || ''
const cors = createCors(process.env.ALLOWED_ORIGINS)

const api = createKaraokeApi({
  youtube: createYouTubeSearch({ apiKey, cacheFile: path.join(process.cwd(), '.cache', 'youtube-search.json') }),
  rooms: createRoomStore(),
  // Online there's no home Wi-Fi: phones join through the public web address.
  getLanOriginsFn: () => [],
})

// It's on the internet: keep strangers from using up the YouTube quota or
// flooding the server with rooms. Per IP address (a whole home party shares
// one), per hour. Cache-only lookups are free, so they don't count.
function spendsQuota(req) {
  const url = new URL(req.url, 'http://localhost')
  if (url.pathname !== '/api/youtube/search') return false
  return url.searchParams.get('mode') !== 'cache' && url.searchParams.get('cacheOnly') !== '1'
}
const limiter = createRateLimiter({
  rules: [
    { name: 'search', match: spendsQuota, limit: 200, windowMs: 60 * 60 * 1000 },
    { name: 'rooms', match: (req) => req.method === 'POST' && req.url === '/api/rooms', limit: 20, windowMs: 60 * 60 * 1000 },
  ],
})

const server = http.createServer((req, res) => {
  if (cors.handle(req, res)) return // preflight answered
  if (req.url === '/' || req.url === '/api/health') {
    return sendJson(res, 200, { ok: true, service: 'mykelkaraokehub-server', youtube: Boolean(apiKey) })
  }
  if (!limiter.allow(req)) {
    return sendJson(res, 429, { error: { code: 'rate-limited', message: 'Too many requests. Please wait a bit and try again.' } })
  }
  api.middleware(req, res, () => sendJson(res, 404, { error: { code: 'not-found', message: 'Unknown API endpoint.' } }))
})

server.listen(port, () => {
  console.log(`🎤 myKelKaraokeHub server on port ${port}`)
  console.log(`   YouTube search: ${apiKey ? 'on' : 'OFF (set YOUTUBE_API_KEY)'}`)
  console.log(`   Allowed web origins: ${cors.origins.length ? cors.origins.join(', ') : 'none (set ALLOWED_ORIGINS)'}`)
})

function shutdown() {
  api.close()
  server.close(() => process.exit(0))
  setTimeout(() => process.exit(0), 3000).unref()
}
process.on('SIGTERM', shutdown)
process.on('SIGINT', shutdown)
