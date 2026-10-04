import { useLayoutEffect, useRef } from 'react'
import { cx } from '../../utils/classNames'

// Toasts are a manual popover so they render in the browser's top layer,
// above any open <dialog> (e.g. adding songs from the Karaoke Mode picker).
// Re-showing moves the popover above dialogs opened after it.
function raiseToTopLayer(element, visible) {
  if (!element || typeof element.showPopover !== 'function') return
  try {
    if (element.matches(':popover-open')) element.hidePopover()
    if (visible) element.showPopover()
  } catch {
    // Popover API not fully supported; the fixed-position fallback still shows.
  }
}

export function ToastViewport({ toasts, onDismiss }) {
  const ref = useRef(null)

  useLayoutEffect(() => {
    raiseToTopLayer(ref.current, toasts.length > 0)
  }, [toasts])

  return (
    <div ref={ref} popover="manual" className="toast-viewport" role="status" aria-live="polite">
      {toasts.map((toast) => (
        <div key={toast.id} className={cx('toast', `toast--${toast.variant}`)}>
          <span className="toast__message">{toast.message}</span>
          <button type="button" className="toast__close" onClick={() => onDismiss(toast.id)} aria-label="Dismiss notification">
            ✕
          </button>
        </div>
      ))}
    </div>
  )
}
