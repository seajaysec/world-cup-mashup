import { describe, expect, it } from 'vitest'
import type { RosterEntry, TeamProgress } from '../src/types'
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
    expect(feuds.feed).toHaveLength(9)
  })

  it('counts David beating FK’s Austria (Argentina 2–0)', () => {
    const d = feuds.feed.find((f) => f.loserMember === 'FK')
    expect(d).toBeDefined()
    expect(d!.winnerMember).toBe('David')
    expect(d!.loserTeam).toBe('Austria')
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
    expect(totalWins).toBe(9)
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

describe('computeSpoons — who knocked them out (loser side of a feud)', () => {
  const roster: RosterEntry[] = [
    { member: 'Kyle', team: 'Netherlands', flag: '🇳🇱' },
    { member: 'Carol', team: 'Morocco', flag: '🇲🇦' },
    { member: 'Elizabeth', team: 'Germany', flag: '🇩🇪' },
  ]
  const exit = (opponent: string, date = '2026-06-30') => ({
    opponent,
    opponentFlag: '🏳️',
    scoreFor: 0,
    scoreAgainst: 2,
    pens: false,
    round: 'Round of 32',
    date,
  })
  const progress = new Map<string, TeamProgress>([
    [
      'Netherlands',
      { team: 'Netherlands', status: 'out', stage: 'round32', standingLabel: '', exit: exit('Morocco') } as TeamProgress,
    ],
    ['Morocco', { team: 'Morocco', status: 'alive', stage: 'round16', standingLabel: '' } as TeamProgress],
    // Germany went out to a non-family team.
    [
      'Germany',
      { team: 'Germany', status: 'out', stage: 'round32', standingLabel: '', exit: exit('Paraguay') } as TeamProgress,
    ],
  ])
  const result = computeSpoons(roster, progress)

  it('names the family member when a family team did the knocking-out', () => {
    const kyle = result.find((s) => s.member === 'Kyle')!
    expect(kyle.deadTeams[0].byMember).toBe('Carol') // Carol owns Morocco
  })

  it('leaves byMember undefined when a non-family team did it', () => {
    const eliz = result.find((s) => s.member === 'Elizabeth')!
    expect(eliz.deadTeams[0].byMember).toBeUndefined()
  })
})
