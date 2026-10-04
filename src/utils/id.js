let counter = 0

// Unique enough for client-side queue entries; replace with server IDs later.
export function createId(prefix = 'id') {
  counter += 1
  const random = Math.random().toString(36).slice(2, 8)
  return `${prefix}-${Date.now().toString(36)}-${counter}-${random}`
}
