// @vitest-environment node
import { afterEach, describe, expect, it } from 'vitest'
import { createRoomStore, normalizeRoomCode, sanitizeCommand, sanitizeSong } from './rooms.js'

function fakeStream() {
  const stream = {
    events: [],
    closers: [],
    send(event, data) {
      stream.events.push({ event, data })
    },
    onClose(fn) {
      stream.closers.push(fn)
    },
    end() {},
    disconnect() {
      stream.closers.forEach((fn) => fn())
    },
    last(event) {
      return [...stream.events].reverse().find((e) => e.event === event)?.data
    },
  }
  return stream
}

const song = { youtubeVideoId: 'AAAAAAAAAAA', title: 'Buwan', artist: 'Juan Karlos', thumbnail: 'https://i.ytimg.com/vi/AAAAAAAAAAA/hqdefault.jpg' }
const from = { id: 'phone-1', name: 'Mika' }

let store
afterEach(() => store?.close())

describe('room store', () => {
  it('creates rooms with readable codes', () => {
    store = createRoomStore()
    const { code, hostToken } = store.createRoom()
    expect(code).toMatch(/^MKH-[A-Z2-9]{6}$/)
    expect(hostToken.length).toBeGreaterThan(20)
    expect(normalizeRoomCode(code.toLowerCase())).toBe(code)
    expect(store.getRoomInfo(code)).toEqual({ code, hostOnline: false, remotes: 0 })
  })

  it('relays phone commands to the TV and TV state to phones', () => {
    store = createRoomStore()
    const { code, hostToken } = store.createRoom()
    const tv = fakeStream()
    const phone = fakeStream()
    store.attachHost(code, hostToken, tv)
    store.attachRemote(code, phone)
    expect(tv.last('presence')).toEqual({ hostOnline: true, remotes: 1 })

    store.sendCommand(code, { type: 'ADD_TO_QUEUE', payload: { song }, from })
    expect(tv.last('command')).toMatchObject({ type: 'ADD_TO_QUEUE', payload: { song: { id: 'yt-AAAAAAAAAAA', title: 'Buwan' } }, from })

    store.publishState(code, hostToken, { queue: [], nowPlaying: null })
    expect(phone.last('state')).toMatchObject({ queue: [], nowPlaying: null })

    // A phone that joins later gets the latest state right away.
    const late = fakeStream()
    store.attachRemote(code, late)
    expect(late.last('state')).toMatchObject({ queue: [] })
  })

  it('tells phones when the TV is offline', () => {
    store = createRoomStore()
    const { code, hostToken } = store.createRoom()
    const tv = fakeStream()
    const phone = fakeStream()
    store.attachHost(code, hostToken, tv)
    store.attachRemote(code, phone)
    tv.disconnect()
    expect(phone.last('presence')).toEqual({ hostOnline: false, remotes: 1 })
    expect(() => store.sendCommand(code, { type: 'SKIP_SONG', from })).toThrow(expect.objectContaining({ code: 'host-offline', status: 409 }))
  })

  it('only lets the TV publish state', () => {
    store = createRoomStore()
    const { code } = store.createRoom()
    expect(() => store.publishState(code, 'wrong-token', {})).toThrow(expect.objectContaining({ code: 'not-host' }))
    expect(() => store.attachHost(code, 'wrong', fakeStream())).toThrow(expect.objectContaining({ status: 403 }))
  })

  it('reports unknown rooms', () => {
    store = createRoomStore()
    expect(() => store.getRoomInfo('MKH-ZZZZZZ')).toThrow(expect.objectContaining({ code: 'room-not-found', status: 404 }))
    expect(() => store.getRoomInfo('nonsense')).toThrow(expect.objectContaining({ status: 404 }))
  })
})

describe('command validation', () => {
  it('accepts well-formed commands and strips unknown fields', () => {
    const command = sanitizeCommand({ type: 'ADD_TO_QUEUE', payload: { song: { ...song, evil: '<script>' } }, from: { ...from, admin: true } })
    expect(command.payload.song.evil).toBeUndefined()
    expect(command.from).toEqual(from)
  })

  it('rejects bad songs, senders, and command types', () => {
    expect(sanitizeSong({ ...song, youtubeVideoId: 'PLACEHOLDER_001' })).toBeNull()
    expect(sanitizeSong({ ...song, thumbnail: 'https://evil.example/x.png' }).thumbnail).toBeNull()
    expect(sanitizeCommand({ type: 'CLEAR_QUEUE', from })).toBeNull()
    expect(sanitizeCommand({ type: 'SKIP_SONG' })).toBeNull()
    expect(sanitizeCommand({ type: 'ADD_TO_QUEUE', payload: {}, from })).toBeNull()
  })
})
