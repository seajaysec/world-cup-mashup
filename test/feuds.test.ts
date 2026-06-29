import { describe, expect, it } from 'vitest'
import { computeFeuds, computeSpoons } from '../src/lib/feuds'
import { computeAllProgress } from '../src/lib/progress'
import { ROSTER } from '../src/data/roster'
import { TEAMS } from '../src/data/teams'
import { MATCHES } from './fixture'

const feuds = computeFeuds(ROSTER, MATCHES)
const progress = computeAllProgress(
  TEAMS.map((t) => t.name),
  MATCHES,
)
const spoons = computeSpoons(ROSTER, progress)

describe('computeFeuds (family body count)', () => {
  it('counts every decisive family-vs-family result', () => {
    expect(feuds.feed).toHaveLength(8)
  })

  it('credits a defeat to whoever owned the team that day (Aaron via Curaçao)', () => {
    const d = feuds.feed.find((f) => f.loserMember === 'Aaron')
    expect(d).toBeDefined()
    expect(d!.loserTeam).toBe('Curaçao') // not his current Switzerland
    expect(d!.winnerMember).toBe('Elizabeth')
  })

  it('does not back-credit Switzerland’s pre-pickup games to Aaron', () => {
    // Aaron only got Switzerland on the switch date; its group games shouldn't appear.
    expect(feuds.feed.some((f) => f.winnerTeam === 'Switzerland' || f.loserTeam === 'Switzerland')).toBe(
      false,
    )
  })

  it('tallies wins and losses per member', () => {
    const claire = feuds.records.find((r) => r.member === 'Claire')
    expect(claire?.losses.length).toBe(2) // beaten by Egypt and Belgium
    const totalWins = feuds.records.reduce((s, r) => s + r.wins.length, 0)
    expect(totalWins).toBe(8)
  })
})

describe('computeSpoons (wooden spoons rack up)', () => {
  it('counts each knocked-out team a member has owned', () => {
    const aaron = spoons.find((s) => s.member === 'Aaron')
    expect(aaron?.count).toBe(1) // former Curaçao (current Switzerland is alive)
    expect(aaron?.deadTeams).toContain('Curaçao')
  })

  it('marks the member(s) with the most spoons as the leader', () => {
    const max = Math.max(...spoons.map((s) => s.count))
    for (const s of spoons) expect(s.isLeader).toBe(s.count === max)
  })

  it('excludes joke picks from the spoon race', () => {
    expect(spoons.some((s) => s.member === 'Harley' || s.member === 'Charlie')).toBe(false)
  })
})
