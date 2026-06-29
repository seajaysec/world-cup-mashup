import { describe, expect, it } from 'vitest'
import { buildLeaderboard } from '../src/lib/leaderboard'
import { computeAllProgress, STAGE_ORDER } from '../src/lib/progress'
import { ROSTER } from '../src/data/roster'
import { MATCHES } from './fixture'

const progress = computeAllProgress(
  ROSTER.map((r) => r.team),
  MATCHES,
)
const board = buildLeaderboard(ROSTER, progress)

describe('buildLeaderboard', () => {
  it('ranks every pick exactly once', () => {
    expect(board).toHaveLength(ROSTER.length)
  })

  it('puts the furthest-along pick on top as the leader', () => {
    // Brazil is the only roster team into the Round of 16 in the fixture.
    expect(board[0].roster.team).toBe('Brazil')
    expect(board[0].progress.stage).toBe('round16')
    expect(board[0].isLeader).toBe(true)
  })

  it('orders entries by descending stage among real competitors', () => {
    const stages = board
      .filter((e) => e.progress.status !== 'notCompeting')
      .map((e) => STAGE_ORDER[e.progress.stage])
    const sortedDesc = [...stages].sort((a, b) => b - a)
    expect(stages).toEqual(sortedDesc)
  })

  it('pins the for-fun picks to the very bottom', () => {
    const tail = board.slice(-2).map((e) => e.roster.team).sort()
    expect(tail).toEqual(['Denver Nuggets', 'Galaxy'])
    expect(board.slice(-2).every((e) => e.progress.status === 'notCompeting')).toBe(true)
  })

  it('breaks ties between same-stage exits by group performance', () => {
    // Among group-stage exits, New Zealand (1 pt) ranks below South Korea (3 pts).
    const newZealand = board.findIndex((e) => e.roster.team === 'New Zealand')
    const korea = board.findIndex((e) => e.roster.team === 'South Korea')
    expect(korea).toBeLessThan(newZealand)
  })
})
