// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { createCors } from './cors.js'
import { createRateLimiter } from './rateLimit.js'

function fakeRes() {
  const res = {
    headers: {},
    status: null,
    ended: false,
    setHeader(name, value) {
      res.headers[name.toLowerCase()] = value
    },
    writeHead(status) {
      res.status = status
    },
    end() {
      res.ended = true
    },
  }
  return res
}

describe('CORS for the hosted server', () => {
  const cors = createCors('https://micach02.github.io/, https://example.com')

  it('allows the GitHub Pages site and answers its preflight', () => {
    const res = fakeRes()
    const handled = cors.handle({ method: 'OPTIONS', headers: { origin: 'https://micach02.github.io' } }, res)
    expect(handled).toBe(true)
    expect(res.status).toBe(204)
    expect(res.headers['access-control-allow-origin']).toBe('https://micach02.github.io')
    expect(res.headers['access-control-allow-headers']).toContain('X-Host-Token')

    const get = fakeRes()
    expect(cors.handle({ method: 'GET', headers: { origin: 'https://micach02.github.io' } }, get)).toBe(false)
    expect(get.headers['access-control-allow-origin']).toBe('https://micach02.github.io')
  })

  it('gives other websites no access', () => {
    const res = fakeRes()
    expect(cors.handle({ method: 'OPTIONS', headers: { origin: 'https://evil.example' } }, res)).toBe(true)
    expect(res.status).toBe(403)
    const get = fakeRes()
    cors.handle({ method: 'GET', headers: { origin: 'https://evil.example' } }, get)
    expect(get.headers['access-control-allow-origin']).toBeUndefined()
  })
})

describe('rate limits', () => {
  it('limits each IP address per window, then resets', () => {
    let time = 0
    const limiter = createRateLimiter({
      rules: [{ name: 'search', match: (req) => req.url.startsWith('/api/youtube/search'), limit: 2, windowMs: 1000 }],
      now: () => time,
    })
    const from = (ip, url = '/api/youtube/search?q=a') => ({ url, headers: { 'x-forwarded-for': `${ip}, 10.0.0.1` }, socket: {} })
    expect(limiter.allow(from('1.1.1.1'))).toBe(true)
    expect(limiter.allow(from('1.1.1.1'))).toBe(true)
    expect(limiter.allow(from('1.1.1.1'))).toBe(false)
    expect(limiter.allow(from('2.2.2.2'))).toBe(true) // someone else
    expect(limiter.allow(from('1.1.1.1', '/api/status'))).toBe(true) // not limited
    time = 1000
    expect(limiter.allow(from('1.1.1.1'))).toBe(true) // new window
  })
})
