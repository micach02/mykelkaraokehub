import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { useVideoUnlock } from './AdSkipUnlock'
import { PLAYER_CONFIG } from '../../config/appConfig'

describe('⏭ Skip ad unlock', () => {
  afterEach(() => vi.useRealTimers())

  it('unlocks the video for a few seconds, then locks again by itself', () => {
    vi.useFakeTimers()
    const { result } = renderHook(() => useVideoUnlock('song-1'))
    expect(result.current.unlocked).toBe(false)

    act(() => result.current.unlock())
    expect(result.current.unlocked).toBe(true)
    expect(result.current.secondsLeft).toBe(PLAYER_CONFIG.adUnlockSeconds)

    act(() => vi.advanceTimersByTime(5000))
    expect(result.current.secondsLeft).toBe(PLAYER_CONFIG.adUnlockSeconds - 5)

    act(() => vi.advanceTimersByTime(PLAYER_CONFIG.adUnlockSeconds * 1000))
    expect(result.current.unlocked).toBe(false)
  })

  it('locks right away when asked, or when the song changes', () => {
    const { result, rerender } = renderHook(({ song }) => useVideoUnlock(song), { initialProps: { song: 'song-1' } })
    act(() => result.current.unlock())
    act(() => result.current.lock())
    expect(result.current.unlocked).toBe(false)

    act(() => result.current.unlock())
    rerender({ song: 'song-2' })
    expect(result.current.unlocked).toBe(false)
  })
})
