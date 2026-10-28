import { useEffect, useId, useRef, useState } from 'react'
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

  // The box shows what was typed right away. `value` (e.g. the ?q= in the
  // URL) can arrive a moment later, one keystroke at a time; echoes of our
  // own typing are ignored so fast typing never loses letters. Any other
  // change (a chip, Clear, Back) replaces the text.
  const [text, setText] = useState(value)
  const typed = useRef(new Set())
  useEffect(() => {
    if (typed.current.has(value)) {
      if (value === text) typed.current.clear()
      return
    }
    typed.current.clear()
    setText(value)
  }, [value])
  const change = (next) => {
    typed.current.add(next)
    setText(next)
    onChange(next)
  }

  return (
    <form
      role="search"
      className={cx('search-bar', `search-bar--${size}`, prompt && 'search-bar--prompt', loading && 'search-bar--loading', className)}
      onSubmit={(event) => {
        event.preventDefault()
        onSubmit?.(text)
      }}
    >
      <label htmlFor={inputId} className="sr-only">{label}</label>
      <span className="search-bar__icon" aria-hidden="true">{prompt ? '✨' : '🔍'}</span>
      <input
        ref={inputRef}
        id={inputId}
        type="search"
        className="search-bar__input"
        value={text}
        placeholder={placeholder}
        autoComplete="off"
        spellCheck="false"
        enterKeyHint="search"
        autoFocus={autoFocus}
        onChange={(event) => change(event.target.value)}
        onFocus={onFocus}
        onKeyDown={(event) => {
          if (event.key === 'Escape' && text) {
            event.preventDefault()
            event.stopPropagation()
            change('')
          }
        }}
      />
      {loading && <span className="search-bar__spinner" aria-hidden="true" />}
      {text ? (
        <button
          type="button"
          className="search-bar__clear"
          aria-label="Clear search"
          onClick={() => {
            change('')
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
