import { useEffect, useSyncExternalStore } from 'react'
import { apiGet } from '../services/apiClient'

// Shared, lazily-loaded karaoke server status:
// { youtube: { configured, quota: { blocked, resetsAt } }, lanOrigins: [] }

let snapshot = { status: null, error: null, isLoading: false }
let inflight = null
const listeners = new Set()

function set(next) {
  snapshot = { ...snapshot, ...next }
  listeners.forEach((l) => l())
}

export function refreshServerStatus() {
  if (inflight) return inflight
  set({ isLoading: true })
  inflight = apiGet('/api/status')
    .then((status) => set({ status, error: null, isLoading: false }))
    .catch((error) => set({ error, isLoading: false }))
    .finally(() => {
      inflight = null
    })
  return inflight
}

function subscribe(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useServerStatus() {
  const state = useSyncExternalStore(subscribe, () => snapshot, () => snapshot)
  useEffect(() => {
    if (!snapshot.status && !snapshot.isLoading && !snapshot.error) refreshServerStatus()
  }, [])
  return {
    ...state,
    youtubeConfigured: state.status?.youtube?.configured ?? null,
    quotaBlocked: state.status?.youtube?.quota?.blocked ?? false,
    quotaResetsAt: state.status?.youtube?.quota?.resetsAt ? new Date(state.status.youtube.quota.resetsAt) : null,
    lanOrigins: state.status?.lanOrigins ?? [],
  }
}

// For tests.
export function __resetServerStatusForTests() {
  snapshot = { status: null, error: null, isLoading: false }
  inflight = null
}
