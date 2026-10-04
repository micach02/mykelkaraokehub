import { useCallback, useMemo } from 'react'
import { useKaraokeActions, useKaraokeState } from '../context/KaraokeContext'
import { useToast } from '../context/ToastContext'
import { scrollToTop } from '../utils/scroll'

// Queue operations with user feedback (toasts). Components use this instead
// of dispatching raw actions. Starting a song scrolls back up to the player;
// queueing behind the current song doesn't, so several can be added in a row.
export function useQueue() {
  const state = useKaraokeState()
  const actions = useKaraokeActions()
  const { show } = useToast()
  const { queue, currentSong } = state

  const queuePositions = useMemo(() => {
    const map = new Map()
    queue.forEach((entry, index) => map.set(entry.song.id, index + 1))
    return map
  }, [queue])

  const addToQueue = useCallback((song) => {
    const result = actions.addToQueue(song)
    if (!result.ok) {
      show(result.message, { variant: 'info' })
    } else if (result.started) {
      show(`▶ Now playing: ${song.title}`)
      scrollToTop()
    } else {
      show('✓ Added to queue')
    }
    return result
  }, [actions, show])

  const playNow = useCallback((song) => {
    actions.playSong(song)
    scrollToTop()
  }, [actions])

  const playQueueItem = useCallback((entryId) => {
    actions.playQueueItem(entryId)
    scrollToTop()
  }, [actions])

  const removeFromQueue = useCallback((entry) => {
    actions.removeFromQueue(entry.entryId)
    show(`Removed “${entry.song.title}”`, { variant: 'info' })
  }, [actions, show])

  const moveEntry = useCallback((index, delta) => {
    actions.reorderQueue(index, index + delta)
  }, [actions])

  const clearQueue = useCallback(() => {
    actions.clearQueue()
    show('Queue cleared', { variant: 'info' })
  }, [actions, show])

  return {
    queue,
    currentSong,
    nextEntry: queue[0] ?? null,
    queuePositions,
    addToQueue,
    playNow,
    playQueueItem,
    removeFromQueue,
    reorderQueue: actions.reorderQueue,
    moveEntry,
    skipSong: actions.skipSong,
    clearQueue,
  }
}
