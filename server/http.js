// Small HTTP helpers for the karaoke server (no framework needed).

export class ApiError extends Error {
  constructor(status, code, message) {
    super(message)
    this.status = status
    this.code = code
  }
}

const MAX_BODY_BYTES = 64 * 1024

export function readJson(req) {
  return new Promise((resolve, reject) => {
    let size = 0
    const chunks = []
    req.on('data', (chunk) => {
      size += chunk.length
      if (size > MAX_BODY_BYTES) {
        reject(new ApiError(413, 'too-large', 'Request is too large.'))
        req.destroy()
        return
      }
      chunks.push(chunk)
    })
    req.on('end', () => {
      if (!chunks.length) return resolve({})
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')))
      } catch {
        reject(new ApiError(400, 'bad-json', 'Request body must be JSON.'))
      }
    })
    req.on('error', reject)
  })
}

export function sendJson(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' })
  res.end(JSON.stringify(body))
}

export function sendError(res, error) {
  const status = error instanceof ApiError ? error.status : 500
  const code = error instanceof ApiError ? error.code : 'server-error'
  const message = error instanceof ApiError ? error.message : 'Something went wrong on the karaoke server.'
  if (!(error instanceof ApiError)) console.error('[karaoke-server]', error)
  sendJson(res, status, { error: { code, message } })
}

// Server-Sent Events stream. Returns { send(event, data), onClose(fn) }.
export function openEventStream(res) {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  })
  res.write('retry: 2000\n\n')
  // Comment lines keep idle connections from being closed by browsers/proxies.
  const heartbeat = setInterval(() => res.write(': ping\n\n'), 25000)
  heartbeat.unref?.()
  const closeHandlers = []
  let closed = false
  const close = () => {
    if (closed) return
    closed = true
    clearInterval(heartbeat)
    closeHandlers.forEach((fn) => fn())
  }
  // Note: req 'close' fires as soon as the request is read in modern Node;
  // res 'close' fires when the connection actually goes away.
  res.on('close', close)
  return {
    send(event, data) {
      if (!closed) res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
    },
    onClose(fn) {
      closeHandlers.push(fn)
    },
    end() {
      res.end()
      close()
    },
  }
}
