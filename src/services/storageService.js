// The only module that touches localStorage. Everything else goes through here.
//
// If localStorage is unavailable (private mode, blocked storage, quota full),
// values are kept in memory for the session so the app keeps working.

const NAMESPACE = 'mykelkaraokehub'
const VERSION = 1

const memoryStore = new Map()
let storageAvailable = null

function detectStorage() {
  if (storageAvailable !== null) return storageAvailable
  try {
    const probe = `${NAMESPACE}:probe`
    window.localStorage.setItem(probe, '1')
    window.localStorage.removeItem(probe)
    storageAvailable = true
  } catch {
    storageAvailable = false
  }
  return storageAvailable
}

function fullKey(key) {
  return `${NAMESPACE}:v${VERSION}:${key}`
}

export function isPersistentStorageAvailable() {
  return detectStorage()
}

export function getItem(key, fallback = null) {
  const k = fullKey(key)
  try {
    const raw = detectStorage() ? window.localStorage.getItem(k) : memoryStore.get(k)
    if (raw == null) return fallback
    return JSON.parse(raw)
  } catch {
    // Corrupt JSON or storage error — treat as missing.
    return fallback
  }
}

export function setItem(key, value) {
  const k = fullKey(key)
  const raw = JSON.stringify(value)
  if (detectStorage()) {
    try {
      window.localStorage.setItem(k, raw)
      return true
    } catch {
      // Quota exceeded or storage revoked mid-session: fall back to memory.
      storageAvailable = false
    }
  }
  memoryStore.set(k, raw)
  return false
}

export function removeItem(key) {
  const k = fullKey(key)
  memoryStore.delete(k)
  if (detectStorage()) {
    try {
      window.localStorage.removeItem(k)
    } catch {
      // ignore
    }
  }
}

// Storage keys used by the app, kept in one place.
export const STORAGE_KEYS = {
  session: 'karaoke-session',
  library: 'my-songs',
  recentSongs: 'recent-songs',
  scoreHistory: 'score-history',
  autoScore: 'auto-score',
  hostedRoom: 'hosted-room',
  remoteIdentity: 'remote-identity',
  remoteSungSongs: 'remote-sung-songs',
}

// For tests.
export function __resetStorageForTests() {
  memoryStore.clear()
  storageAvailable = null
}
