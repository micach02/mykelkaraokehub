import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import App from './App'
import { installMockServer, SONGS } from './test/fixtures'
import { fakePlayers } from './test/fakePlayer'
import { fakeMic, MicrophoneError } from './test/fakeMicrophone'
import { clearSessionSearchCache } from './services/youtubeService'
import { __reloadLibraryForTests } from './services/libraryService'
import { __reloadRecentSongsForTests } from './services/historyService'
import { __reloadScoreHistoryForTests, getPersonalBest } from './services/scoringHistoryService'
import { setItem, STORAGE_KEYS } from './services/storageService'
import { __resetServerStatusForTests } from './hooks/useServerStatus'

vi.mock('./services/player/youtubeAdapter', () => import('./test/fakePlayer'))
vi.mock('./services/scoring/audioAnalysisProvider', () => import('./test/fakeMicrophone'))
// Short countdown/calibration so the flow runs quickly. The results' auto-next
// delay is off unless a test sets it (session.resultsAutoNextSeconds).
const session = vi.hoisted(() => ({}))
vi.mock('./config/scoringConfig', async (importOriginal) => {
  const mod = await importOriginal()
  Object.assign(session, mod.SCORING_SESSION, { countdownSeconds: 1, calibrationSeconds: 0.3, calibrationAutoContinueMs: 1000, resultsAutoNextSeconds: 0 })
  return { ...mod, SCORING_SESSION: session }
})

const VOICE = { rms: 0.08, frequency: 220, clarity: 0.97, midi: 57 } // A3, in tune

// Each test walks the whole flow (search, mic check, 1 s countdown, singing).
vi.setConfig({ testTimeout: 20000 })

beforeEach(() => {
  window.localStorage.clear()
  clearSessionSearchCache()
  __reloadLibraryForTests()
  __reloadRecentSongsForTests()
  __reloadScoreHistoryForTests()
  __resetServerStatusForTests()
  fakePlayers.current = null
  fakePlayers.loaded = []
  Object.assign(fakeMic, { analyzer: null, permission: 'prompt', failWith: null, supported: true })
  session.resultsAutoNextSeconds = 0
  URL.createObjectURL = vi.fn(() => 'blob:recording')
  URL.revokeObjectURL = vi.fn()
  installMockServer()
})

// Auto-score is on by default.
function autoScoreOff() {
  setItem(STORAGE_KEYS.autoScore, false)
}

// Buwan playing, Harana queued.
async function setUpQueue() {
  window.history.replaceState({}, '', '/')
  render(<App />)
  const search = await screen.findByRole('searchbox', { name: 'Search songs' })
  fireEvent.change(search, { target: { value: 'opm' } })
  fireEvent.submit(search.closest('form'))
  const results = within(await screen.findByRole('list', { name: 'YouTube karaoke results' }, { timeout: 5000 }))
  fireEvent.click(results.getByRole('button', { name: 'Add Buwan to queue' }))
  fireEvent.click(results.getByRole('button', { name: 'Add Harana to queue' }))
  await waitFor(() => expect(fakePlayers.current?.song?.id).toBe(SONGS.buwan.id))
}

const autoSwitch = () => screen.getByRole('switch', { name: /Auto-score/ })
// The small ● Recording badge over the video while a song is scored.
const scoringBadge = () => screen.queryByLabelText('Scoring: recording your singing')

const control = (name) => screen.getAllByRole('button', { name })[0]

