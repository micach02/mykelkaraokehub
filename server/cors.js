// CORS for the hosted server: lets the web app (on another origin, e.g.
// GitHub Pages) call the API and open event streams. Only the listed origins
// get access from browsers.

const ALLOWED_HEADERS = 'Content-Type, X-Host-Token'
const ALLOWED_METHODS = 'GET, POST, OPTIONS'

export function createCors(originsSetting = '') {
  const origins = String(originsSetting)
    .split(',')
    .map((o) => o.trim().replace(/\/+$/, ''))
    .filter(Boolean)
  const allowed = new Set(origins)

  return {
    origins,
    // Adds CORS headers for allowed origins. Returns true when the request
    // was a preflight and has been answered.
    handle(req, res) {
      const origin = req.headers.origin
      if (origin && allowed.has(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin)
        res.setHeader('Vary', 'Origin')
      }
      if (req.method !== 'OPTIONS') return false
      if (origin && allowed.has(origin)) {
        res.setHeader('Access-Control-Allow-Methods', ALLOWED_METHODS)
        res.setHeader('Access-Control-Allow-Headers', ALLOWED_HEADERS)
        res.setHeader('Access-Control-Max-Age', '86400')
        res.writeHead(204)
      } else {
        res.writeHead(403)
      }
      res.end()
      return true
    },
  }
}
