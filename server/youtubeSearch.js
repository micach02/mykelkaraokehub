// YouTube karaoke search, done by the karaoke server for every device.
//
// - The API key stays on this computer (YOUTUBE_API_KEY in .env); browsers
//   and phones never see it.
// - One shared cache for all devices, saved to .cache/ so it survives
//   restarts: a song searched once is free for everyone for 7 days.
// - Quota guard: the Data API allows 10,000 units/day and a search costs 100
//   (~100 searches/day). Once YouTube says the quota is used up, no more calls
//   are made until it resets (midnight Pacific Time).
// - Live search (results while typing) is protected three ways: answers from
//   the cache first, then by filtering earlier results ("kathang" → "kathang
//   isip" needs no new call), and only then calls YouTube — up to a daily
//   live budget, which keeps quota free for searches people ask for (Enter).
//
// Only video *metadata* is fetched (official Data API). Videos themselves are
// always played by the official YouTube embedded player in the browser.

import fs from 'node:fs'
import path from 'node:path'
import { ApiError } from './http.js'
import { cleanKaraokeTitle, isLikelyKaraoke, splitTitleAndArtist, tidyCase } from '../src/utils/karaokeTitle.js'
import { decodeHtmlEntities, normalizeText } from '../src/utils/text.js'
import { findKnownArtist } from '../src/utils/artistLookup.js'

const DATA_API = 'https://www.googleapis.com/youtube/v3/search'
const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/
const DAY_MS = 24 * 60 * 60 * 1000

export const SEARCH_DEFAULTS = {
  fetchResults: 25, // same quota cost for 1 or 50 results
  maxResults: 16, // returned after keeping only karaoke versions
  cacheDays: 7,
  cacheMaxEntries: 500,
  minQueryLength: 2,
  maxQueryLength: 100,
  liveMinQueryLength: 3,
  // YouTube calls allowed per day for live (as-you-type) searches. The rest of
  // the ~100 daily searches stay available for Enter / categories.
  liveSearchesPerDay: 60,
  // Answer a live search from earlier results when at least this many match.
  derivedMinResults: 3,
}

const MODES = ['cache', 'live', 'full']

// Milliseconds until the next midnight Pacific Time, when YouTube resets the
// daily quota. (Off by up to an hour on daylight-saving change days.)
export function msUntilQuotaReset(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Los_Angeles',
    hourCycle: 'h23',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(now)
  const get = (type) => Number(parts.find((p) => p.type === type)?.value ?? 0)
  const elapsed = ((get('hour') % 24) * 3600 + get('minute') * 60 + get('second')) * 1000 + now.getMilliseconds()
  return Math.max(60 * 1000, DAY_MS - elapsed)
}

export function toSong(item) {
  const videoId = item.id?.videoId
  const snippet = item.snippet ?? {}
  const rawTitle = decodeHtmlEntities(snippet.title ?? 'Untitled')
  const channel = decodeHtmlEntities(snippet.channelTitle ?? 'YouTube')
  const cleaned = cleanKaraokeTitle(rawTitle)
  const parsed = splitTitleAndArtist(cleaned, findKnownArtist)
  return {
    id: `yt-${videoId}`,
    title: tidyCase(parsed?.title ?? cleaned),
    artist: parsed?.artist ?? channel,
    channel,
    originalTitle: rawTitle,
    category: 'YouTube',
    isOPM: parsed?.isOPM ?? false,
    source: 'youtube',
    youtubeVideoId: videoId,
    thumbnail: snippet.thumbnails?.high?.url ?? snippet.thumbnails?.medium?.url ?? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
  }
}

async function readErrorBody(response) {
  try {
    const body = await response.json()
    const error = body?.error ?? {}
    const detailReason = (error.details ?? []).map((d) => d.reason).find(Boolean) ?? ''
    return { reason: error.errors?.[0]?.reason ?? '', detailReason, message: error.message ?? '' }
  } catch {
    return { reason: '', detailReason: '', message: '' }
  }
}

