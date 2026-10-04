import { useId, useState } from 'react'

// "What's your name?" — shown on the TV queue next to the songs you add.
// A name is required: the Join/Save button stays disabled until one is typed.
// onCancel (optional): shows a Cancel button, for changing an existing name.
export function RemoteNameForm({ name = '', onSave, onCancel, submitLabel = 'Save', autoFocus = false }) {
  const [value, setValue] = useState(name)
  const inputId = useId()
  const trimmed = value.trim()
  return (
    <form
      className="remote-name"
      onSubmit={(event) => {
        event.preventDefault()
        if (trimmed) onSave(trimmed)
      }}
    >
      <label htmlFor={inputId} className="remote-name__label">What's your name? <span>It shows on the TV next to your songs.</span></label>
      <div className="remote-name__row">
        <input
          id={inputId}
          className="remote-name__input"
          value={value}
          maxLength={40}
          required
          autoComplete="nickname"
          enterKeyHint="go"
          placeholder="e.g. Mika"
          autoFocus={autoFocus}
          onChange={(event) => setValue(event.target.value)}
        />
        <button type="submit" className="remote-add" disabled={!trimmed}>{submitLabel}</button>
        {onCancel && <button type="button" className="remote-name__skip" onClick={onCancel}>Cancel</button>}
      </div>
    </form>
  )
}
