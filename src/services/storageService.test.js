import { afterEach, describe, expect, it, vi } from 'vitest'
import { __resetStorageForTests, getItem, removeItem, setItem } from './storageService'

afterEach(() => {
  vi.restoreAllMocks()
  __resetStorageForTests()
})

describe('storageService', () => {
  it('round-trips JSON values', () => {
    setItem('k', { queue: [1, 2] })
    expect(getItem('k')).toEqual({ queue: [1, 2] })
    removeItem('k')
    expect(getItem('k', 'fallback')).toBe('fallback')
  })

  it('treats corrupt data as missing', () => {
    setItem('k', 1)
    const key = Object.keys(window.localStorage).find((k) => k.endsWith(':k'))
    window.localStorage.setItem(key, '{not json')
    expect(getItem('k', null)).toBeNull()
  })

  it('falls back to memory when localStorage throws', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError')
    })
    expect(setItem('k', 'v')).toBe(false)
    expect(getItem('k')).toBe('v')
  })
})
