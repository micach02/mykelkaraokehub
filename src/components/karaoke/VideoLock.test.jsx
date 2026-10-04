import { beforeEach, describe, expect, it } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { useVideoLock } from './VideoLock'

describe('video lock', () => {
  beforeEach(() => window.localStorage.clear())

  it('is unlocked by default; locking is remembered on this device', () => {
    const first = renderHook(() => useVideoLock())
    expect(first.result.current.locked).toBe(false)

    act(() => first.result.current.toggle())
    expect(first.result.current.locked).toBe(true)
    first.unmount()

    // Next visit / next song: still locked, until unlocked.
    const second = renderHook(() => useVideoLock())
    expect(second.result.current.locked).toBe(true)
    act(() => second.result.current.toggle())
    expect(second.result.current.locked).toBe(false)
    expect(JSON.parse(window.localStorage.getItem('mykelkaraokehub:v1:video-locked'))).toBe(false)
  })
})
