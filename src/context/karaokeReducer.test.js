import { describe, expect, it } from 'vitest'
import {
  ActionTypes,
  canAddToQueue,
  initialState,
  karaokeReducer,
  sanitizePersistedSession,
  toPersistedSession,
} from './karaokeReducer'

// Songs are YouTube videos: an 11-character video ID is required.
const song = (id, title = id) => ({ id, title, artist: 'Artist', youtubeVideoId: id.padEnd(11, 'x').slice(0, 11) })
const buwan = song('opm-001', 'Buwan')
const kathangIsip = song('opm-002', 'Kathang Isip')
const harana = song('opm-004', 'Harana')
const beer = song('opm-022', 'Beer')

const run = (actions, state = initialState) => actions.reduce(karaokeReducer, state)
const add = (s, entryId, extra = {}) => ({ type: ActionTypes.ADD_TO_QUEUE, payload: { song: s, entryId, ...extra } })
const play = (s, entryId) => ({ type: ActionTypes.PLAY_SONG, payload: { song: s, entryId } })
const titles = (state) => state.queue.map((e) => e.song.title)

describe('karaokeReducer', () => {
  it('Play Now makes the song current and keeps the queue', () => {
    const state = run([add(kathangIsip, 'e1'), add(harana, 'e2'), play(buwan, 'p1')])
    expect(state.currentSong).toBe(buwan)
    expect(state.currentEntryId).toBe('p1')
    expect(titles(state)).toEqual(['Kathang Isip', 'Harana'])
  })

  it('Play Now on a queued song takes it out of the queue', () => {
    const state = run([add(kathangIsip, 'e1'), add(harana, 'e2'), play(harana, 'p1')])
    expect(state.currentSong).toBe(harana)
    expect(titles(state)).toEqual(['Kathang Isip'])
  })

  it('adds songs to the end of the queue', () => {
    const state = run([play(buwan, 'p1'), add(kathangIsip, 'e1'), add(harana, 'e2')])
    expect(titles(state)).toEqual(['Kathang Isip', 'Harana'])
  })

  it('does not add a song that is already queued', () => {
    const state = run([add(kathangIsip, 'e1'), add(kathangIsip, 'e2')])
    expect(titles(state)).toEqual(['Kathang Isip'])
    expect(canAddToQueue(state, kathangIsip)).toMatchObject({ ok: false, reason: 'duplicate', message: 'Song already in queue' })
  })

  it('allows duplicates when configured', () => {
    const state = run([add(kathangIsip, 'e1'), add(kathangIsip, 'e2', { allowDuplicates: true })])
    expect(titles(state)).toEqual(['Kathang Isip', 'Kathang Isip'])
  })

  it('auto-starts the first song when the player is idle', () => {
    const state = run([add(buwan, 'e1', { autoStart: true }), add(harana, 'e2', { autoStart: true })])
    expect(state.currentSong).toBe(buwan)
    expect(titles(state)).toEqual(['Harana'])
  })

  it('allows queueing a song again after it finished', () => {
    let state = run([play(buwan, 'p1'), add(harana, 'e1')])
    state = karaokeReducer(state, { type: ActionTypes.SONG_ENDED, payload: { entryId: 'p1' } })
    expect(state.currentSong).toBe(harana)
    state = karaokeReducer(state, add(buwan, 'e2'))
    expect(titles(state)).toEqual(['Buwan'])
  })

  it('removes a specific queue entry', () => {
    const state = run([add(kathangIsip, 'e1'), add(harana, 'e2'), add(beer, 'e3'), { type: ActionTypes.REMOVE_FROM_QUEUE, payload: { entryId: 'e2' } }])
    expect(titles(state)).toEqual(['Kathang Isip', 'Beer'])
  })

  it('reorders the queue and ignores out-of-range moves', () => {
    let state = run([add(kathangIsip, 'e1'), add(harana, 'e2'), add(beer, 'e3')])
    state = karaokeReducer(state, { type: ActionTypes.REORDER_QUEUE, payload: { fromIndex: 2, toIndex: 0 } })
    expect(titles(state)).toEqual(['Beer', 'Kathang Isip', 'Harana'])
    const same = karaokeReducer(state, { type: ActionTypes.REORDER_QUEUE, payload: { fromIndex: 0, toIndex: 5 } })
    expect(same).toBe(state)
  })

  it('skip plays the next queued song', () => {
    const state = run([play(buwan, 'p1'), add(kathangIsip, 'e1'), add(harana, 'e2'), { type: ActionTypes.SKIP_SONG }])
    expect(state.currentSong).toBe(kathangIsip)
    expect(state.currentEntryId).toBe('e1')
    expect(state.autoplay).toBe(true)
    expect(titles(state)).toEqual(['Harana'])
  })

  it('song ended with an empty queue goes idle and remembers the last song', () => {
    const state = run([play(buwan, 'p1'), { type: ActionTypes.SONG_ENDED, payload: { entryId: 'p1' } }])
    expect(state.currentSong).toBeNull()
    expect(state.playbackStatus).toBe('idle')
    expect(state.lastPlayedSong).toBe(buwan)
  })

  it('ignores a stale ended event from a previous song', () => {
    const before = run([play(buwan, 'p1'), add(harana, 'e1'), play(beer, 'p2')])
    const after = karaokeReducer(before, { type: ActionTypes.SONG_ENDED, payload: { entryId: 'p1' } })
    expect(after).toBe(before)
  })

  it('remembers who requested a song through to when it plays', () => {
    const mika = { id: 'phone-1', name: 'Mika' }
    let state = run([play(buwan, 'p1'), add(harana, 'e1', { requestedBy: mika })])
    expect(state.currentRequestedBy).toBeNull()
    state = karaokeReducer(state, { type: ActionTypes.SKIP_SONG })
    expect(state.currentSong).toBe(harana)
    expect(state.currentRequestedBy).toEqual(mika)
    state = karaokeReducer(state, { type: ActionTypes.SKIP_SONG })
    expect(state.currentRequestedBy).toBeNull()
    expect(run([add(beer, 'e2', { autoStart: true, requestedBy: mika })]).currentRequestedBy).toEqual(mika)
  })

  it('clears the queue but keeps the current song', () => {
    const state = run([play(buwan, 'p1'), add(harana, 'e1'), { type: ActionTypes.CLEAR_QUEUE }])
    expect(state.queue).toEqual([])
    expect(state.currentSong).toBe(buwan)
  })

  it('clamps volume and tracks playback status', () => {
    let state = karaokeReducer(initialState, { type: ActionTypes.SET_VOLUME, payload: { volume: 150 } })
    expect(state.volume).toBe(100)
    state = karaokeReducer(state, { type: ActionTypes.SET_VOLUME, payload: { volume: -5 } })
    expect(state.volume).toBe(0)
    state = run([play(buwan, 'p1'), { type: ActionTypes.SET_PLAYBACK_STATUS, payload: { status: 'playing', entryId: 'p1' } }], state)
    expect(state.isPlaying).toBe(true)
  })

  it('restores a saved session without autoplaying', () => {
    const saved = toPersistedSession(run([play(buwan, 'p1'), add(harana, 'e1')]))
    const restored = karaokeReducer(initialState, {
      type: ActionTypes.RESTORE_SESSION,
      payload: { ...sanitizePersistedSession(JSON.parse(JSON.stringify(saved))), entryId: 'r1' },
    })
    expect(restored.currentSong.title).toBe('Buwan')
    expect(restored.autoplay).toBe(false)
    expect(titles(restored)).toEqual(['Harana'])
  })

  it('sanitizes corrupt saved data', () => {
    expect(sanitizePersistedSession('nope')).toBeNull()
    const placeholder = { id: 'opm-009', title: 'Old', youtubeVideoId: 'PLACEHOLDER_009' }
    expect(sanitizePersistedSession({ queue: [{ entryId: 1 }, { entryId: 'ok', song: buwan }, { entryId: 'old', song: placeholder }], currentSong: placeholder })).toEqual({
      currentSong: null,
      currentRequestedBy: null,
      queue: [{ entryId: 'ok', song: buwan }],
      volume: null,
      isMuted: false,
    })
  })
})

describe('requester persistence', () => {
  it('keeps who requested the current song across a refresh', () => {
    const mika = { id: 'phone-1', name: 'Mika' }
    const before = karaokeReducer(initialState, { type: ActionTypes.ADD_TO_QUEUE, payload: { song: buwan, entryId: 'e1', autoStart: true, requestedBy: mika } })
    const saved = sanitizePersistedSession(JSON.parse(JSON.stringify(toPersistedSession(before))))
    const restored = karaokeReducer(initialState, { type: ActionTypes.RESTORE_SESSION, payload: { ...saved, entryId: 'r1' } })
    expect(restored.currentSong).toEqual(buwan)
    expect(restored.currentRequestedBy).toEqual(mika)
  })
})
