import { describe, expect, it } from 'vitest'
import { computeAllProgress, computeTeamProgress, resolveMatches } from '../src/lib/progress'
import { computeGroupRecords } from '../src/lib/standings'
import { MATCHES } from './fixture'

const resolved = resolveMatches(MATCHES)
const records = computeGroupRecords(resolved)
const progress = (team: string) => computeTeamProgress(team, resolved, records)

describe('resolveMatches', () => {
  it('fills knockout slots from match numbers even when the feed leaves placeholders', () => {
    // Match 91 (Round of 16) reads "W76 vs W78" in the raw feed; match 76 was won
    // by Brazil, so the resolved slot must read "Brazil".
    const m91 = resolved.find((m) => m.num === 91)
    expect(m91?.team1).toBe('Brazil')
  })

  it('leaves placeholders intact when the feeder match has not been played', () => {
    const m91 = resolved.find((m) => m.num === 91)
    expect(m91?.team2).toBe('W78') // match 78 (Ivory Coast v Norway) not yet played
  })
})

describe('computeTeamProgress', () => {
  it('marks a team that won its R32 game as alive in the Round of 16', () => {
    const p = progress('Brazil')
    expect(p.status).toBe('alive')
    expect(p.stage).toBe('round16')
  })

  it('marks the loser of an R32 game as knocked out at the Round of 32', () => {
    const p = progress('Japan') // lost 1-2 to Brazil
    expect(p.status).toBe('out')
    expect(p.stage).toBe('round32')
  })

  it('marks a team awaiting an unplayed R32 game as alive', () => {
    const p = progress('Argentina')
    expect(p.status).toBe('alive')
    expect(p.stage).toBe('round32')
    expect(p.nextMatch?.round).toBe('Round of 32')
  })

  it('marks group-stage casualties as out at the group stage', () => {
    for (const team of ['Curaçao', 'New Zealand', 'South Korea', 'Uruguay']) {
      const p = progress(team)
      expect(p.status, team).toBe('out')
      expect(p.stage, team).toBe('group')
    }
  })

  it('resolves the "Congo DR" alias to DR Congo and tracks its real status', () => {
    const p = progress('Congo DR')
    expect(p.team).toBe('DR Congo')
    expect(p.status).toBe('alive')
    expect(p.nextMatch?.round).toBe('Round of 32')
  })

  it('treats non-World-Cup picks as not competing', () => {
    for (const joke of ['Galaxy', 'Denver Nuggets']) {
      const p = progress(joke)
      expect(p.status, joke).toBe('notCompeting')
      expect(p.stage, joke).toBe('notCompeting')
    }
  })

  it('reports no champion while the final is unplayed', () => {
    const champions = ['Brazil', 'Argentina', 'France', 'Spain'].filter(
      (t) => progress(t).status === 'champion',
    )
    expect(champions).toHaveLength(0)
  })
})

describe('computeAllProgress', () => {
  it('keys results by canonical team name and dedupes', () => {
    const all = computeAllProgress(['Congo DR', 'DR Congo', 'Brazil'], MATCHES)
    expect(all.has('DR Congo')).toBe(true)
    expect(all.has('Congo DR')).toBe(false)
    expect(all.size).toBe(2)
  })
})
