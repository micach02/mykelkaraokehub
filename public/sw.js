// myKelKaraokeHub service worker: makes the app installable and quick to open.
//
// - Pages: network first (always the latest version), the saved copy only
//   when offline.
// - Built files (/assets/…, hashed names never change): cache first.
// - Never touches the karaoke server (/api), YouTube, or other sites.

const CACHE = 'mykel-karaoke-v1'
const SCOPE = new URL(self.registration.scope).pathname // e.g. /mykelkaraokehub/
const SHELL = `${SCOPE}index.html`

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll([SCOPE, SHELL]).catch(() => {}))
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return
  const url = new URL(request.url)
  if (url.origin !== self.location.origin || url.pathname.includes('/api/')) return

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) caches.open(CACHE).then((cache) => cache.put(SHELL, response.clone()))
          return response
        })
        .catch(() => caches.match(SHELL)),
    )
    return
  }

  if (url.pathname.startsWith(`${SCOPE}assets/`)) {
    event.respondWith(
      caches.match(request).then(
        (hit) =>
          hit ||
          fetch(request).then((response) => {
            if (response.ok) caches.open(CACHE).then((cache) => cache.put(request, response.clone()))
            return response
          }),
      ),
    )
  }
})
