import { useSyncExternalStore } from 'react'
import { getRecentSongs, subscribeRecentSongs } from '../services/historyService'

// Songs recently picked on this TV, newest first.
export function useRecentSongs() {
  return useSyncExternalStore(subscribeRecentSongs, getRecentSongs, getRecentSongs)
}
