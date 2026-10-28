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
// Short waits for a room that disappeared (minutes in the app).
vi.mock('./config/appConfig', async (importOriginal) => {
  const mod = await importOriginal()
  return { ...mod, ROOM_CONFIG: { ...mod.ROOM_CONFIG, remoteWaitMs: 1500, remoteFirstWaitMs: 600, remoteWaitPollMs: 100, remoteTapGuardMs: 300 } }
})

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
    // …and greets the singer on the video for a few seconds.
    expect(within(screen.getByRole('region', { name: 'Karaoke player' })).getByText('Mika, you’re up!')).toBeTruthy()

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

  it('phones may pause/skip only their own song, unless the host allows any', async () => {
    renderApp('/')
    const tv = await waitFor(() => {
      const host = eventSource('host')
      expect(host).toBeTruthy()
      return host
    })
    act(() => tv.emit('open'))
    const mika = { id: 'phone-mika', name: 'Mika' }
    const jo = { id: 'phone-jo', name: 'Jo' }
    act(() => tv.emit('command', { type: 'ADD_TO_QUEUE', payload: { song: SONGS.buwan }, from: mika }))
    act(() => tv.emit('command', { type: 'ADD_TO_QUEUE', payload: { song: SONGS.harana }, from: jo }))
    const queuePanel = within(await screen.findByRole('complementary', { name: 'Song queue' }))
    expect(await queuePanel.findByText('🎤 Buwan')).toBeTruthy()

    // Jo can't skip Mika's song.
    act(() => tv.emit('command', { type: 'SKIP_SONG', payload: {}, from: jo }))
    await new Promise((resolve) => setTimeout(resolve, 50))
    expect(queuePanel.getByText('🎤 Buwan')).toBeTruthy()

    // The host allows any song (Phone Remote panel → Host settings).
    fireEvent.click(screen.getAllByRole('button', { name: /Phone Remote room MKH-ABCDEF/ })[0])
    const panel = within(await screen.findByRole('dialog', { name: '📱 Phone Remote' }))
    const anySong = panel.getByRole('switch', { name: /Phones can pause or skip any song/ })
    expect(anySong.getAttribute('aria-checked')).toBe('false')
    fireEvent.click(anySong)
    expect(panel.getByText('Anyone with the QR code can pause or skip.')).toBeTruthy()
    await waitFor(() => expect(publishedStates().at(-1).body.settings).toMatchObject({ phonesControlAll: true }))

    act(() => tv.emit('command', { type: 'SKIP_SONG', payload: {}, from: jo }))
    expect(await queuePanel.findByText('🎤 Harana')).toBeTruthy()
  })

  it('shows reactions from phones floating over the video', async () => {
    renderApp('/')
    const tv = await waitFor(() => {
      const host = eventSource('host')
      expect(host).toBeTruthy()
      return host
    })
    act(() => tv.emit('open'))
    act(() => tv.emit('command', { type: 'ADD_TO_QUEUE', payload: { song: SONGS.buwan }, from: { id: 'phone-mika', name: 'Mika' } }))
    await screen.findByText('📱 Mika started “Buwan”')
    act(() => tv.emit('command', { type: 'REACT', payload: { emoji: '🔥' }, from: { id: 'phone-jo', name: 'Jo' } }))
    const layer = await waitFor(() => {
      const el = document.querySelector('.reaction-layer')
      expect(el).toBeTruthy()
      return el
    })
    expect(layer.textContent).toContain('🔥')
    expect(layer.textContent).toContain('Jo')
    expect(layer.closest('[aria-label="Karaoke player"]')).toBeTruthy()
  })

  it('shows duets ("Mika & Jo") set from the singer’s phone only', async () => {
    renderApp('/')
    const tv = await waitFor(() => {
      const host = eventSource('host')
      expect(host).toBeTruthy()
      return host
    })
    act(() => tv.emit('open'))
    const mika = { id: 'phone-mika', name: 'Mika' }
    act(() => tv.emit('command', { type: 'ADD_TO_QUEUE', payload: { song: SONGS.buwan }, from: { id: 'phone-ana', name: 'Ana' } }))
    act(() => tv.emit('command', { type: 'ADD_TO_QUEUE', payload: { song: SONGS.harana }, from: mika }))
    const queuePanel = within(await screen.findByRole('complementary', { name: 'Song queue' }))
    await queuePanel.findByText('Harana')
    const entryId = await waitFor(() => {
      const id = publishedStates().at(-1)?.body.queue[0]?.entryId
      expect(id).toBeTruthy()
      return id
    })

    // Someone else can't make Mika's song a duet; Mika can.
    act(() => tv.emit('command', { type: 'SET_DUET', payload: { entryId, partner: 'Troll' }, from: { id: 'phone-x', name: 'X' } }))
    act(() => tv.emit('command', { type: 'SET_DUET', payload: { entryId, partner: 'Jo' }, from: mika }))
    expect(await queuePanel.findByTitle('Requested by Mika, a duet with Jo')).toBeTruthy()
    await waitFor(() => expect(publishedStates().at(-1).body.queue[0].duetWith).toBe('Jo'))
  })

  it('after a server restart, the TV asks for its old room code back (phones need no new QR)', async () => {
    window.localStorage.setItem('mykelkaraokehub:v1:hosted-room', JSON.stringify({ code: 'MKH-ABCDEF', hostToken: 'host-token' }))
    renderApp('/')
    const tv = await waitFor(() => {
      const host = eventSource('host')
      expect(host).toBeTruthy()
      return host
    })
    // The server refused the stream: the room is gone (restart).
    act(() => {
      tv.readyState = 2
      tv.emit('error')
    })
    await waitFor(() => {
      const create = server.calls.find((c) => c.path === '/api/rooms' && c.method === 'POST')
      expect(create?.body).toEqual({ code: 'MKH-ABCDEF', hostToken: 'host-token' })
    })
    expect(await screen.findByText(/Reconnected to the karaoke server\. Same room/)).toBeTruthy()
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

  it('pauses/skips only your own song (unless the host allows any)', async () => {
    const phone = await openRemote()
    join()
    // Jo's song is playing: not yours.
    expect(screen.getByRole('button', { name: 'Skip to the next song' }).disabled).toBe(true)
    expect(screen.getByRole('button', { name: 'Pause on TV' }).disabled).toBe(true)
    expect(screen.getByText('Only the singer can pause or skip this song.')).toBeTruthy()

    // The host allows any song.
    act(() => phone.emit('state', {
      nowPlaying: { song: SONGS.buwan, requestedBy: { id: 'phone-jo', name: 'Jo' } },
      isPlaying: true, queue: [], savedSongs: [], recentSongs: [],
      settings: { phonesControlAll: true, takeTurns: false },
    }))
    expect(screen.getByRole('button', { name: 'Skip to the next song' }).disabled).toBe(false)
    expect(screen.queryByText('Only the singer can pause or skip this song.')).toBeNull()
  })

  it('controls playback of your song and manages your own queued songs', async () => {
    const phone = await openRemote()
    join()
    act(() => phone.emit('state', {
      nowPlaying: { song: SONGS.buwan, requestedBy: { id: me.id, name: 'Mika' } },
      isPlaying: true,
      queue: [{ entryId: 'e1', song: SONGS.harana, requestedBy: { id: me.id, name: 'Mika' } }],
      savedSongs: [], recentSongs: [],
    }))
    fireEvent.click(screen.getByRole('button', { name: 'Skip to the next song' }))
    fireEvent.click(screen.getByRole('button', { name: 'Pause on TV' }))

    fireEvent.click(screen.getByRole('button', { name: /Queue/ }))
    const queue = within(screen.getByRole('list', { name: 'Up next' }))
    expect(queue.getByTitle('Requested by You')).toBeTruthy()
    fireEvent.click(queue.getByRole('button', { name: 'Remove Harana from the queue' }))

    await waitFor(() => expect(commands().map((c) => c.type)).toEqual(['SKIP_SONG', 'TOGGLE_PLAY', 'REMOVE_FROM_QUEUE']))
    expect(commands()[2].payload).toEqual({ entryId: 'e1' })
  })

  it('shows the TV\'s score screen with its countdown; ⏭ goes to the next song', async () => {
    const phone = await openRemote()
    join()
    act(() => phone.emit('state', {
      nowPlaying: { song: SONGS.buwan, requestedBy: { id: me.id, name: 'Mika' } },
      isPlaying: false,
      queue: [{ entryId: 'e2', song: SONGS.harana, requestedBy: { id: 'phone-jo', name: 'Jo' } }],
      savedSongs: [],
      recentSongs: [],
      results: { song: { title: 'Buwan', artist: 'Juan Karlos' }, score: 92, grade: 'EXCELLENT', emoji: '🌟', nextInSeconds: 15 },
    }))
    const card = within(screen.getByRole('region', { name: 'Karaoke score' }))
    expect(card.getByLabelText('Score 92 out of 100, EXCELLENT')).toBeTruthy()
    expect(card.getByText(/Up next: Harana · starts in 1[45]s/)).toBeTruthy()
    const next = card.getByRole('button', { name: /Next song now \(starts by itself in 1[45] seconds\)/ })
    expect(next.textContent).toMatch(/Next song \(1[45]\)/)
    expect(screen.queryByRole('button', { name: 'Pause on TV' })).toBeNull()

    // The score just appeared: a tap that was meant for something else is ignored…
    fireEvent.click(next)
    await new Promise((resolve) => setTimeout(resolve, 350))
    expect(commands()).toEqual([])
    // …a deliberate one goes through.
    fireEvent.click(next)
    expect(await screen.findByText('⏭ Next song')).toBeTruthy()
    await waitFor(() => expect(commands().map((c) => c.type)).toEqual(['SKIP_SONG']))
  })

  it('tells you where your song is in line, and alerts you when it starts', async () => {
    const vibrate = vi.fn()
    Object.defineProperty(navigator, 'vibrate', { value: vibrate, configurable: true })
    try {
      const phone = await openRemote()
      join()
      // openRemote: Jo's song is playing; Mika's Harana is first in line.
      expect(screen.getByText(/⏭ You’re up next, in about \d+ min\. Get ready!/)).toBeTruthy()

      act(() => phone.emit('state', {
        nowPlaying: { song: SONGS.buwan, requestedBy: { id: 'phone-jo', name: 'Jo' } },
        isPlaying: true,
        queue: [
          { entryId: 'e1', song: SONGS.tadhana, requestedBy: { id: 'phone-jo', name: 'Jo' } },
          { entryId: 'e2', song: SONGS.harana, requestedBy: { id: me.id, name: 'Mika' } },
        ],
        savedSongs: [], recentSongs: [],
      }))
      expect(screen.getByText(/🎶 Your next song is #2 in line, in about \d+ min/)).toBeTruthy()

      // Mika's song starts: banner, message, and a buzz (once).
      const mine = { nowPlaying: { song: SONGS.harana, requestedBy: { id: me.id, name: 'Mika' } }, isPlaying: true, queue: [], savedSongs: [], recentSongs: [] }
      act(() => phone.emit('state', mine))
      expect(screen.getByText('🎤 It’s your turn! Sing!')).toBeTruthy()
      expect(await screen.findByText('🎤 It’s your turn! “Harana” is starting.')).toBeTruthy()
      act(() => phone.emit('state', { ...mine, isPlaying: false }))
      expect(vibrate).toHaveBeenCalledTimes(1)
    } finally {
      delete navigator.vibrate
    }
  })

  it('keeps the search tab short: a few artists, the rest behind "More artists"', async () => {
    await openRemote()
    join()
    const artists = () => within(screen.getByRole('group', { name: 'OPM artists' })).getAllByRole('button')
    expect(artists()).toHaveLength(8)
    fireEvent.click(screen.getByRole('button', { name: /More artists/ }))
    expect(artists().length).toBeGreaterThan(8)
    fireEvent.click(screen.getByRole('button', { name: /Fewer artists/ }))
    expect(artists()).toHaveLength(8)
  })

  it('sends reactions to the TV (a couple per second at most)', async () => {
    await openRemote()
    join()
    const reactions = within(screen.getByRole('group', { name: 'Send a reaction to the TV' }))
    fireEvent.click(reactions.getByRole('button', { name: 'React 👏' }))
    fireEvent.click(reactions.getByRole('button', { name: 'React 🔥' })) // too fast: ignored
    await waitFor(() => expect(commands().filter((c) => c.type === 'REACT').map((c) => c.payload)).toEqual([{ emoji: '👏' }]))
  })

  it('keeps reactions away from ⏭, and ignores ⏭ right after an emoji tap', async () => {
    const phone = await openRemote()
    join()
    act(() => phone.emit('state', {
      nowPlaying: { song: SONGS.buwan, requestedBy: { id: me.id, name: 'Mika' } },
      isPlaying: true, queue: [], savedSongs: [], recentSongs: [],
    }))
    const card = screen.getByRole('region', { name: 'Now playing' })
    const reactions = screen.getByRole('group', { name: 'Send a reaction to the TV' })
    expect(card.contains(reactions)).toBe(false) // docked above the tabs instead
    fireEvent.click(within(reactions).getByRole('button', { name: 'React 🎉' }))
    fireEvent.click(screen.getByRole('button', { name: 'Skip to the next song' })) // slipped: ignored
    await waitFor(() => expect(commands().map((c) => c.type)).toEqual(['REACT']))
    await new Promise((resolve) => setTimeout(resolve, 350))
    fireEvent.click(screen.getByRole('button', { name: 'Skip to the next song' }))
    await waitFor(() => expect(commands().map((c) => c.type)).toEqual(['REACT', 'SKIP_SONG']))
  })

  it('shows tonight’s top scores in the queue tab', async () => {
    const phone = await openRemote()
    join()
    act(() => phone.emit('state', {
      nowPlaying: null, isPlaying: false, queue: [], savedSongs: [], recentSongs: [],
      leaderboard: [
        { id: 'a', singer: 'Jo', songTitle: 'Harana', score: 95 },
        { id: 'b', singer: 'Mika', songTitle: 'Buwan', score: 88 },
      ],
    }))
    fireEvent.click(screen.getByRole('button', { name: /Queue/ }))
    const board = within(screen.getByRole('list', { name: 'Tonight’s top scores' }))
    const rows = board.getAllByRole('listitem')
    expect(rows[0].textContent).toContain('👑 Jo')
    expect(rows[0].textContent).toContain('95')
    expect(rows[1].textContent).toContain('Mika')
  })

  it('makes your queued song a duet', async () => {
    await openRemote()
    join()
    fireEvent.click(screen.getByRole('button', { name: /Queue/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Make Harana a duet' }))
    const save = screen.getByRole('button', { name: 'Save' })
    expect(save.disabled).toBe(true)
    fireEvent.change(screen.getByRole('textbox', { name: 'Duet partner for Harana' }), { target: { value: ' Jo ' } })
    fireEvent.click(save)
    expect(await screen.findByText('🎤🎤 Duet with Jo')).toBeTruthy()
    await waitFor(() => expect(commands().at(-1)).toMatchObject({ type: 'SET_DUET', payload: { entryId: 'e1', partner: 'Jo' } }))
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

  it('shows the songs this person sang (not everyone\'s) and live results without pressing Search', async () => {
    const phone = await openRemote()
    join()
    // Nothing sung yet by Mika. (The TV's own history, e.g. El Bimbo, isn't shown.)
    expect(screen.getByRole('heading', { name: /Recently sung by Mika/ })).toBeTruthy()
    expect(screen.getByText(/Songs you sing show up here/)).toBeTruthy()
    expect(screen.queryByText('Ang Huling El Bimbo')).toBeNull()

    // Mika's song starts on the TV → it's in Mika's recently sung songs.
    act(() => phone.emit('state', {
      nowPlaying: { song: SONGS.harana, requestedBy: { id: me.id, name: 'Mika' } },
      isPlaying: true, queue: [], savedSongs: [], recentSongs: [SONGS.elBimbo, SONGS.harana],
    }))
    const recent = within(await screen.findByRole('list', { name: 'Your recently sung songs' }))
    expect(recent.getByText('Harana')).toBeTruthy()
    expect(recent.queryByText('Ang Huling El Bimbo')).toBeNull()
    expect(JSON.parse(window.localStorage.getItem('mykelkaraokehub:v1:remote-sung-songs')).map((x) => x.title)).toEqual(['Harana'])

    // Someone else's song playing doesn't count.
    act(() => phone.emit('state', {
      nowPlaying: { song: SONGS.tadhana, requestedBy: { id: 'phone-jo', name: 'Jo' } },
      isPlaying: true, queue: [], savedSongs: [], recentSongs: [],
    }))
    expect(within(screen.getByRole('list', { name: 'Your recently sung songs' })).queryByText('Tadhana')).toBeNull()

    fireEvent.change(screen.getByRole('searchbox', { name: 'Search songs' }), { target: { value: 'Kathang Isip' } })
    const results = within(await screen.findByRole('list', { name: 'YouTube karaoke results' }, { timeout: 3000 }))
    expect(results.getByText('Kathang Isip')).toBeTruthy()
    expect(searchCalls(server.calls, 'live')).toEqual(['Kathang Isip'])

    // Typing also matches your sung songs instantly.
    fireEvent.change(screen.getByRole('searchbox', { name: 'Search songs' }), { target: { value: 'haran' } })
    expect(within(await screen.findByRole('list', { name: 'Matching songs' })).getByText('Harana')).toBeTruthy()
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

  it('waits a moment for the TV, then explains when the room has ended', async () => {
    server = installMockServer({ roomExists: false })
    renderApp('/remote/MKH-ZZZZZZ')
    expect(await screen.findByRole('heading', { name: 'Waiting for the TV…' })).toBeTruthy()
    expect(await screen.findByRole('heading', { name: 'This karaoke room has ended' }, { timeout: 3000 })).toBeTruthy()
  })

  it('reconnects by itself when the TV brings the same room back (server restarted)', async () => {
    server = installMockServer({ roomExists: false })
    renderApp('/remote/MKH-ABCDEF')
    expect(await screen.findByRole('heading', { name: 'Waiting for the TV…' })).toBeTruthy()
    server.setRoomExists(true) // the TV re-created MKH-ABCDEF
    await waitFor(() => expect(eventSource('remote')).toBeTruthy(), { timeout: 3000 })
    expect(screen.queryByRole('heading', { name: 'Waiting for the TV…' })).toBeNull()
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
