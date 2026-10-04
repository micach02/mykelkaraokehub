import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import App from './App'
import { installMockServer, realSearches, searchCalls, SONGS } from './test/fixtures'
import { fakePlayers } from './test/fakePlayer'
import { clearSessionSearchCache } from './services/youtubeService'
import { __reloadLibraryForTests } from './services/libraryService'
import { __resetServerStatusForTests } from './hooks/useServerStatus'
import { __reloadRecentSongsForTests } from './services/historyService'

vi.mock('./services/player/youtubeAdapter', () => import('./test/fakePlayer'))

const SESSION_KEY = 'mykelkaraokehub:v1:karaoke-session'
let server

function renderApp(path = '/') {
  window.history.replaceState({}, '', path)
  return render(<App />)
}

const sidebar = () => within(screen.getByRole('complementary', { name: 'Song queue' }))
const upNextTitles = () =>
  sidebar()
    .queryAllByRole('listitem')
    .map((li) => li.querySelector('.queue-item__title').textContent)

async function searchYouTube(text) {
  const search = await screen.findByRole('searchbox', { name: 'Search songs' })
  fireEvent.change(search, { target: { value: text } })
  fireEvent.submit(search.closest('form'))
  return within(await screen.findByRole('list', { name: 'YouTube karaoke results' }))
}

beforeEach(() => {
  window.localStorage.clear()
  clearSessionSearchCache()
  __reloadLibraryForTests()
  __reloadRecentSongsForTests()
  __resetServerStatusForTests()
  globalThis.FakeEventSource.instances.length = 0
  fakePlayers.current = null
  fakePlayers.loaded = []
  server = installMockServer()
})

