import { useSyncExternalStore } from 'react'
import { getScoreHistory, subscribeScoreHistory } from '../services/scoringHistoryService'

// { recent: [...], bests: { [songId]: performance } }, kept up to date.
export function useScoreHistory() {
  return useSyncExternalStore(subscribeScoreHistory, getScoreHistory, getScoreHistory)
}
