// TV side of the phone mic: pitch batches from a singer's phone (see
// utils/micFrames.js) go to whoever listens for that phone — the scoring
// session's phone analyzer. Plain JS, outside React.

const listeners = new Map() // phoneId → Set(listener)

export function pushMicBatch(phoneId, batch) {
  listeners.get(phoneId)?.forEach((listener) => listener(batch))
}

export function subscribeMic(phoneId, listener) {
  if (!listeners.has(phoneId)) listeners.set(phoneId, new Set())
  listeners.get(phoneId).add(listener)
  return () => {
    const set = listeners.get(phoneId)
    set?.delete(listener)
    if (set && !set.size) listeners.delete(phoneId)
  }
}
