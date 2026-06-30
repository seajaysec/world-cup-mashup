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
    expect(aaron?.deadTeams.map((d) => d.team)).toContain('Curaçao')
  })

  it('records how a knockout casualty went out, including penalties', () => {
    // Elizabeth's former Germany lost the R32 to Paraguay on penalties (1-1, 3-4 pens).
    const liz = spoons.find((s) => s.member === 'Elizabeth')
    const germany = liz?.deadTeams.find((d) => d.team === 'Germany')
    expect(germany?.exit?.opponent).toBe('Paraguay')
    expect(germany?.exit?.pens).toBe(true)
    expect(germany?.exit?.round).toBe('Round of 32')
  })

  it('marks the member(s) with the most spoons as the leader', () => {
    const max = Math.max(...spoons.map((s) => s.count))
    for (const s of spoons) expect(s.isLeader).toBe(s.count === max)
  })

  it('excludes joke picks from the spoon race', () => {
    expect(spoons.some((s) => s.member === 'Harlan' || s.member === 'Charlie')).toBe(false)
  })
})
