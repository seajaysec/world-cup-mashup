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

  it('pins the for-fun pick to the very bottom', () => {
    // Only Denver Nuggets remains a for-fun pick (Harlan converted to a real team).
    const last = board[board.length - 1]
    expect(last.roster.team).toBe('Denver Nuggets')
    expect(last.progress.status).toBe('notCompeting')
    expect(board.filter((e) => e.progress.status === 'notCompeting')).toHaveLength(1)
  })

  it('breaks ties between same-stage exits by group performance', () => {
    // Among teams that went out in the group stage, points rank them (desc),
    // so the points down that block of the board never increase.
    const groupOutPoints = board
      .filter((e) => e.progress.stage === 'group')
      .map((e) => e.progress.groupRecord?.points ?? 0)
    expect(groupOutPoints).toEqual([...groupOutPoints].sort((a, b) => b - a))
  })
})
