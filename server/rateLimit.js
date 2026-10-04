// Simple per-IP rate limits (fixed window, in memory) for the hosted server.
// rules: [{ name, match(req) → boolean, limit, windowMs }]

export function clientIp(req) {
  // Behind a host's proxy (e.g. Render) the visitor's address is the first
  // entry of X-Forwarded-For.
  const forwarded = String(req.headers['x-forwarded-for'] ?? '').split(',')[0].trim()
  return forwarded || req.socket?.remoteAddress || 'unknown'
}

export function createRateLimiter({ rules, now = () => Date.now() }) {
  const counters = new Map() // `${rule}:${ip}` → { count, resetAt }

  function sweep(time) {
    if (counters.size < 5000) return
    for (const [key, entry] of counters) if (entry.resetAt <= time) counters.delete(key)
  }

  return {
    allow(req) {
      const time = now()
      sweep(time)
      for (const rule of rules) {
        if (!rule.match(req)) continue
        const key = `${rule.name}:${clientIp(req)}`
        let entry = counters.get(key)
        if (!entry || entry.resetAt <= time) {
          entry = { count: 0, resetAt: time + rule.windowMs }
          counters.set(key, entry)
        }
        entry.count += 1
        if (entry.count > rule.limit) return false
      }
      return true
    },
  }
}