export function createYouTubeSearch({ apiKey = '', cacheFile = null, fetchImpl = globalThis.fetch, now = () => Date.now(), options = {} } = {}) {
  const config = { ...SEARCH_DEFAULTS, ...options }
  const key = String(apiKey ?? '').trim()
  // normalized query → { query, at, results }
  const cache = new Map()
  let quotaBlockedUntil = 0
  // YouTube calls made since the last daily reset: { calls, resetsAt }
  let usage = { calls: 0, resetsAt: 0 }
  let saveTimer = null

  // ---- persistence ----
  if (cacheFile) {
    try {
      const saved = JSON.parse(fs.readFileSync(cacheFile, 'utf8'))
      Object.entries(saved.entries ?? {}).forEach(([k, v]) => cache.set(k, v))
      quotaBlockedUntil = Number(saved.quotaBlockedUntil) || 0
      if (saved.usage) usage = { calls: Number(saved.usage.calls) || 0, resetsAt: Number(saved.usage.resetsAt) || 0 }
    } catch {
      // No cache yet (or unreadable) — start empty.
    }
  }

  function scheduleSave() {
    if (!cacheFile || saveTimer) return
    saveTimer = setTimeout(() => {
      saveTimer = null
      const data = snapshot()
      fs.promises
        .mkdir(path.dirname(cacheFile), { recursive: true })
        .then(() => fs.promises.writeFile(cacheFile, JSON.stringify(data)))
        .catch((error) => console.warn('[karaoke-server] Could not save the search cache:', error.message))
    }, 500)
    saveTimer.unref?.()
  }

  function snapshot() {
    return { quotaBlockedUntil, usage, entries: Object.fromEntries(cache) }
  }

  function currentUsage() {
    if (now() >= usage.resetsAt) usage = { calls: 0, resetsAt: now() + msUntilQuotaReset(new Date(now())) }
    return usage
  }

  function liveStatus() {
    const { calls } = currentUsage()
    return { limit: config.liveSearchesPerDay, used: Math.min(calls, config.liveSearchesPerDay), remaining: Math.max(0, config.liveSearchesPerDay - calls) }
  }

  // Songs from earlier searches that match every word of the query.
  function deriveFromCache(query) {
    const tokens = normalizeText(query).split(' ').filter(Boolean)
    if (!tokens.length) return null
    const matches = new Map()
    for (const entry of cache.values()) {
      if (!isFresh(entry)) continue
      for (const song of entry.results) {
        if (matches.has(song.id)) continue
        const haystack = normalizeText(`${song.title} ${song.artist} ${song.channel} ${song.originalTitle ?? ''}`)
        if (tokens.every((token) => haystack.includes(token))) matches.set(song.id, song)
      }
    }
    if (matches.size < config.derivedMinResults) return null
    const q = normalizeText(query)
    const rank = (song) => {
      const title = normalizeText(song.title)
      return title.startsWith(q) ? 2 : title.includes(q) ? 1 : 0
    }
    return [...matches.values()].sort((a, b) => rank(b) - rank(a)).slice(0, config.maxResults)
  }

  function isFresh(entry) {
    return Boolean(entry) && now() - entry.at < config.cacheDays * DAY_MS
  }

  function prune() {
    for (const [k, v] of cache) if (!isFresh(v)) cache.delete(k)
    const overflow = cache.size - config.cacheMaxEntries
    if (overflow > 0) {
      ;[...cache.entries()].sort((a, b) => a[1].at - b[1].at).slice(0, overflow).forEach(([k]) => cache.delete(k))
    }
  }

  function quotaStatus() {
    const blocked = quotaBlockedUntil > now()
    return { blocked, resetsAt: blocked ? new Date(quotaBlockedUntil).toISOString() : null }
  }

  function quotaError() {
    return new ApiError(429, 'quota', "Today's YouTube search limit has been reached. Saved songs and earlier searches still work.")
  }

  async function callYouTube(query) {
    const url = new URL(DATA_API)
    const params = {
      part: 'snippet',
      type: 'video',
      videoEmbeddable: 'true',
      safeSearch: 'moderate',
      maxResults: config.fetchResults,
      q: /karaoke|videoke/i.test(query) ? query : `${query} karaoke`,
      key,
    }
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, String(v)))

    let response
    try {
      response = await fetchImpl(url)
    } catch {
      throw new ApiError(502, 'network', "The karaoke server couldn't reach YouTube. Check the internet connection.")
    }
    if (response.ok) {
      currentUsage().calls += 1
      return response.json()
    }

    const { reason, detailReason, message } = await readErrorBody(response)
    if (/quotaExceeded|dailyLimitExceeded/i.test(reason)) {
      quotaBlockedUntil = now() + msUntilQuotaReset(new Date(now()))
      scheduleSave()
      throw quotaError()
    }
    if (/rateLimitExceeded/i.test(reason)) {
      throw new ApiError(429, 'rate-limit', 'YouTube is busy right now. Wait a moment and try again.')
    }
    if (/keyInvalid/i.test(reason) || /api key not valid/i.test(message)) {
      throw new ApiError(502, 'invalid-key', 'The YouTube API key is not valid. Check YOUTUBE_API_KEY in .env.')
    }
    if (/REFERRER/i.test(detailReason) || /referer/i.test(message)) {
      throw new ApiError(
        502,
        'key-referrer-blocked',
        'Your API key only allows requests from certain websites. Searches now come from the karaoke server, so in Google Cloud set the key\'s "Application restrictions" to "None" (keep the API restriction on YouTube Data API v3).',
      )
    }
    if (response.status === 403) {
      throw new ApiError(502, 'key-restricted', 'YouTube blocked this request. Check the API key restrictions in Google Cloud Console.')
    }
    throw new ApiError(502, 'youtube-error', `YouTube search failed (HTTP ${response.status}).`)
  }

  return {
    status() {
      return { configured: key.length > 0, quota: quotaStatus(), live: liveStatus() }
    },

    // mode:
    //   'cache' — cache (and earlier results) only; never calls YouTube
    //   'live'  — as-you-type: cache → earlier results → YouTube within the live budget
    //   'full'  — the user asked (Enter / category): cache → YouTube
    // Returns { query, results, cached, derived?, liveLimited? }; results is
    // null when there is nothing to show without calling YouTube.
    async search(rawQuery, { mode = 'full', cacheOnly = false } = {}) {
      const searchMode = cacheOnly ? 'cache' : MODES.includes(mode) ? mode : 'full'
      const query = String(rawQuery ?? '').trim().slice(0, config.maxQueryLength)
      if (query.length < config.minQueryLength) throw new ApiError(400, 'bad-query', 'Type at least 2 characters.')
      const cacheKey = normalizeText(query)
      const hit = cache.get(cacheKey)
      if (isFresh(hit)) return { query, results: hit.results, cached: true }

      const nothing = (extra = {}) => ({ query, results: null, cached: false, ...extra })
      if (searchMode !== 'full') {
        const derived = deriveFromCache(query)
        if (derived) return { query, results: derived, cached: true, derived: true }
      }
      if (searchMode === 'cache') return nothing()
      if (searchMode === 'live' && query.length < config.liveMinQueryLength) return nothing()
      if (!key) throw new ApiError(503, 'not-configured', 'YouTube search is not set up yet. Add YOUTUBE_API_KEY to .env and restart the server.')
      if (quotaStatus().blocked) throw quotaError()
      if (searchMode === 'live' && liveStatus().remaining === 0) return nothing({ liveLimited: true })

      const data = await callYouTube(query)
      // Keep karaoke/instrumental versions only — not the original recordings.
      const results = (data.items ?? [])
        .filter((item) => VIDEO_ID.test(item.id?.videoId ?? ''))
        .filter((item) => isLikelyKaraoke(decodeHtmlEntities(item.snippet?.title), decodeHtmlEntities(item.snippet?.channelTitle)))
        .slice(0, config.maxResults)
        .map(toSong)

      cache.set(cacheKey, { query, at: now(), results })
      prune()
      scheduleSave()
      return { query, results, cached: false }
    },

    // Most recent searches anyone made (free to repeat).
    recent(limit = 12) {
      return [...cache.values()]
        .filter((entry) => isFresh(entry) && entry.results.length > 0)
        .sort((a, b) => b.at - a.at)
        .slice(0, limit)
        .map((entry) => entry.query)
    },

    close() {
      if (!saveTimer) return
      // Flush a pending save before shutting down.
      clearTimeout(saveTimer)
      saveTimer = null
      try {
        fs.mkdirSync(path.dirname(cacheFile), { recursive: true })
        fs.writeFileSync(cacheFile, JSON.stringify(snapshot()))
      } catch {
        // Best effort.
      }
    },
  }
}
