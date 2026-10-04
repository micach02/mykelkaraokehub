import { useEffect, useId, useRef } from 'react'
import { cx } from '../../utils/classNames'

// Accessible dialog built on the native <dialog> element, which provides
// focus trapping, Esc-to-close, and an inert background for free.
// variant: 'center' (default) | 'sheet' (bottom sheet on mobile, side panel on desktop)
export function Modal({ open, onClose, title, description, children, footer, variant = 'center', className }) {
  const ref = useRef(null)
  const titleId = useId()
  const descId = useId()

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      className={cx('modal', `modal--${variant}`, className)}
      aria-labelledby={titleId}
      aria-describedby={description ? descId : undefined}
      onCancel={(event) => {
        event.preventDefault()
        onClose()
      }}
      onClose={() => open && onClose()}
      onClick={(event) => {
        // A click on the dialog element itself is a click on the backdrop.
        if (event.target === event.currentTarget) onClose()
      }}
    >
      {open && (
        <div className="modal__panel">
          <header className="modal__header">
            <h2 id={titleId} className="modal__title">{title}</h2>
            <button type="button" className="modal__close" onClick={onClose} aria-label="Close">✕</button>
          </header>
          {description && <p id={descId} className="modal__description">{description}</p>}
          <div className="modal__body">{children}</div>
          {footer && <footer className="modal__footer">{footer}</footer>}
        </div>
      )}
    </dialog>
  )
}
