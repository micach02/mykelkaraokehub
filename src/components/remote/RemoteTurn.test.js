import { describe, expect, it } from 'vitest'
import { estimateWaitSeconds, formatWait, getMyTurn } from './RemoteTurn'

const me = 'phone-me'
const song = (title, duration = null) => ({ id: title, title, duration })
const entry = (title, who, duration) => ({ entryId: title, song: song(title, duration), requestedBy: { id: who } })

describe('"your turn in about N min"', () => {
  const nowPlaying = { song: song('Now', 300), requestedBy: { id: 'phone-jo' }, remaining: 120 }
  const queue = [entry('A', 'phone-jo', 200), entry('B', 'phone-ana'), entry('Mine', me, 180)]

  it('adds what’s left of the current song and the songs ahead (4 min if unknown)', () => {
    const turn = getMyTurn({ nowPlaying, queue, myId: me })
    expect(turn).toMatchObject({ kind: 'waiting', position: 3 })
    // 120 left + 200 (A) + 240 (B, unknown) + 15 s between each of 3 songs
    expect(estimateWaitSeconds({ turn, nowPlaying, isPlaying: false })).toBe(120 + 200 + 240 + 45)
  })

  it('keeps counting down while the song plays', () => {
    const turn = getMyTurn({ nowPlaying, queue, myId: me })
    const receivedAt = 1_000_000
    const later = estimateWaitSeconds({ turn, nowPlaying, isPlaying: true, receivedAt, now: receivedAt + 60_000 })
    expect(later).toBe(120 - 60 + 200 + 240 + 45)
  })

  it('reads nicely', () => {
    expect(formatWait(30)).toBe('in less than a minute')
    expect(formatWait(605)).toBe('in about 10 min')
    expect(getMyTurn({ nowPlaying: { ...nowPlaying, requestedBy: { id: me } }, queue, myId: me }).kind).toBe('now')
  })
})
