import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ServerWaking } from './ServerWaking'

const server = vi.hoisted(() => ({ hosted: true, state: {}, refresh: null }))
vi.mock('../../services/apiClient', async (importOriginal) => ({
  ...(await importOriginal()),
  get IS_HOSTED_SERVER() {
    return server.hosted
  },
}))
vi.mock('../../hooks/useServerStatus', () => ({
  useServerStatus: () => server.state,
  refreshServerStatus: (...args) => server.refresh(...args),
}))

describe('waking up the free server', () => {
  beforeEach(() => {
    server.hosted = true
    server.refresh = vi.fn()
  })

  it('says it’s waking (with a timer) instead of showing an error, and keeps checking', () => {
    vi.useFakeTimers()
    server.state = { status: null, error: { code: 'server-offline' }, isLoading: false }
    render(<ServerWaking />)
    expect(screen.getByRole('status').textContent).toMatch(/Waking up the karaoke server… 0s/)
    vi.advanceTimersByTime(8000)
    expect(server.refresh).toHaveBeenCalledTimes(2)
    vi.useRealTimers()
  })

  it('stays hidden once the server answers, and on the home (local) version', () => {
    server.state = { status: { ok: true }, error: null, isLoading: false }
    const { unmount } = render(<ServerWaking />)
    expect(screen.queryByRole('status')).toBeNull()
    unmount()
    server.hosted = false
    server.state = { status: null, error: { code: 'server-offline' }, isLoading: false }
    render(<ServerWaking />)
    expect(screen.queryByRole('status')).toBeNull()
  })
})
