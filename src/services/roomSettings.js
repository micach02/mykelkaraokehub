// Host settings for phone-remote rooms, chosen on the TV (Phone Remote panel)
// and remembered on it. Phones see them in the room snapshot.
//
//   phonesControlAll  phones may pause/skip any song (default: only their own)
//   takeTurns         new songs are queued so singers alternate (round-robin)

import { useCallback, useSyncExternalStore } from 'react'
import { getItem, setItem, STORAGE_KEYS } from './storageService'

export const DEFAULT_ROOM_SETTINGS = { phonesControlAll: false, takeTurns: false }

const listeners = new Set()
let cached = null
let cachedKey

// Same object until the stored settings change (React needs a stable value).
export function getRoomSettings() {
  const raw = getItem(STORAGE_KEYS.roomSettings, null)
  const key = JSON.stringify(raw)
  if (key !== cachedKey || !cached) {
    cachedKey = key
    cached = { ...DEFAULT_ROOM_SETTINGS, ...(raw && typeof raw === 'object' ? raw : {}) }
  }
  return cached
}

export function updateRoomSettings(changes) {
  setItem(STORAGE_KEYS.roomSettings, { ...getRoomSettings(), ...changes })
  listeners.forEach((listener) => listener())
}

function subscribe(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useRoomSettings() {
  const settings = useSyncExternalStore(subscribe, getRoomSettings, () => DEFAULT_ROOM_SETTINGS)
  const update = useCallback((changes) => updateRoomSettings(changes), [])
  return [settings, update]
}

// May this phone pause/skip the song now playing? Its own song, or any song
// when the host allows it. Songs picked on the TV belong to the TV.
export function canPhoneControl({ settings, nowPlayingRequestedBy, phoneId }) {
  if (settings?.phonesControlAll) return true
  return Boolean(phoneId) && nowPlayingRequestedBy?.id === phoneId
}

// On the score screen, ⏭ = Next song: the singer who was scored or the next
// singer may move on (or anyone, when the host allows it).
export function canPhoneGoNext({ settings, scoredRequestedBy, nextRequestedBy, phoneId }) {
  if (settings?.phonesControlAll) return true
  return Boolean(phoneId) && (scoredRequestedBy?.id === phoneId || nextRequestedBy?.id === phoneId)
}
