import { useId, useState } from 'react'

// "Who's singing?" — shown on the TV queue next to the songs you add.
export function RemoteNameForm({ name, onSave, onCancel }) {
  const [value, setValue] = useState(name)
  const inputId = useId()
  return (
    <form
      className="remote-name"
      onSubmit={(event) => {
        event.preventDefault()
        onSave(value)
      }}
    >
      <label htmlFor={inputId} className="remote-name__label">What's your name? <span>It shows on the TV next to your songs.</span></label>
      <div className="remote-name__row">
        <input
          id={inputId}
          className="remote-name__input"
          value={value}
          maxLength={40}
          autoComplete="nickname"
          enterKeyHint="done"
          placeholder="e.g. Mika"
          onChange={(event) => setValue(event.target.value)}
        />
        <button type="submit" className="remote-add">Save</button>
        <button type="button" className="remote-name__skip" onClick={onCancel}>Skip</button>
      </div>
    </form>
  )
}
