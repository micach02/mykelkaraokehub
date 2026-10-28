import { describe, expect, it } from 'vitest'
import { useState } from 'react'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { SearchBar } from './SearchBar'

// The Home search keeps its text in the URL (?q=), which catches up a moment
// after each keystroke. Typing must not lose letters meanwhile.
function LaggingSearch() {
  const [value, setValue] = useState('')
  return (
    <>
      <SearchBar value={value} onChange={(text) => window.setTimeout(() => setValue(text), 30)} label="Search songs" />
      <button type="button" onClick={() => setValue('Harana')}>Pick Harana</button>
    </>
  )
}

const type = (input, text) => {
  for (const ch of text) fireEvent.change(input, { target: { value: input.value + ch } })
}

describe('SearchBar', () => {
  it('keeps every letter while the value catches up, and still follows outside changes', async () => {
    render(<LaggingSearch />)
    const input = screen.getByRole('searchbox', { name: 'Search songs' })
    type(input, 'Buwan')
    expect(input.value).toBe('Buwan')
    await act(() => new Promise((resolve) => setTimeout(resolve, 80))) // the echoes arrive
    expect(input.value).toBe('Buwan')

    fireEvent.click(screen.getByRole('button', { name: 'Pick Harana' }))
    expect(input.value).toBe('Harana')
  })
})
