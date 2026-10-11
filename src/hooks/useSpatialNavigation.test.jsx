import { describe, expect, it } from 'vitest'
import { fireEvent, render } from '@testing-library/react'
import { pickNext, useSpatialNavigation } from './useSpatialNavigation'

const rect = (left, top, width = 100, height = 40) => ({ left, top, width, height, right: left + width, bottom: top + height })

describe('TV remote (D-pad) navigation', () => {
  //  [A] [B] [C]
  //  [D]     [E]
  const items = { A: rect(0, 0), B: rect(150, 0), C: rect(300, 0), D: rect(0, 100), E: rect(300, 100) }
  const candidates = (exclude) => Object.entries(items).filter(([k]) => k !== exclude).map(([key, r]) => ({ key, rect: r }))

  it('picks the nearest control that way, preferring ones in line', () => {
    expect(pickNext(items.A, candidates('A'), 'right').key).toBe('B')
    expect(pickNext(items.A, candidates('A'), 'down').key).toBe('D')
    expect(pickNext(items.C, candidates('C'), 'down').key).toBe('E')
    expect(pickNext(items.E, candidates('E'), 'left').key).toBe('D')
    expect(pickNext(items.B, candidates('B'), 'up')).toBeNull() // nothing above
  })

  it('moves focus with the arrow keys, but leaves text boxes alone', () => {
    function Deck() {
      useSpatialNavigation(true)
      return (
        <div>
          <button type="button">Play</button>
          <button type="button">Next</button>
          <input aria-label="Search" />
        </div>
      )
    }
    const { getByText, getByLabelText } = render(<Deck />)
    const [play, next] = [getByText('Play'), getByText('Next')]
    const search = getByLabelText('Search')
    // jsdom has no layout: give the controls positions.
    play.getBoundingClientRect = () => rect(0, 0)
    next.getBoundingClientRect = () => rect(150, 0)
    search.getBoundingClientRect = () => rect(0, 100)

    fireEvent.keyDown(window, { key: 'ArrowRight' }) // nothing focused: start at the first
    expect(document.activeElement).toBe(play)
    fireEvent.keyDown(window, { key: 'ArrowRight' })
    expect(document.activeElement).toBe(next)
    search.focus()
    fireEvent.keyDown(search, { key: 'ArrowRight' }) // typing: arrows move the cursor instead
    expect(document.activeElement).toBe(search)
  })
})
