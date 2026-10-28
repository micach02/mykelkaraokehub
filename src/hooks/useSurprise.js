import { useCallback } from 'react'
import { useKaraokeActions, useKaraokeState } from '../context/KaraokeContext'
import { useToast } from '../context/ToastContext'
import { useLibrarySongs } from './useLibrary'
import { useRecentSongs } from './useRecentSongs'
import { getFeaturedArtists } from '../utils/artistLookup'

const OPM_ARTISTS = getFeaturedArtists().map((a) => a.name)

// A random karaoke song from `songs` that isn't playing or queued already
// (practice tracks don't count). null when there's nothing to pick.
export function pickSurpriseSong(songs, excludeIds = new Set(), random = Math.random) {
  const seen = new Set()
  const choices = songs.filter((song) => {
    if (!song?.youtubeVideoId || song.source === 'practice' || excludeIds.has(song.id) || seen.has(song.id)) return false
    seen.add(song.id)
    return true
  })
  return choices.length ? choices[Math.floor(random() * choices.length)] : null
}

// 🎲 Surprise me: queues a random song from My Songs / Recently sung
// (instant, no search). With nothing to pick from yet, it searches a random
// OPM artist instead (onSearch).
export function useSurprise(onSearch) {
  const library = useLibrarySongs()
  const recent = useRecentSongs()
  const { currentSong, queue } = useKaraokeState()
  const actions = useKaraokeActions()
  const { show } = useToast()

  return useCallback(() => {
    const busy = new Set([currentSong?.id, ...queue.map((entry) => entry.song.id)].filter(Boolean))
    const song = pickSurpriseSong([...library, ...recent], busy)
    if (!song) {
      const artist = OPM_ARTISTS[Math.floor(Math.random() * OPM_ARTISTS.length)]
      show(`🎲 How about some ${artist}?`, { variant: 'info' })
      onSearch?.(artist)
      return
    }
    const result = actions.addToQueue(song)
    if (!result.ok) {
      show(result.message ?? 'Couldn’t add a song', { variant: 'info' })
      return
    }
    show(result.started ? `🎲 Surprise! Now playing “${song.title}”` : `🎲 Surprise! “${song.title}” is in the queue`)
  }, [library, recent, currentSong, queue, actions, show, onSearch])
}
