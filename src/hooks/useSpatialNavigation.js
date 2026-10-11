import { useEffect } from 'react'

// TV remote D-pad / arrow keys: move focus to the nearest control in that
// direction (OK/Enter presses it). Used in Karaoke Mode. Inside an open
// dialog (e.g. the song picker), only that dialog's controls count.
// Leaves alone: text boxes, sliders, and anything that handled the arrow
// itself (e.g. the queue's ☰ reorder handle).

const DIRECTIONS = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right' }
const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

function ownsArrowKeys(element) {
  if (!element || element === document.body) return false
  if (element.isContentEditable) return true
  const tag = element.tagName
  if (tag === 'TEXTAREA' || tag === 'SELECT') return true
  if (tag === 'INPUT') return !['button', 'submit', 'checkbox', 'radio'].includes(element.type)
  return false
}

function isVisible(element) {
  if (element.closest('[inert], [aria-hidden="true"]')) return false
  const rect = element.getBoundingClientRect()
  return rect.width > 0 && rect.height > 0
}

// Best target from `from` in `direction` among `candidates` ({ rect }):
// it must lie that way; then the closest, preferring ones in line with it.
export function pickNext(from, candidates, direction) {
  const center = (r) => ({ x: r.left + r.width / 2, y: r.top + r.height / 2 })
  const a = center(from)
  let best = null
  let bestScore = Infinity
  for (const candidate of candidates) {
    const b = center(candidate.rect)
    const dx = b.x - a.x
    const dy = b.y - a.y
    const forward = { up: -dy, down: dy, left: -dx, right: dx }[direction]
    const sideways = direction === 'up' || direction === 'down' ? Math.abs(dx) : Math.abs(dy)
    if (forward <= 1) continue // not in that direction
    const score = forward + sideways * 2
    if (score < bestScore) {
      bestScore = score
      best = candidate
    }
  }
  return best
}

export function useSpatialNavigation(enabled) {
  useEffect(() => {
    if (!enabled) return undefined
    const onKeyDown = (event) => {
      const direction = DIRECTIONS[event.key]
      if (!direction || event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return
      const active = document.activeElement
      if (ownsArrowKeys(active)) return
      const dialogs = document.querySelectorAll('dialog[open]')
      const scope = dialogs.length ? dialogs[dialogs.length - 1] : document
      const elements = [...scope.querySelectorAll(FOCUSABLE)].filter((el) => el !== active && isVisible(el))
      if (!elements.length) return
      let target
      if (!active || active === document.body || !scope.contains(active)) {
        target = elements[0] // nothing focused yet: start at the first control
      } else {
        const picked = pickNext(active.getBoundingClientRect(), elements.map((el) => ({ el, rect: el.getBoundingClientRect() })), direction)
        target = picked?.el
      }
      if (!target) return
      event.preventDefault()
      target.focus()
      target.scrollIntoView?.({ block: 'nearest', inline: 'nearest' })
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [enabled])
}
