// Fetch wrapper for the karaoke server's /api endpoints.
//
// Locally the server shares the app's address (Vite runs it). When the app is
// hosted on its own (GitHub Pages), VITE_API_BASE points at the server, e.g.
// https://mykelkaraokehub.onrender.com.

export const API_BASE = String(import.meta.env.VITE_API_BASE ?? '').replace(/\/+$/, '')
export const IS_HOSTED_SERVER = API_BASE !== ''

// '/api/status' → full URL of that endpoint.
export function apiUrl(path) {
  return `${API_BASE}${path}`
}

const OFFLINE_MESSAGE = IS_HOSTED_SERVER
  ? "Can't reach the karaoke server. It may be waking up (free hosting sleeps when idle). Try again in a minute."
  : "Can't reach the karaoke server. Make sure it's running (npm run dev) and you're on the same Wi-Fi."

export class ApiError extends Error {
  constructor(code, message, status = 0) {
    super(message)
    this.name = 'ApiError'
    this.code = code
    this.status = status
  }
}

async function request(path, { method = 'GET', body, headers, signal } = {}) {
  let response
  try {
    response = await fetch(apiUrl(path), {
      method,
      signal,
      headers: body === undefined ? headers : { 'Content-Type': 'application/json', ...headers },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch (error) {
    if (error.name === 'AbortError') throw error
    throw new ApiError('server-offline', OFFLINE_MESSAGE)
  }

  let data = null
  try {
    data = await response.json()
  } catch {
    // Empty or non-JSON body.
  }
  if (!response.ok) {
    const error = data?.error
    throw new ApiError(error?.code ?? 'http', error?.message ?? `Request failed (HTTP ${response.status}).`, response.status)
  }
  return data
}

export function apiGet(path, options) {
  return request(path, options)
}

export function apiPost(path, body = {}, options) {
  return request(path, { ...options, method: 'POST', body })
}
