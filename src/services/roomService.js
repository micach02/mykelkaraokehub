// Client side of karaoke rooms (TV host + phone remotes). See server/rooms.js.
//
// Transport: plain HTTP POSTs for sending, Server-Sent Events (EventSource)
// for receiving. EventSource reconnects on its own after Wi-Fi hiccups.

import { apiGet, apiPost, apiUrl } from './apiClient'
import { getItem, setItem, removeItem, STORAGE_KEYS } from './storageService'
import { createId } from '../utils/id'

export const COMMANDS = {
  ADD_TO_QUEUE: 'ADD_TO_QUEUE',
  REMOVE_FROM_QUEUE: 'REMOVE_FROM_QUEUE',
  SKIP_SONG: 'SKIP_SONG',
  TOGGLE_PLAY: 'TOGGLE_PLAY',
}

const roomPath = (code) => `/api/rooms/${encodeURIComponent(code)}`

export function createRoom() {
  return apiPost('/api/rooms')
}

export function getRoomInfo(code, options) {
  return apiGet(roomPath(code), options)
}

export function publishRoomState(code, hostToken, state) {
  return apiPost(`${roomPath(code)}/state`, state, { headers: { 'X-Host-Token': hostToken } })
}

export function sendRoomCommand(code, command) {
  return apiPost(`${roomPath(code)}/commands`, command)
}

// Opens the event stream. handlers: { [eventName]: (data) => void, onOpen, onError }.
export function openRoomEvents(code, { role, hostToken }, handlers) {
  const params = new URLSearchParams({ role })
  if (hostToken) params.set('token', hostToken)
  const source = new EventSource(apiUrl(`${roomPath(code)}/events?${params}`))
  Object.entries(handlers).forEach(([name, handler]) => {
    if (name === 'onOpen' || name === 'onError') return
    source.addEventListener(name, (event) => {
      try {
        handler(JSON.parse(event.data))
      } catch {
        // Ignore malformed messages.
      }
    })
  })
  source.onopen = () => handlers.onOpen?.()
  source.onerror = () => handlers.onError?.(source)
  return () => source.close()
}

// The URL phones open. Uses the computer's Wi-Fi address when the TV page
// was opened as "localhost" (phones can't reach "localhost"). Includes the
// app's base path when it's hosted in a folder (GitHub Pages: /mykelkaraokehub/).
export function getJoinUrl(code, lanOrigin) {
  const { hostname, origin } = window.location
  const isLocal = hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]'
  const base = isLocal && lanOrigin ? lanOrigin : origin
  return `${base}${import.meta.env.BASE_URL}remote/${encodeURIComponent(code)}`
}

// ---- TV: remember the room across refreshes ----

export function loadHostedRoom() {
  const saved = getItem(STORAGE_KEYS.hostedRoom)
  return saved && typeof saved.code === 'string' && typeof saved.hostToken === 'string' ? saved : null
}

export function saveHostedRoom(room) {
  if (room) setItem(STORAGE_KEYS.hostedRoom, { code: room.code, hostToken: room.hostToken })
  else removeItem(STORAGE_KEYS.hostedRoom)
}

// ---- Phone: who is singing ----

export function getRemoteIdentity() {
  const saved = getItem(STORAGE_KEYS.remoteIdentity)
  if (saved && typeof saved.id === 'string') return { id: saved.id, name: typeof saved.name === 'string' ? saved.name : '' }
  const identity = { id: createId('phone'), name: '' }
  setItem(STORAGE_KEYS.remoteIdentity, identity)
  return identity
}

export function saveRemoteName(name) {
  const identity = { ...getRemoteIdentity(), name: String(name ?? '').trim().slice(0, 40) }
  setItem(STORAGE_KEYS.remoteIdentity, identity)
  return identity
}

// ---- Phone: songs this person sang ----
// A song counts once it starts playing on the TV, requested by this phone.
// Newest first; kept on the phone.

const MAX_SUNG_SONGS = 30

export function getSungSongs() {
  const saved = getItem(STORAGE_KEYS.remoteSungSongs, [])
  return Array.isArray(saved) ? saved.filter((song) => song && typeof song.id === 'string') : []
}

export function recordSungSong(song) {
  const sung = [toRemoteSong(song), ...getSungSongs().filter((s) => s.id !== song.id)].slice(0, MAX_SUNG_SONGS)
  setItem(STORAGE_KEYS.remoteSungSongs, sung)
  return sung
}

// Song fields worth sending to phones (keeps snapshots small).
export function toRemoteSong(song) {
  if (!song) return null
  const { id, title, artist, channel, isOPM, youtubeVideoId, thumbnail } = song
  return { id, title, artist, channel, isOPM, youtubeVideoId, thumbnail }
}
