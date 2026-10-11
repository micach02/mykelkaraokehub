import { beforeEach, describe, expect, it } from 'vitest'
import { __reloadLeaderboardForTests, clearLeaderboard, getLeaderboard, recordPartyScore } from './leaderboardService'

describe('tonight’s leaderboard', () => {
  beforeEach(() => {
    window.localStorage.clear()
    __reloadLeaderboardForTests()
  })

  it('ranks scores best first, with each singer’s name', () => {
    const t = Date.now()
    recordPartyScore({ singer: 'Mika', songTitle: 'Buwan', score: 88, grade: 'GREAT', emoji: '🔥' }, t)
    const jo = recordPartyScore({ singer: 'Jo', songTitle: 'Harana', score: 95, grade: 'LEGENDARY', emoji: '👑' }, t + 1)
    expect(jo).toMatchObject({ rank: 1, total: 2 })
    const ana = recordPartyScore({ singer: 'Ana', songTitle: 'Tadhana', score: 88, grade: 'GREAT', emoji: '🔥' }, t + 2)
    expect(ana.rank).toBe(3) // a tie goes to whoever scored it first
    expect(getLeaderboard().map((e) => `${e.singer} ${e.score}`)).toEqual(['Jo 95', 'Mika 88', 'Ana 88'])
  })

  it('keeps tonight only, survives a refresh, and can be cleared', () => {
    const now = Date.now()
    recordPartyScore({ singer: 'Old', songTitle: 'Yesterday', score: 99 }, now - 13 * 3600 * 1000)
    recordPartyScore({ singer: 'Mika', songTitle: 'Buwan', score: 80 }, now)
    __reloadLeaderboardForTests()
    expect(getLeaderboard().map((e) => e.singer)).toEqual(['Mika'])
    clearLeaderboard()
    expect(getLeaderboard()).toEqual([])
  })
})
