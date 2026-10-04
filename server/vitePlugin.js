// Runs the karaoke server inside Vite, so `npm run dev` and `npm run preview`
// serve the app, the API, and phone remotes from one address and port.

import path from 'node:path'
import { loadEnv } from 'vite'
import { createKaraokeApi } from './api.js'
import { createRoomStore } from './rooms.js'
import { createYouTubeSearch } from './youtubeSearch.js'
import { getLanOrigins } from './network.js'

export function karaokeServerPlugin() {
  let api = null
  let root = process.cwd()
  let mode = 'development'

  function getApi() {
    if (api) return api
    // Read all .env variables (not only VITE_*). The key stays on the server.
    const env = loadEnv(mode, root, '')
    const apiKey = env.YOUTUBE_API_KEY || env.VITE_YOUTUBE_API_KEY || ''
    api = createKaraokeApi({
      youtube: createYouTubeSearch({ apiKey, cacheFile: path.join(root, '.cache', 'youtube-search.json') }),
      rooms: createRoomStore(),
    })
    if (!apiKey) console.warn('\n  ⚠  YOUTUBE_API_KEY is not set in .env — YouTube search is off.\n')
    return api
  }

  function announce(server) {
    server.httpServer?.once('listening', () => {
      const address = server.httpServer.address()
      const port = typeof address === 'object' && address ? address.port : ''
      const [lan] = getLanOrigins(port)
      if (lan) console.log(`\n  📱 Phone remotes: open the TV page, tap "Phone Remote", and scan the QR code (${lan}).\n`)
    })
  }

  return {
    name: 'mykel-karaoke-server',
    configResolved(config) {
      root = config.root
      mode = config.mode
    },
    configureServer(server) {
      server.middlewares.use(getApi().middleware)
      server.httpServer?.on('close', () => api?.close())
      announce(server)
    },
    configurePreviewServer(server) {
      server.middlewares.use(getApi().middleware)
      server.httpServer?.on('close', () => api?.close())
      announce(server)
    },
  }
}