// First-time mic setup → mic check → countdown → singing (opened by the song
// starting, or by turning Auto-score on).
async function startSinging() {
  const permission = await screen.findByRole('dialog', { name: '🎤 Microphone Access Required' }, { timeout: 5000 })
  expect(within(permission).getByText(/analyzed locally in your browser and is not uploaded/)).toBeTruthy()
  expect(within(permission).getByText(/Voice score:/)).toBeTruthy() // no melody guide for this video
  fireEvent.click(within(permission).getByRole('button', { name: 'Allow Microphone' }))

  const check = await screen.findByRole('dialog', { name: '🎤 Microphone Check' }, { timeout: 5000 })
  for (let i = 0; i < 6; i += 1) act(() => fakeMic.analyzer.emit(VOICE))
  expect(await within(check).findByText(/Microphone level: GOOD/, {}, { timeout: 2000 })).toBeTruthy()
  // GOOD → on to the countdown by itself (no Continue press).

  expect(await screen.findByText('Get Ready!', {}, { timeout: 4000 })).toBeTruthy()
  expect(screen.queryByRole('dialog', { name: '🎤 Microphone Check' })).toBeNull()
  await screen.findByLabelText('Scoring: recording your singing', {}, { timeout: 3000 })
  expect(fakeMic.analyzer.recording).toBe(true)
  expect(fakePlayers.current.time).toBe(0) // song restarted from the top
}

// Sing for `seconds` of song time (30 frames per second).
function sing(seconds, frame = VOICE, from = fakePlayers.current.time) {
  act(() => {
    for (let i = 1; i <= seconds * 30; i += 1) {
      fakePlayers.current.time = from + i / 30
      fakeMic.analyzer.emit(frame)
    }
  })
}

