import { useEffect, useRef } from 'react'

function isTypingTarget(target) {
  if (!target) return false
  const tag = target.tagName
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable
}

// Maps single keys (event.key, case-insensitive) to handlers. Ignored while
// typing, with modifier keys held, or while a dialog is open (except Escape
// handling, which dialogs do themselves).
export function useKeyboardShortcuts(bindings, enabled = true) {
  const ref = useRef(bindings)
  useEffect(() => {
    ref.current = bindings
  })

  useEffect(() => {
    if (!enabled) return undefined
    const onKeyDown = (event) => {
      if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey) return
      if (isTypingTarget(event.target)) return
      if (document.querySelector('dialog[open]')) return
      const key = event.key === ' ' ? 'space' : event.key.toLowerCase()
      const handler = ref.current[key]
      if (!handler) return
      // Let Space/Enter activate a focused button normally.
      if (key === 'space' && event.target instanceof HTMLButtonElement) return
      event.preventDefault()
      handler(event)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [enabled])
}