describe('myKelKaraokeHub (TV)', () => {
  it('shows branding, browse categories, vibes, and OPM artists', async () => {
    renderApp()
    expect(screen.getByRole('heading', { level: 1, name: 'What do you want to sing tonight?' })).toBeTruthy()
    expect(screen.getByText(/myKelKaraokeHub/, { selector: '.hero__brand' })).toBeTruthy()
    expect(screen.getByText(/Your Songs\. Your Queue\. Your Karaoke\./, { selector: '.hero__brand-tagline' })).toBeTruthy()
    expect(within(screen.getByRole('group', { name: 'Vibes' })).getByRole('button', { name: '🎸 90s Pinoy rock' })).toBeTruthy()
    expect(screen.getByRole('link', { name: /OPM Hits/ })).toBeTruthy()
    expect(within(screen.getByRole('group', { name: 'OPM artists' })).getByRole('button', { name: 'Eraserheads' })).toBeTruthy()
    // My Songs is hidden until something is saved.
    expect(screen.queryByRole('link', { name: /My Songs/ })).toBeNull()
  })

  it('shows YouTube results live as you type, after a pause', async () => {
    renderApp()
    const search = await screen.findByRole('searchbox', { name: 'Search songs' })
    fireEvent.change(search, { target: { value: 'B' } })
    fireEvent.change(search, { target: { value: 'Bu' } })
    fireEvent.change(search, { target: { value: 'Buwan' } })
    const results = within(await screen.findByRole('list', { name: 'YouTube karaoke results' }, { timeout: 3000 }))
    expect(results.getByText('Buwan')).toBeTruthy()
    // One live request for the final text — not one per keystroke — and no Enter needed.
    expect(searchCalls(server.calls, 'live')).toEqual(['Buwan'])
    expect(realSearches(server.calls)).toEqual([])
  })

  it('offers a full search when live search is out of budget', async () => {
    server = installMockServer({ liveLimited: true })
    renderApp()
    const search = await screen.findByRole('searchbox', { name: 'Search songs' })
    fireEvent.change(search, { target: { value: 'Buwan' } })
    fireEvent.click(await screen.findByRole('button', { name: 'Search YouTube' }, { timeout: 3000 }))
    const results = within(await screen.findByRole('list', { name: 'YouTube karaoke results' }))
    expect(results.getByText('Buwan')).toBeTruthy()
    expect(realSearches(server.calls)).toEqual(['Buwan'])
  })

  it('remembers picked songs in "Recently sung" and suggests more from those artists', async () => {
    renderApp()
    const results = await searchYouTube('opm')
    fireEvent.click(results.getByRole('button', { name: 'Add Buwan to queue' }))
    fireEvent.click(results.getByRole('button', { name: 'Play Kathang Isip by Ben&Ben now' }))
    fireEvent.change(screen.getByRole('searchbox', { name: 'Search songs' }), { target: { value: '' } })

    const recent = within(await screen.findByRole('list', { name: 'Recently sung' }))
    expect(recent.getAllByRole('heading', { level: 3 }).map((h) => h.textContent)).toEqual(['Kathang Isip', 'Buwan'])
    const suggestions = within(screen.getByRole('group', { name: 'Suggestions' }))
    expect(suggestions.getByRole('button', { name: '✨ More Ben&Ben' })).toBeTruthy()
    expect(suggestions.getByRole('button', { name: '✨ More Juan Karlos' })).toBeTruthy()

    // Typing matches your own songs instantly, before YouTube answers.
    fireEvent.change(screen.getByRole('searchbox', { name: 'Search songs' }), { target: { value: 'kathang' } })
    const instant = within(await screen.findByRole('list', { name: 'Matching songs you sang or saved' }))
    expect(instant.getByText('Kathang Isip')).toBeTruthy()
  })

  it('adds to queue, starts when idle, and blocks duplicates', async () => {
    renderApp()
    const results = await searchYouTube('opm')

    fireEvent.click(results.getByRole('button', { name: 'Add Buwan to queue' }))
    expect(await screen.findByText('▶ Now playing: Buwan')).toBeTruthy()
    expect(sidebar().getByText('🎤 Buwan')).toBeTruthy()
    expect(fakePlayers.loaded.at(-1)).toEqual({ id: SONGS.buwan.id, autoplay: true })

    fireEvent.click(results.getByRole('button', { name: 'Add Kathang Isip to queue' }))
    expect(await screen.findByText('✓ Added to queue')).toBeTruthy()
    expect(upNextTitles()).toEqual(['Kathang Isip'])

    fireEvent.click(results.getByRole('button', { name: 'Kathang Isip is already in the queue' }))
    expect(await screen.findByText('Song already in queue')).toBeTruthy()
    expect(upNextTitles()).toEqual(['Kathang Isip'])

    const saved = JSON.parse(window.localStorage.getItem(SESSION_KEY))
    expect(saved.currentSong.title).toBe('Buwan')
    expect(saved.queue.map((e) => e.song.title)).toEqual(['Kathang Isip'])
  })

  it('starting a song scrolls back to the top; queueing behind it does not', async () => {
    const scrollTo = vi.spyOn(window, 'scrollTo')
    renderApp()
    const results = await searchYouTube('opm')
    const scrolledToTop = () => scrollTo.mock.calls.filter(([arg]) => arg?.top === 0).length

    fireEvent.click(results.getByRole('button', { name: 'Add Buwan to queue' })) // idle → starts playing
    expect(scrolledToTop()).toBe(1)
    fireEvent.click(results.getByRole('button', { name: 'Add Harana to queue' })) // queued behind Buwan
    fireEvent.click(results.getByRole('button', { name: 'Add Tadhana to queue' }))
    expect(scrolledToTop()).toBe(1) // stay put to keep adding songs
    fireEvent.click(results.getByRole('button', { name: 'Play Kathang Isip by Ben&Ben now' }))
    expect(scrolledToTop()).toBe(2)
    fireEvent.click(sidebar().getByRole('button', { name: /^Play Tadhana .* now/ }))
    expect(scrolledToTop()).toBe(3)
    scrollTo.mockRestore()
  })

  it('Play Now keeps the queue; skip, reorder, remove, and clear work', async () => {
    renderApp()
    const results = await searchYouTube('opm')
    fireEvent.click(results.getByRole('button', { name: 'Play Kathang Isip by Ben&Ben now' }))
    fireEvent.click(results.getByRole('button', { name: 'Add Harana to queue' }))
    fireEvent.click(results.getByRole('button', { name: 'Add Buwan to queue' }))
    fireEvent.click(results.getByRole('button', { name: 'Add Ang Huling El Bimbo to queue' }))
    expect(upNextTitles()).toEqual(['Harana', 'Buwan', 'Ang Huling El Bimbo'])

    fireEvent.click(results.getByRole('button', { name: 'Play Tadhana by Up Dharma Down now' }))
    expect(sidebar().getByText('🎤 Tadhana')).toBeTruthy()
    expect(upNextTitles()).toEqual(['Harana', 'Buwan', 'Ang Huling El Bimbo'])

    fireEvent.click(sidebar().getByRole('button', { name: 'Move Ang Huling El Bimbo up' }))
    expect(upNextTitles()).toEqual(['Harana', 'Ang Huling El Bimbo', 'Buwan'])
    fireEvent.keyDown(sidebar().getByRole('button', { name: /Reorder Harana/ }), { key: 'ArrowDown' })
    expect(upNextTitles()).toEqual(['Ang Huling El Bimbo', 'Harana', 'Buwan'])

    fireEvent.click(sidebar().getByRole('button', { name: 'Remove Harana from queue' }))
    expect(upNextTitles()).toEqual(['Ang Huling El Bimbo', 'Buwan'])

    fireEvent.click(sidebar().getByRole('button', { name: 'Skip Tadhana' }))
    expect(sidebar().getByText('🎤 Ang Huling El Bimbo')).toBeTruthy()
    expect(upNextTitles()).toEqual(['Buwan'])

    fireEvent.click(sidebar().getByRole('button', { name: 'Clear' }))
    const dialog = await screen.findByRole('dialog', { name: 'Clear the queue?' })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Clear queue' }))
    expect(upNextTitles()).toEqual([])
    expect(sidebar().getByText('🎤 Ang Huling El Bimbo')).toBeTruthy()
  })

  it('plays the next song automatically, then shows the empty-queue state', async () => {
    renderApp()
    const results = await searchYouTube('opm')
    fireEvent.click(results.getByRole('button', { name: 'Add Buwan to queue' }))
    fireEvent.click(results.getByRole('button', { name: 'Add Harana to queue' }))
    await waitFor(() => expect(fakePlayers.current?.song?.id).toBe(SONGS.buwan.id))

    act(() => fakePlayers.current.end())
    expect(sidebar().getByText('🎤 Harana')).toBeTruthy()
    await waitFor(() => expect(fakePlayers.current.song.id).toBe(SONGS.harana.id))

    act(() => fakePlayers.current.end())
    expect(await screen.findByRole('button', { name: /Sing “Harana” again/ })).toBeTruthy()
    expect(screen.getByText('Choose another song to continue singing.', { selector: '.player-overlay__text' })).toBeTruthy()
  })

  it('restores the queue without autoplaying and drops old placeholder songs', async () => {
    const placeholder = { id: 'opm-001', title: 'Old demo song', artist: 'x', youtubeVideoId: 'PLACEHOLDER_001' }
    window.localStorage.setItem(SESSION_KEY, JSON.stringify({
      currentSong: SONGS.kathangIsip,
      queue: [
        { entryId: 'saved-1', song: SONGS.harana, addedAt: 1 },
        { entryId: 'saved-2', song: placeholder, addedAt: 2 },
      ],
      volume: 60,
      isMuted: false,
    }))
    renderApp()
    expect(sidebar().getByText('🎤 Kathang Isip')).toBeTruthy()
    expect(upNextTitles()).toEqual(['Harana'])
    expect(await screen.findByRole('button', { name: 'Play Kathang Isip' })).toBeTruthy()
    expect(fakePlayers.loaded.at(-1)).toEqual({ id: SONGS.kathangIsip.id, autoplay: false })
    expect(screen.getByRole('slider', { name: 'Volume' }).value).toBe('60')
  })

  it('opening a category runs its YouTube search', async () => {
    renderApp('/categories/love')
    const results = within(await screen.findByRole('list', { name: 'YouTube karaoke results' }))
    expect(results.getByText('Kathang Isip')).toBeTruthy()
    expect(realSearches(server.calls)).toEqual(['OPM love songs karaoke'])
  })

  it('saves songs to My Songs and shows them on Home', async () => {
    renderApp()
    const results = await searchYouTube('buwan')
    fireEvent.click(results.getByRole('button', { name: 'Save Buwan to My Songs' }))
    expect(await screen.findByText('★ Saved to My Songs')).toBeTruthy()
    fireEvent.change(screen.getByRole('searchbox', { name: 'Search songs' }), { target: { value: '' } })
    const mySongs = within(await screen.findByRole('list', { name: 'My saved songs' }))
    expect(mySongs.getByText('Buwan')).toBeTruthy()
    expect(screen.getByRole('link', { name: /My Songs/ })).toBeTruthy()
  })

  it('explains when YouTube search is not set up', async () => {
    server = installMockServer({ configured: false })
    renderApp()
    expect(await screen.findByText(/YouTube search isn't set up yet/)).toBeTruthy()
  })

  it('Karaoke Mode: large controls and adding songs from the picker', async () => {
    renderApp('/karaoke')
    expect(await screen.findByRole('button', { name: 'Add Songs' })).toBeTruthy()
    expect(screen.queryByRole('complementary', { name: 'Song queue' })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Add Songs' }))
    const picker = await screen.findByRole('dialog', { name: 'Add songs' })
    const search = within(picker).getByRole('searchbox', { name: 'Search songs to add' })
    fireEvent.change(search, { target: { value: 'Buwan' } })
    fireEvent.submit(search.closest('form'))
    fireEvent.click(await within(picker).findByRole('button', { name: 'Add Buwan to queue' }))
    expect(await screen.findByText('▶ Now playing: Buwan')).toBeTruthy()
  })
})
