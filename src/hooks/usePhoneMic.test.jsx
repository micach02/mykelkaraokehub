import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, renderHook, waitFor } from '@testing-library/react'
import { fakeMic } from '../test/fakeMicrophone'
import { usePhoneMic } from './usePhoneMic'

vi.mock('../services/scoring/audioAnalysisProvider', () => import('../test/fakeMicrophone'))
const sent = vi.hoisted(() => [])
vi.mock('../services/roomService', () => ({
  sendRoomMic: (code, from, batch) => {
    sent.push({ code, from, batch })
    return Promise.resolve()
  },
}))

const from = { id: 'phone-mika', name: 'Mika' }

beforeEach(() => {
  sent.length = 0
  Object.assign(fakeMic, { analyzer: null, permission: 'granted', failWith: null, supported: true })
})

describe('phone mic', () => {
  it('starts by itself on your turn, sends what it hears once a second, and stops after', async () => {
    const { result, rerender } = renderHook(({ active }) => usePhoneMic({ code: 'MKH-ABCDEF', from, active }), { initialProps: { active: true } })
    await waitFor(() => expect(result.current.status).toBe('live'))
    act(() => {
      for (let i = 0; i < 10; i += 1) fakeMic.analyzer.emit({ rms: 0.08, frequency: 220, clarity: 0.97 })
    })
    await waitFor(() => expect(sent.length).toBe(1), { timeout: 2000 })
    const { batch } = sent[0]
    expect(sent[0]).toMatchObject({ code: 'MKH-ABCDEF', from })
    expect(batch.frames).toHaveLength(10)
    expect(batch.frames[0]).toEqual([expect.any(Number), 0.08, 0.16, 220, 0.97]) // numbers only, no audio
    expect(result.current.level).toBeGreaterThan(0)

    rerender({ active: false }) // the song is over
    expect(result.current.status).toBe('off')
    expect(fakeMic.analyzer.closed).toBe(true)
  })

  it('waits for a tap when the mic isn’t allowed yet', async () => {
    fakeMic.permission = 'prompt'
    const { result } = renderHook(() => usePhoneMic({ code: 'MKH-ABCDEF', from, active: true }))
    await waitFor(() => expect(result.current.status).toBe('needs-tap'))
    expect(fakeMic.analyzer).toBeNull()
    await act(() => result.current.start())
    expect(result.current.status).toBe('live')
  })
})