describe('karaoke scoring', () => {
  it('starts by itself when a song starts, scores it, then scores the next song without interrupting it', async () => {
    await setUpQueue()
    expect(autoSwitch().getAttribute('aria-checked')).toBe('true')
    await startSinging() // no button press: the song starting opened the mic setup
    expect(within(scoringBadge()).getByText('Recording')).toBeTruthy()
    expect(document.querySelector('.live-score')).toBeNull() // no live score while singing

    sing(4)

    // Song ends → results (the queue waits).
    act(() => fakePlayers.current.end())
    const results = await screen.findByRole('dialog', { name: 'Karaoke Score' }, { timeout: 5000 })
    expect(within(results).getByLabelText(/Karaoke Score \d+ out of 100/)).toBeTruthy()
    expect(within(results).getByText('🏆 NEW PERSONAL BEST!')).toBeTruthy()
    // The final score, the stats, and the recording.
    expect(within(results).getByText(/Notes sung/)).toBeTruthy()
    expect(within(results).getByText(/Avg. pitch deviation/)).toBeTruthy()
    expect(within(results).getByText(/Time singing/)).toBeTruthy()
    expect(within(results).queryByText(/Avg. timing deviation/)).toBeNull() // no melody guide: timing isn't invented
    expect(within(results).queryByText(/Judge’s Feedback/)).toBeNull()
    expect(within(results).queryByText(/Vocal Stability/)).toBeNull() // no breakdown
    const save = within(results).getByRole('link', { name: /Save recording/ })
    expect(save.getAttribute('href')).toBe('blob:recording')
    expect(save.getAttribute('download')).toMatch(/^mykel-karaoke-buwan-\d+\.webm$/)
    expect(within(results).getByLabelText('Your recording').querySelector('audio').getAttribute('src')).toBe('blob:recording')
    expect(within(results).getByRole('button', { name: /Next Song/ })).toBeTruthy()
    const firstMic = fakeMic.analyzer
    expect(firstMic.closed).toBe(true) // microphone released
    expect(fakePlayers.current.song.id).toBe(SONGS.buwan.id)
    expect(getPersonalBest(SONGS.buwan.id).score).toBeGreaterThan(80)

    // Next song: mic allowed and checked → recording starts right away.
    fakePlayers.current.time = 0
    fireEvent.click(within(results).getByRole('button', { name: /Next Song/ }))
    await waitFor(() => expect(fakePlayers.current.song.id).toBe(SONGS.harana.id))
    expect(screen.queryByRole('dialog', { name: 'Karaoke Score' })).toBeNull()
    await waitFor(() => expect(scoringBadge()).toBeTruthy())
    expect(fakeMic.analyzer).not.toBe(firstMic)
    expect(fakeMic.analyzer.recording).toBe(true)
    expect(screen.queryByText('Get Ready!')).toBeNull() // no countdown, no dialogs
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('a quiet mic check waits for the singer instead of continuing by itself', async () => {
    await setUpQueue()
    const permission = await screen.findByRole('dialog', { name: '🎤 Microphone Access Required' }, { timeout: 5000 })
    fireEvent.click(within(permission).getByRole('button', { name: 'Allow Microphone' }))
    const check = await screen.findByRole('dialog', { name: '🎤 Microphone Check' }, { timeout: 5000 })
    for (let i = 0; i < 6; i += 1) act(() => fakeMic.analyzer.emit({ ...VOICE, rms: 0.006 }))
    expect(await within(check).findByText(/too low|quiet/i, {}, { timeout: 2000 })).toBeTruthy()
    await new Promise((resolve) => setTimeout(resolve, 1200)) // longer than the auto-continue delay
    expect(screen.getByRole('dialog', { name: '🎤 Microphone Check' })).toBeTruthy()
    expect(screen.queryByText('Get Ready!')).toBeNull()
    fireEvent.click(within(check).getByRole('button', { name: 'Continue anyway' }))
    expect(await screen.findByText('Get Ready!')).toBeTruthy()
  })

  it('"Not now" turns auto-score off instead of asking every song', async () => {
    await setUpQueue()
    const permission = await screen.findByRole('dialog', { name: '🎤 Microphone Access Required' }, { timeout: 5000 })
    fireEvent.click(within(permission).getByRole('button', { name: 'Not now' }))
    expect(await screen.findByText(/Auto-score is off/)).toBeTruthy()
    expect(autoSwitch().getAttribute('aria-checked')).toBe('false')
    expect(fakePlayers.current.song.id).toBe(SONGS.buwan.id)

    // The next song just plays.
    act(() => fakePlayers.current.end())
    await waitFor(() => expect(fakePlayers.current.song.id).toBe(SONGS.harana.id))
    await new Promise((resolve) => setTimeout(resolve, 50))
    expect(screen.queryByRole('dialog', { name: '🎤 Microphone Access Required' })).toBeNull()
    expect(scoringBadge()).toBeNull()
  })

  it('auto-score: skipping a song stops its take and scores the next one', async () => {
    await setUpQueue()
    await startSinging()
    const firstMic = fakeMic.analyzer
    sing(2)
    fakePlayers.current.time = 0
    fireEvent.click(within(screen.getByRole('complementary', { name: 'Song queue' })).getByRole('button', { name: 'Skip Buwan' }))
    await waitFor(() => expect(fakePlayers.current.song.id).toBe(SONGS.harana.id))
    expect(firstMic.closed).toBe(true)
    expect(screen.queryByRole('dialog', { name: 'Karaoke Score' })).toBeNull() // no misleading score
    await waitFor(() => expect(fakeMic.analyzer).not.toBe(firstMic))
    await waitFor(() => expect(fakeMic.analyzer.recording).toBe(true))
  })

  it('after the results, the next song plays by itself after a few seconds', async () => {
    session.resultsAutoNextSeconds = 2 // 20 in the app
    await setUpQueue()
    await startSinging()
    sing(3)
    act(() => fakePlayers.current.end())
    const results = await screen.findByRole('dialog', { name: 'Karaoke Score' }, { timeout: 5000 })
    expect(within(results).getByRole('button', { name: /Next Song \([12]\)/ })).toBeTruthy() // counting down
    fakePlayers.current.time = 0
    await waitFor(() => expect(fakePlayers.current.song.id).toBe(SONGS.harana.id), { timeout: 6000 })
    expect(screen.queryByRole('dialog', { name: 'Karaoke Score' })).toBeNull()
    // Advanced exactly once: Harana isn't skipped too, it plays and is scored.
    await new Promise((resolve) => setTimeout(resolve, 300))
    await waitFor(() => expect(scoringBadge()).toBeTruthy())
  })

  it('plays the score counter sound when the final score appears (not when muted)', async () => {
    const play = vi.spyOn(window.HTMLMediaElement.prototype, 'play')
    await setUpQueue()
    await startSinging()
    sing(3)
    act(() => fakePlayers.current.end())
    await screen.findByRole('dialog', { name: 'Karaoke Score' }, { timeout: 5000 })
    expect(play).toHaveBeenCalledTimes(1)
    const sound = play.mock.instances[0]
    expect(sound.src).toMatch(/mixkit-score-casino-counter-1998/)
    expect(sound.volume).toBeCloseTo(0.8)

    // Muted → the next score screen is silent.
    fireEvent.click(within(screen.getByRole('dialog', { name: 'Karaoke Score' })).getByRole('button', { name: /Sing Again/ }))
    fireEvent.click(screen.getAllByRole('button', { name: 'Mute' })[0])
    await screen.findByLabelText('Scoring: recording your singing', {}, { timeout: 4000 })
    sing(3, VOICE, 0)
    act(() => fakePlayers.current.end())
    await screen.findByRole('dialog', { name: 'Karaoke Score' }, { timeout: 5000 })
    expect(play).toHaveBeenCalledTimes(1)
    play.mockRestore()
  })

  it('Sing Again restarts the song (mic setup remembered)', async () => {
    await setUpQueue()
    await startSinging()
    sing(3)
    act(() => fakePlayers.current.end())
    const results = await screen.findByRole('dialog', { name: 'Karaoke Score' }, { timeout: 5000 })
    expect(within(results).getByLabelText(/Karaoke Score \d+ out of 100/)).toBeTruthy()

    // Second time: permission + mic check are remembered → straight to the countdown.
    fireEvent.click(within(results).getByRole('button', { name: /Sing Again/ }))
    expect(await screen.findByText('Get Ready!')).toBeTruthy()
    expect(screen.queryByRole('dialog', { name: '🎤 Microphone Check' })).toBeNull()
    expect(fakePlayers.current.song.id).toBe(SONGS.buwan.id)
  })

  it('⏹ Stop drops the take; ▶ Play scores the song again from the top', async () => {
    await setUpQueue()
    await startSinging()
    const firstMic = fakeMic.analyzer
    sing(3)
    fireEvent.click(control('Stop'))
    expect(await screen.findByText(/Press ▶ Play to sing again from the top/)).toBeTruthy()
    expect(firstMic.closed).toBe(true)
    expect(scoringBadge()).toBeNull()
    expect(screen.queryByRole('dialog', { name: 'Karaoke Score' })).toBeNull()

    fireEvent.click(control('Play'))
    await waitFor(() => expect(scoringBadge()).toBeTruthy())
    expect(fakeMic.analyzer).not.toBe(firstMic)
    expect(fakeMic.analyzer.recording).toBe(true)
    expect(screen.queryByRole('dialog')).toBeNull() // mic already set up: no dialogs
  })

  it('with Auto-score off, songs just play', async () => {
    autoScoreOff()
    await setUpQueue()
    expect(autoSwitch().getAttribute('aria-checked')).toBe('false')
    await new Promise((resolve) => setTimeout(resolve, 50))
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(scoringBadge()).toBeNull()
    expect(screen.queryByRole('button', { name: /Start Singing/ })).toBeNull() // the switch is the only control
  })

  it('turning Auto-score on mid-song scores that song from the top', async () => {
    autoScoreOff()
    await setUpQueue()
    fakePlayers.current.time = 42
    fireEvent.click(autoSwitch())
    expect(autoSwitch().getAttribute('aria-checked')).toBe('true')
    await startSinging() // mic setup, 3-2-1, song back to 0:00
  })

  it('phones see the score and countdown, and ⏭ on a phone is the Next Song button', async () => {
    session.resultsAutoNextSeconds = 20
    const server = installMockServer()
    await setUpQueue()
    // The landing page's room (see HomeRoomQr): connect the TV's event stream.
    const tv = await waitFor(() => {
      const host = globalThis.FakeEventSource.instances.filter((es) => es.url.includes('role=host')).at(-1)
      expect(host).toBeTruthy()
      return host
    })
    act(() => tv.emit('open'))
    await startSinging()
    sing(4)
    act(() => fakePlayers.current.end())
    const results = await screen.findByRole('dialog', { name: 'Karaoke Score' }, { timeout: 5000 })
    const score = Number(within(results).getByLabelText(/Karaoke Score \d+ out of 100/).textContent.match(/\d+/)[0])

    // Phones get the score and how long until the next song starts.
    await waitFor(() => {
      const published = server.calls.filter((c) => c.path.endsWith('/state')).at(-1)?.body
      expect(published?.results).toMatchObject({ song: { title: 'Buwan' }, score })
      expect(published.results.nextInSeconds).toBeGreaterThan(15)
    })

    // A phone presses ⏭ → same as Next Song on the TV.
    act(() => tv.emit('command', { type: 'SKIP_SONG', payload: {}, from: { id: 'phone-mika', name: 'Mika' } }))
    expect(await screen.findByText('📱 Mika: next song')).toBeTruthy()
    await waitFor(() => expect(fakePlayers.current.song.id).toBe(SONGS.harana.id))
    expect(screen.queryByRole('dialog', { name: 'Karaoke Score' })).toBeNull()
    await waitFor(() => expect(server.calls.filter((c) => c.path.endsWith('/state')).at(-1).body.results).toBeNull())
  })

  it('a song nobody sang gets no score: no results screen, straight to the next song', async () => {
    await setUpQueue()
    await startSinging()
    sing(4, { rms: 0.001, frequency: null, clarity: 0, midi: null })
    const firstMic = fakeMic.analyzer
    act(() => fakePlayers.current.end())
    expect(await screen.findByText(/No singing heard/)).toBeTruthy()
    await waitFor(() => expect(fakePlayers.current.song.id).toBe(SONGS.harana.id))
    expect(screen.queryByRole('dialog', { name: 'Karaoke Score' })).toBeNull()
    expect(getPersonalBest(SONGS.buwan.id)).toBeNull()
    expect(firstMic.closed).toBe(true)
  })

  it('explains a blocked microphone, then stops auto-score asking', async () => {
    fakeMic.failWith = new MicrophoneError('denied', 'Microphone access was blocked.')
    await setUpQueue()
    fireEvent.click(await screen.findByRole('button', { name: 'Allow Microphone' }, { timeout: 5000 }))
    const dialog = await screen.findByRole('dialog', { name: 'Microphone problem detected' })
    expect(within(dialog).getByText('Microphone access was blocked.')).toBeTruthy()
    fireEvent.click(within(dialog).getByRole('button', { name: 'Got it' }))
    expect(await screen.findByText(/Auto-score is off/)).toBeTruthy()
    expect(autoSwitch().getAttribute('aria-checked')).toBe('false')
  })

  it('explains unsupported browsers, and normal playback keeps working', async () => {
    fakeMic.supported = false
    await setUpQueue()
    expect(autoSwitch().getAttribute('aria-checked')).toBe('false') // can't run here…
    expect(screen.queryByRole('dialog')).toBeNull()
    fireEvent.click(autoSwitch()) // …and tapping it says why
    expect(await screen.findByRole('dialog', { name: 'Karaoke scoring unavailable' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Got it' }))
    act(() => fakePlayers.current.end())
    await waitFor(() => expect(fakePlayers.current.song.id).toBe(SONGS.harana.id))
  })

  it('shows practice tracks with melody scoring on Home', async () => {
    window.history.replaceState({}, '', '/')
    render(<App />)
    const practice = within(await screen.findByRole('list', { name: 'Practice tracks' }))
    expect(practice.getByText('Twinkle, Twinkle, Little Star')).toBeTruthy()
    expect(practice.getAllByText('🎯 Melody scoring')).toHaveLength(2)
  })
})
