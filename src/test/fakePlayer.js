// Stand-in for the YouTube IFrame player (jsdom can't load it).
// Usage in a test file:
//   vi.mock('../services/player/youtubeAdapter', () => import('../test/fakePlayer'))
//   fakePlayers.current.end()   // finish the current song

export const fakePlayers = { current: null, loaded: [] }

export function createYouTubeAdapter(container, handlers) {
  let song = null
  const engine = {
    kind: 'youtube',
    load(next, { autoplay = true } = {}) {
      song = next
      fakePlayers.loaded.push({ id: next.id, autoplay })
      handlers.onStatus('loading')
      queueMicrotask(() => handlers.onStatus(autoplay ? 'playing' : 'ready'))
    },
    play: () => handlers.onStatus('playing'),
    pause: () => handlers.onStatus('paused'),
    stop: () => {
      engine.time = 0 // like the real players, Stop rewinds
      handlers.onStatus('stopped')
    },
    setVolume() {},
    // Tests move the song clock with fakePlayers.current.time = seconds.
    time: 0,
    getCurrentTime: () => engine.time,
    seek(seconds) {
      engine.time = seconds
    },
    setGuideEnabled() {},
    getDuration: () => 180,
    destroy() {},
    end: () => handlers.onStatus('ended'),
    fail: (error) => handlers.onError(error),
    get song() {
      return song
    },
  }
  fakePlayers.current = engine
  return engine
}
