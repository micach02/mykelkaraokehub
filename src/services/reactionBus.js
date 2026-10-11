// Reactions from phones (👏 🔥 …), shown floating up over the TV's video for a
// few seconds. In memory only.

import { useSyncExternalStore } from 'react'

export const REACTION_SHOW_MS = 3200
const MAX_ON_SCREEN = 24
const PER_SENDER_GAP_MS = 400 // ignore taps faster than this from one phone

let reactions = []
let nextId = 1
const lastBySender = new Map()
const listeners = new Set()
const notify = () => listeners.forEach((listener) => listener())

// { emoji, name, senderId } → shown for REACTION_SHOW_MS.
export function showReaction({ emoji, name = '', senderId = '' }) {
  const now = Date.now()
  if (senderId && now - (lastBySender.get(senderId) ?? 0) < PER_SENDER_GAP_MS) return false
  if (senderId) lastBySender.set(senderId, now)
  const reaction = { id: nextId++, emoji, name, lane: Math.random() }
  reactions = [...reactions, reaction].slice(-MAX_ON_SCREEN)
  notify()
  window.setTimeout(() => {
    reactions = reactions.filter((r) => r.id !== reaction.id)
    notify()
  }, REACTION_SHOW_MS)
  return true
}

const subscribe = (listener) => {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useReactions() {
  return useSyncExternalStore(subscribe, () => reactions, () => reactions)
}

// For tests.
export function __resetReactionsForTests() {
  reactions = []
  lastBySender.clear()
}
