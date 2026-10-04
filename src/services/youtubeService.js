// YouTube, through official channels only:
//   - search: the karaoke server calls the YouTube Data API v3 (the API key
//     never reaches the browser) and shares one cache across all devices;
//   - playback: the official YouTube IFrame Player API (embedded player).
// Videos are never downloaded, proxied, scraped, or re-hosted.

import { apiGet } from './apiClient'

const IFRAME_API_SRC = 'https://www.youtube.com/iframe_api'
const IFRAME_API_TIMEOUT_MS = 15000
const VIDEO_ID_PATTERN = /^[A-Za-z0-9_-]{11}$/

export function isValidVideoId(videoId) {
  return typeof videoId === 'string' && VIDEO_ID_PATTERN.test(videoId)
}

export function getThumbnailUrl(videoId) {
  return isValidVideoId(videoId) ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg` : null
}

// ---- Search (via the karaoke server) ----

// Results already fetched in this tab, so going back and forth is instant.
const sessionCache = new Map()
const keyOf = (query) => query.trim().toLowerCase().replace(/\s+/g, ' ')

// mode (see server/youtubeSearch.js):
//   'live'  — as you type; the server answers from its cache when it can and
//             only spends quota within a daily live budget
//   'full'  — the user asked (Enter, a category, a suggestion)
//   'cache' — never spends quota
// Returns { results, cached, derived, liveLimited }. results is null when
// there is nothing to show without spending quota.
export async function searchKaraokeSongs(query, { mode = 'full', signal } = {}) {
  const q = String(query ?? '').trim()
  const key = keyOf(q)
  if (sessionCache.has(key)) return { results: sessionCache.get(key), cached: true, derived: false, liveLimited: false }
  const params = new URLSearchParams({ q, mode })
  const data = await apiGet(`/api/youtube/search?${params}`, { signal })
  // Results filtered from other searches are good enough while typing, but
  // pressing Enter should still ask YouTube for this exact query.
  if (Array.isArray(data?.results) && !data.derived) sessionCache.set(key, data.results)
  return {
    results: data?.results ?? null,
    cached: Boolean(data?.cached),
    derived: Boolean(data?.derived),
    liveLimited: Boolean(data?.liveLimited),
  }
}

export async function getRecentSearches({ signal } = {}) {
  const data = await apiGet('/api/youtube/recent', { signal })
  return data?.queries ?? []
}

export function clearSessionSearchCache() {
  sessionCache.clear()
}

// ---- IFrame Player API loader ----

let iframeApiPromise = null

export function loadYouTubeIframeApi() {
  if (typeof window === 'undefined') return Promise.reject(new Error('No window'))
  if (window.YT?.Player) return Promise.resolve(window.YT)
  if (iframeApiPromise) return iframeApiPromise

  iframeApiPromise = new Promise((resolve, reject) => {
    const fail = () => {
      iframeApiPromise = null
      reject(new Error('The YouTube player could not be loaded. Check your connection or ad blocker.'))
    }
    const timeout = window.setTimeout(fail, IFRAME_API_TIMEOUT_MS)

    const previous = window.onYouTubeIframeAPIReady
    window.onYouTubeIframeAPIReady = () => {
      window.clearTimeout(timeout)
      previous?.()
      resolve(window.YT)
    }

    const script = document.createElement('script')
    script.src = IFRAME_API_SRC
    script.async = true
    script.onerror = () => {
      window.clearTimeout(timeout)
      script.remove()
      fail()
    }
    document.head.appendChild(script)
  })
  return iframeApiPromise
}

// Maps IFrame API error codes to friendly messages.
export function describePlayerError(code) {
  switch (code) {
    case 2:
      return { code: 'invalid-video', message: 'This song has an invalid video link.' }
    case 5:
      return { code: 'html5', message: 'Your browser could not play this video.' }
    case 100:
      return { code: 'not-found', message: 'The karaoke video may no longer be available.' }
    case 101:
    case 150:
      return { code: 'not-embeddable', message: 'The video owner does not allow this video to be played here.' }
    default:
      return { code: 'unknown', message: 'Something went wrong while playing this song.' }
  }
}
