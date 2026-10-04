import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import App from './App'
import { installMockServer, searchCalls, SONGS } from './test/fixtures'
import { fakePlayers } from './test/fakePlayer'
import { clearSessionSearchCache } from './services/youtubeService'
import { __reloadLibraryForTests } from './services/libraryService'
import { __resetServerStatusForTests } from './hooks/useServerStatus'
import { __reloadRecentSongsForTests } from './services/historyService'

vi.mock('./services/player/youtubeAdapter', () => import('./test/fakePlayer'))

let server

function renderApp(path) {
  window.history.replaceState({}, '', path)
  return render(<App />)
}

const eventSource = (role) => globalThis.FakeEventSource.instances.findLast((es) => es.url.includes(`role=${role}`))
const commands = () => server.calls.filter((c) => c.path.endsWith('/commands')).map((c) => c.body)
const publishedStates = () => server.calls.filter((c) => c.path.endsWith('/state'))

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

describe('Phone Remote — TV side', () => {
  it('shows the room QR code on the landing page and applies commands from phones', async () => {
    renderApp('/')
    // The landing page starts a room by itself and shows its QR code above the search box.
    const hero = within(screen.getByRole('region', { name: /What do you want to/ }))
    expect(await hero.findByRole('img', { name: 'QR code to join room MKH-ABCDEF' })).toBeTruthy()
    expect(hero.getByText('📱 Scan to add songs')).toBeTruthy()
    const qrCard = hero.getByRole('button', { name: /Scan to add songs from your phone. Room MKH-ABCDEF/ })
    expect(qrCard.compareDocumentPosition(hero.getByRole('searchbox', { name: 'Search songs' })) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy() // above the search box
    expect(server.calls.filter((c) => c.path === '/api/rooms' && c.method === 'POST')).toHaveLength(1)

    // Tapping it shows the bigger QR code and the share options.
    fireEvent.click(qrCard)
    const panel = await screen.findByRole('dialog', { name: '📱 Phone Remote' })
    expect(within(panel).getByRole('img', { name: 'QR code to join room MKH-ABCDEF' })).toBeTruthy()
    // Opened as localhost, so the QR uses the computer's Wi-Fi address.
    expect(within(panel).getByText('http://192.168.1.50:5173/remote/MKH-ABCDEF')).toBeTruthy()
    expect(JSON.parse(window.localStorage.getItem('mykelkaraokehub:v1:hosted-room'))).toEqual({ code: 'MKH-ABCDEF', hostToken: 'host-token' })

    const tv = eventSource('host')
    expect(tv.url).toContain('/api/rooms/MKH-ABCDEF/events')
    expect(tv.url).toContain('token=host-token')
    act(() => {
      tv.emit('open')
      tv.emit('presence', { hostOnline: true, remotes: 1 })
    })
    expect(within(panel).getByText(/Live · 1 phone connected/)).toBeTruthy()
    fireEvent.click(within(panel).getByRole('button', { name: 'Done' }))

    // A phone adds a song: it starts on the TV (idle player) with the singer's name.
    const mika = { id: 'phone-mika', name: 'Mika' }
    act(() => tv.emit('command', { type: 'ADD_TO_QUEUE', payload: { song: SONGS.buwan }, from: mika }))
    expect(await screen.findByText('📱 Mika started “Buwan”')).toBeTruthy()
    const queuePanel = within(screen.getByRole('complementary', { name: 'Song queue' }))
    expect(queuePanel.getByText('🎤 Buwan')).toBeTruthy()
    expect(queuePanel.getByTitle('Requested by Mika')).toBeTruthy()
    // The player's Now Playing bar shows the requester too.
    expect(within(screen.getByRole('region', { name: 'Karaoke player' })).getByTitle('Requested by Mika')).toBeTruthy()

    act(() => tv.emit('command', { type: 'ADD_TO_QUEUE', payload: { song: SONGS.harana }, from: mika }))
    expect(await queuePanel.findByText('Harana')).toBeTruthy()
    const haranaRow = queuePanel.getByRole('button', { name: 'Play Harana by Parokya ni Edgar now, requested by Mika' })
    expect(within(haranaRow).getByTitle('Requested by Mika')).toBeTruthy()

    // A phone that skipped the name prompt shows as "Guest".
    act(() => tv.emit('command', { type: 'ADD_TO_QUEUE', payload: { song: SONGS.tadhana }, from: { id: 'phone-2', name: '' } }))
    expect(await queuePanel.findByRole('button', { name: /Play Tadhana .* requested by Guest/ })).toBeTruthy()
    fireEvent.click(queuePanel.getByRole('button', { name: 'Remove Tadhana from queue' }))

    // The TV publishes its queue for phones.
    await waitFor(() => {
      const last = publishedStates().at(-1)
      expect(last?.headers?.['X-Host-Token']).toBe('host-token')
      expect(last.body.nowPlaying).toMatchObject({ song: { title: 'Buwan' }, requestedBy: mika })
      expect(last.body.queue.map((e) => e.song.title)).toEqual(['Harana'])
      // Songs picked from phones land in "Recently sung", which phones see too.
      expect(last.body.recentSongs.map((s) => s.title)).toEqual(['Tadhana', 'Harana', 'Buwan'])
    })
    const entryId = publishedStates().at(-1).body.queue[0].entryId

    // Phones can only remove their own songs.
    act(() => tv.emit('command', { type: 'REMOVE_FROM_QUEUE', payload: { entryId }, from: { id: 'someone-else', name: 'Jo' } }))
    expect(queuePanel.getByText('Harana')).toBeTruthy()
    act(() => tv.emit('command', { type: 'REMOVE_FROM_QUEUE', payload: { entryId }, from: mika }))
    await waitFor(() => expect(queuePanel.queryByText('Harana')).toBeNull())

    act(() => tv.emit('command', { type: 'SKIP_SONG', payload: {}, from: mika }))
    expect(await screen.findByText('📱 Mika skipped “Buwan”')).toBeTruthy()
  })

  it('an ended room stays ended: the landing page offers to start one instead', async () => {
    renderApp('/')
    const hero = within(screen.getByRole('region', { name: /What do you want to/ }))
    fireEvent.click(await hero.findByRole('button', { name: /Scan to add songs from your phone/ }))
    fireEvent.click(within(await screen.findByRole('dialog', { name: '📱 Phone Remote' })).getByRole('button', { name: 'End room' }))
    expect(await hero.findByRole('button', { name: /Phone Remote: let phones add songs/ })).toBeTruthy()
    expect(hero.queryByRole('img', { name: /QR code to join room/ })).toBeNull()
    expect(server.calls.filter((c) => c.path === '/api/rooms' && c.method === 'POST')).toHaveLength(1)
  })
})

describe('Phone Remote — phone side', () => {
  const me = { id: 'phone-me', name: '' }

  async function openRemote() {
    window.localStorage.setItem('mykelkaraokehub:v1:remote-identity', JSON.stringify(me))
    renderApp('/remote/MKH-ABCDEF')
    await waitFor(() => expect(eventSource('remote')).toBeTruthy())
    const phone = eventSource('remote')
    act(() => {
      phone.emit('open')
      phone.emit('state', {
        nowPlaying: { song: SONGS.buwan, requestedBy: { id: 'phone-jo', name: 'Jo' } },
        isPlaying: true,
        queue: [{ entryId: 'e1', song: SONGS.harana, requestedBy: { id: me.id, name: 'Mika' } }],
        savedSongs: [SONGS.tadhana],
        recentSongs: [SONGS.elBimbo],
      })
    })
    return phone
  }

  // The join screen: a name is required before choosing songs.
  function join(name = 'Mika') {
    fireEvent.change(screen.getByRole('textbox', { name: /What's your name/ }), { target: { value: name } })
    fireEvent.click(screen.getByRole('button', { name: 'Join' }))
  }

  it('shows the TV queue, searches YouTube, and adds songs', async () => {
    await openRemote()
    // After scanning: a name first (it shows on the TV next to your songs).
    expect(screen.getByRole('heading', { name: 'Join the karaoke' })).toBeTruthy()
    expect(screen.getByText('Buwan', { selector: 'strong' })).toBeTruthy() // what's playing on the TV
    expect(screen.queryByRole('searchbox', { name: 'Search songs' })).toBeNull() // no songs yet
    expect(screen.queryByRole('button', { name: 'Skip' })).toBeNull() // can't skip it
    const joinButton = screen.getByRole('button', { name: 'Join' })
    expect(joinButton.disabled).toBe(true)
    fireEvent.change(screen.getByRole('textbox', { name: /What's your name/ }), { target: { value: '   ' } })
    expect(joinButton.disabled).toBe(true) // spaces aren't a name
    join('Mika')
    expect(screen.getByRole('button', { name: /Mika ✎/ })).toBeTruthy()
    expect(JSON.parse(window.localStorage.getItem('mykelkaraokehub:v1:remote-identity')).name).toBe('Mika')

    const now = within(screen.getByRole('region', { name: 'Now playing' }))
    expect(now.getByText('Buwan')).toBeTruthy()
    expect(now.getByTitle('Requested by Jo')).toBeTruthy()
    // Up next is a song this phone added.
    expect(now.getByTitle('Requested by You')).toBeTruthy()

    // The TV's saved songs are one tap away.
    const saved = within(await screen.findByRole('list', { name: 'Saved songs' }))
    fireEvent.click(saved.getByRole('button', { name: 'Add Tadhana to the queue' }))
    expect(await screen.findByText('✓ Added “Tadhana”')).toBeTruthy()

    // Search YouTube and add.
    const search = screen.getByRole('searchbox', { name: 'Search songs' })
    fireEvent.change(search, { target: { value: 'Kathang Isip' } })
    fireEvent.submit(search.closest('form'))
    const results = within(await screen.findByRole('list', { name: 'YouTube karaoke results' }))
    fireEvent.click(results.getByRole('button', { name: 'Add Kathang Isip to the queue' }))
    expect(await screen.findByText('✓ Added “Kathang Isip”')).toBeTruthy()

    expect(commands()).toEqual([
      expect.objectContaining({ type: 'ADD_TO_QUEUE', payload: { song: expect.objectContaining({ youtubeVideoId: SONGS.tadhana.youtubeVideoId }) }, from: { id: me.id, name: 'Mika' } }),
      expect.objectContaining({ type: 'ADD_TO_QUEUE', payload: { song: expect.objectContaining({ title: 'Kathang Isip' }) } }),
    ])
  })

  it('controls playback and manages your own queued songs', async () => {
    await openRemote()
    join()
    fireEvent.click(screen.getByRole('button', { name: 'Skip to the next song' }))
    fireEvent.click(screen.getByRole('button', { name: 'Pause on TV' }))

    fireEvent.click(screen.getByRole('button', { name: /Queue/ }))
    const queue = within(screen.getByRole('list', { name: 'Up next' }))
    expect(queue.getByTitle('Requested by You')).toBeTruthy()
    fireEvent.click(queue.getByRole('button', { name: 'Remove Harana from the queue' }))

    await waitFor(() => expect(commands().map((c) => c.type)).toEqual(['SKIP_SONG', 'TOGGLE_PLAY', 'REMOVE_FROM_QUEUE']))
    expect(commands()[2].payload).toEqual({ entryId: 'e1' })
  })

  it('blocks adding a song that is already queued', async () => {
    await openRemote()
    join()
    const search = screen.getByRole('searchbox', { name: 'Search songs' })
    fireEvent.change(search, { target: { value: 'buwan' } })
    fireEvent.submit(search.closest('form'))
    const results = within(await screen.findByRole('list', { name: 'YouTube karaoke results' }))
    // Buwan is playing on the TV already.
    fireEvent.click(results.getByRole('button', { name: 'Buwan is in the queue' }))
    expect(await screen.findByText('Already in the queue')).toBeTruthy()
    expect(commands()).toEqual([])
  })

  it('shows the TV\'s recently sung songs and live results without pressing Search', async () => {
    await openRemote()
    join()
    const recent = within(screen.getByRole('list', { name: 'Recently sung' }))
    fireEvent.click(recent.getByRole('button', { name: 'Add Ang Huling El Bimbo to the queue' }))
    expect(await screen.findByText('✓ Added “Ang Huling El Bimbo”')).toBeTruthy()

    fireEvent.change(screen.getByRole('searchbox', { name: 'Search songs' }), { target: { value: 'Kathang Isip' } })
    const results = within(await screen.findByRole('list', { name: 'YouTube karaoke results' }, { timeout: 3000 }))
    expect(results.getByText('Kathang Isip')).toBeTruthy()
    expect(searchCalls(server.calls, 'live')).toEqual(['Kathang Isip'])

    // Typing also matches the TV's own songs instantly.
    fireEvent.change(screen.getByRole('searchbox', { name: 'Search songs' }), { target: { value: 'bimbo' } })
    expect(within(await screen.findByRole('list', { name: 'Matching songs' })).getByText('Ang Huling El Bimbo')).toBeTruthy()
  })

  it('lets anyone in the room invite friends: QR on the phone, share, copy, and messaging links', async () => {
    await openRemote()
    join()
    // The room code in the header opens the Invite tab too.
    fireEvent.click(screen.getByRole('button', { name: 'Room MKH-ABCDEF. Invite friends' }))

    const invite = within(screen.getByRole('region', { name: 'Invite friends' }))
    const url = 'http://192.168.1.50:5173/remote/MKH-ABCDEF' // Wi-Fi address, since this test page runs on localhost
    expect(invite.getByRole('img', { name: 'QR code to join room MKH-ABCDEF' })).toBeTruthy()
    expect(await invite.findByText(url)).toBeTruthy()
    // Now Playing is hidden so the QR code has room to be scanned.
    expect(screen.queryByRole('region', { name: 'Now playing' })).toBeNull()

    // No share sheet on plain http:// → no Share button, but Copy still works.
    expect(invite.queryByRole('button', { name: /Share…/ })).toBeNull()
    document.execCommand = vi.fn(() => true)
    fireEvent.click(invite.getByRole('button', { name: /Copy link/ }))
    expect(await screen.findByText('✓ Link copied')).toBeTruthy()
    expect(document.execCommand).toHaveBeenCalledWith('copy')

    const viber = invite.getByRole('link', { name: 'Send the room link by Viber' })
    expect(decodeURIComponent(viber.getAttribute('href'))).toContain(url)
    expect(invite.getByRole('link', { name: 'Send the room link by Messenger' }).getAttribute('href')).toContain('fb-messenger://share')
    const whatsapp = invite.getByRole('link', { name: 'Send the room link by WhatsApp' }).getAttribute('href')
    expect(whatsapp).toMatch(/^https:\/\/wa\.me\/\?text=/)
    expect(decodeURIComponent(whatsapp)).toContain(url)
    expect(decodeURIComponent(invite.getByRole('link', { name: 'Send the room link by Text message' }).getAttribute('href'))).toContain(url)
  })

  it('uses the phone share sheet when the browser offers one', async () => {
    const share = vi.fn(async () => {})
    Object.defineProperty(navigator, 'share', { value: share, configurable: true })
    try {
      await openRemote()
      join()
      fireEvent.click(screen.getByRole('button', { name: /Invite/, pressed: false }))
      const invite = within(screen.getByRole('region', { name: 'Invite friends' }))
      await invite.findByText('http://192.168.1.50:5173/remote/MKH-ABCDEF')
      fireEvent.click(invite.getByRole('button', { name: /Share…/ }))
      await waitFor(() => expect(share).toHaveBeenCalledWith(expect.objectContaining({ url: 'http://192.168.1.50:5173/remote/MKH-ABCDEF' })))
    } finally {
      delete navigator.share
    }
  })

  it('explains when the room has ended', async () => {
    server = installMockServer({ roomExists: false })
    renderApp('/remote/MKH-ZZZZZZ')
    expect(await screen.findByRole('heading', { name: 'This karaoke room has ended' })).toBeTruthy()
  })

  it('warns when the TV is offline', async () => {
    const phone = await openRemote()
    act(() => phone.emit('presence', { hostOnline: false, remotes: 1 }))
    expect(screen.getByText(/The TV isn't connected/)).toBeTruthy() // already on the join screen
    join()
    expect(screen.getByText(/The TV isn't connected/)).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Skip to the next song' }).disabled).toBe(true)
  })
})
