// Central place for product names and tunable behavior.
// Keep UI copy that represents the brand here so it stays consistent.

export const BRAND = {
  appName: 'myKelKaraokeHub',
  displayName: 'myKel Karaoke',
  tagline: 'Your Songs. Your Queue. Your Karaoke.',
  logo: '🎤 myKelKaraokeHub',
  logoIcon: '🎤',
}

export const QUEUE_CONFIG = {
  // When false, a song that is already waiting in the queue is not added again.
  // A song can always be queued again once it has finished playing.
  allowDuplicates: false,
  // When the player is idle (nothing loaded), "Add to Queue" starts the song
  // right away instead of leaving it waiting. This is what a jukebox does.
  autoStartWhenIdle: true,
}

export const PLAYER_CONFIG = {
  // After a video fails, skip to the next queued song after this many seconds.
  // Set to 0 to disable the automatic skip.
  autoSkipOnErrorSeconds: 8,
  // If a video hasn't started this long after loading (usually the browser
  // blocking autoplay with sound), show a "Play" button instead.
  autoplayTimeoutMs: 6000,
  defaultVolume: 100,
  // The video ignores taps (watch-only), except its bottom-right corner,
  // where YouTube's ad "Skip" button appears (tap it right away). The backup
  // "🔓 Unlock video" opens the whole video for this long.
  adUnlockSeconds: 15,
}

export const SEARCH_CONFIG = {
  // Instant filtering of your own songs (My Songs, Recently sung).
  debounceMs: 200,
  // Live YouTube search waits for a pause in typing. The karaoke server
  // answers from its cache when it can and caps live YouTube calls per day
  // (see server/youtubeSearch.js), so typing can't burn the daily quota.
  liveDebounceMs: 550,
  minQueryLength: 2,
}

export const ROOM_CONFIG = {
  // How often the TV may publish its queue to phones (ms).
  publishThrottleMs: 250,
}
