import { useId, useRef } from 'react'
import { cx } from '../../utils/classNames'

// Controlled search input. Esc clears; Enter submits.
// variant 'prompt' is the large glowing "ask anything" box; `loading` shows
// a working indicator inside it.
export function SearchBar({
  value,
  onChange,
  onSubmit,
  placeholder = 'Search song or artist…',
  label = 'Search songs',
  size = 'md',
  variant,
  loading = false,
  id,
  autoFocus,
  className,
  onFocus,
}) {
  const inputRef = useRef(null)
  const generatedId = useId()
  const inputId = id ?? generatedId
  const prompt = variant === 'prompt'

  return (
    <form
      role="search"
      className={cx('search-bar', `search-bar--${size}`, prompt && 'search-bar--prompt', loading && 'search-bar--loading', className)}
      onSubmit={(event) => {
        event.preventDefault()
        onSubmit?.(value)
      }}
    >
      <label htmlFor={inputId} className="sr-only">{label}</label>
      <span className="search-bar__icon" aria-hidden="true">{prompt ? '✨' : '🔍'}</span>
      <input
        ref={inputRef}
        id={inputId}
        type="search"
        className="search-bar__input"
        value={value}
        placeholder={placeholder}
        autoComplete="off"
        spellCheck="false"
        enterKeyHint="search"
        autoFocus={autoFocus}
        onChange={(event) => onChange(event.target.value)}
        onFocus={onFocus}
        onKeyDown={(event) => {
          if (event.key === 'Escape' && value) {
            event.preventDefault()
            event.stopPropagation()
            onChange('')
          }
        }}
      />
      {loading && <span className="search-bar__spinner" aria-hidden="true" />}
      {value ? (
        <button
          type="button"
          className="search-bar__clear"
          aria-label="Clear search"
          onClick={() => {
            onChange('')
            inputRef.current?.focus()
          }}
        >
          ✕
        </button>
      ) : (
        prompt && <kbd className="search-bar__hint" aria-hidden="true">/</kbd>
      )}
    </form>
  )
}
