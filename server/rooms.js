// Karaoke rooms: one TV/PC (the host) and any number of phone remotes.
//
//   phone ──POST /commands──▶ server ──SSE "command"──▶ TV
//   TV    ──POST /state─────▶ server ──SSE "state"────▶ phones
//
// The TV stays the single source of truth: it applies commands to its own
// queue and publishes a snapshot. Rooms live in memory; restarting the server
// ends them (the TV then offers to create a new one).

import crypto from 'node:crypto'
import { ApiError } from './http.js'

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // no 0/O/1/I
const CODE_PATTERN = /^MKH-[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$/
const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/
const ROOM_IDLE_MS = 12 * 60 * 60 * 1000

export const REMOTE_COMMANDS = ['ADD_TO_QUEUE', 'REMOVE_FROM_QUEUE', 'SKIP_SONG', 'TOGGLE_PLAY']

export function generateRoomCode() {
  const bytes = crypto.randomBytes(6)
  let code = ''
  for (const byte of bytes) code += CODE_ALPHABET[byte % CODE_ALPHABET.length]
  return `MKH-${code}`
}

export function normalizeRoomCode(code) {
  const value = String(code ?? '').trim().toUpperCase()
  return CODE_PATTERN.test(value) ? value : null
}

function text(value, max) {
  return typeof value === 'string' ? value.trim().slice(0, max) : ''
}

// Only well-formed YouTube songs get through, with known fields only.
export function sanitizeSong(song) {
  if (!song || typeof song !== 'object' || !VIDEO_ID.test(song.youtubeVideoId ?? '')) return null
  const thumbnail = text(song.thumbnail, 300)
  return {
    id: `yt-${song.youtubeVideoId}`,
    title: text(song.title, 200) || 'Untitled',
    artist: text(song.artist, 120),
    channel: text(song.channel, 120),
    category: 'YouTube',
    isOPM: Boolean(song.isOPM),
    source: 'youtube',
    youtubeVideoId: song.youtubeVideoId,
    thumbnail: thumbnail.startsWith('https://i.ytimg.com/') ? thumbnail : null,
  }
}

export function sanitizeSender(from) {
  const id = text(from?.id, 64)
  if (!id) return null
  return { id, name: text(from?.name, 40) }
}

export function sanitizeCommand(command) {
  if (!command || !REMOTE_COMMANDS.includes(command.type)) return null
  const from = sanitizeSender(command.from)
  if (!from) return null
  switch (command.type) {
    case 'ADD_TO_QUEUE': {
      const song = sanitizeSong(command.payload?.song)
      return song ? { type: command.type, payload: { song }, from } : null
    }
    case 'REMOVE_FROM_QUEUE': {
      const entryId = text(command.payload?.entryId, 120)
      return entryId ? { type: command.type, payload: { entryId }, from } : null
    }
    default:
      return { type: command.type, payload: {}, from }
  }
}

export function createRoomStore({ now = () => Date.now() } = {}) {
  const rooms = new Map()

  function requireRoom(code) {
    const normalized = normalizeRoomCode(code)
    const room = normalized && rooms.get(normalized)
    if (!room) throw new ApiError(404, 'room-not-found', 'This karaoke room no longer exists. Scan the QR code on the TV again.')
    room.lastActive = now()
    return room
  }

  function requireHost(code, token) {
    const room = requireRoom(code)
    const expected = Buffer.from(room.hostToken)
    const given = Buffer.from(String(token ?? ''))
    if (expected.length !== given.length || !crypto.timingSafeEqual(expected, given)) {
      throw new ApiError(403, 'not-host', 'Only the TV that created this room can do that.')
    }
    return room
  }

  function presence(room) {
    return { hostOnline: room.hosts.size > 0, remotes: room.remotes.size }
  }

  function broadcastPresence(room) {
    const info = presence(room)
    room.hosts.forEach((stream) => stream.send('presence', info))
    room.remotes.forEach((stream) => stream.send('presence', info))
  }

  // Forget rooms nobody has used for a long time.
  const sweeper = setInterval(() => {
    for (const [code, room] of rooms) {
      if (room.hosts.size === 0 && room.remotes.size === 0 && now() - room.lastActive > ROOM_IDLE_MS) rooms.delete(code)
    }
  }, 10 * 60 * 1000)
  sweeper.unref?.()

  return {
    createRoom() {
      let code = generateRoomCode()
      while (rooms.has(code)) code = generateRoomCode()
      const room = {
        code,
        hostToken: crypto.randomBytes(24).toString('hex'),
        state: null,
        hosts: new Set(),
        remotes: new Set(),
        lastActive: now(),
      }
      rooms.set(code, room)
      return { code, hostToken: room.hostToken }
    },

    assertHost(code, token) {
      requireHost(code, token)
    },

    getRoomInfo(code) {
      const room = requireRoom(code)
      return { code: room.code, ...presence(room) }
    },

    attachHost(code, token, stream) {
      const room = requireHost(code, token)
      room.hosts.add(stream)
      stream.onClose(() => {
        room.hosts.delete(stream)
        room.lastActive = now()
        broadcastPresence(room)
      })
      broadcastPresence(room)
    },

    attachRemote(code, stream) {
      const room = requireRoom(code)
      room.remotes.add(stream)
      if (room.state) stream.send('state', room.state)
      stream.onClose(() => {
        room.remotes.delete(stream)
        room.lastActive = now()
        broadcastPresence(room)
      })
      broadcastPresence(room)
    },

    publishState(code, token, state) {
      const room = requireHost(code, token)
      room.state = { ...state, updatedAt: now() }
      room.remotes.forEach((stream) => stream.send('state', room.state))
    },

    sendCommand(code, rawCommand) {
      const room = requireRoom(code)
      const command = sanitizeCommand(rawCommand)
      if (!command) throw new ApiError(400, 'bad-command', "That request isn't valid.")
      if (room.hosts.size === 0) {
        throw new ApiError(409, 'host-offline', "The TV isn't connected right now. Make sure myKel Karaoke is open on the TV.")
      }
      room.hosts.forEach((stream) => stream.send('command', command))
      return command
    },

    close() {
      clearInterval(sweeper)
      for (const room of rooms.values()) {
        ;[...room.hosts, ...room.remotes].forEach((stream) => stream.end?.())
      }
      rooms.clear()
    },
  }
}
