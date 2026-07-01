import { describe, expect, it } from 'vitest'
import { TEAMS, formatOdds, getTeamMeta, tierForOdds } from '../src/data/teams'

describe('favoredness quantification', () => {
  it('derives tiers from odds via the published bands', () => {
    expect(tierForOdds(14)).toBe('favorite')
    expect(tierForOdds(5)).toBe('favorite')
    expect(tierForOdds(4.9)).toBe('contender')
    expect(tierForOdds(2)).toBe('contender')
    expect(tierForOdds(1.9)).toBe('darkhorse')
    expect(tierForOdds(0.6)).toBe('darkhorse')
    expect(tierForOdds(0.59)).toBe('longshot')
    expect(tierForOdds(0)).toBe('longshot')
  })

  it('keeps every team’s tier consistent with its odds', () => {
    for (const t of TEAMS) expect(t.tier).toBe(tierForOdds(t.odds))
  })

  it('covers all 48 teams with odds', () => {
    expect(TEAMS).toHaveLength(48)
    expect(TEAMS.every((t) => t.odds > 0)).toBe(true)
  })

  it('formats odds readably', () => {
    expect(formatOdds(14)).toBe('14%')
    expect(formatOdds(2.5)).toBe('2.5%')
    expect(formatOdds(0.4)).toBe('0.4%')
  })

  it('exposes odds through getTeamMeta (incl. aliases)', () => {
    expect(getTeamMeta('Congo DR')?.odds).toBe(getTeamMeta('DR Congo')?.odds)
    expect(getTeamMeta('Argentina')?.tier).toBe('favorite')
  })
})
