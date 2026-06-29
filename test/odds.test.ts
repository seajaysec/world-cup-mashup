import { describe, expect, it } from 'vitest'
import { computeFavor } from '../src/lib/odds'
import { computeAllProgress, resolveMatches } from '../src/lib/progress'
import { TEAMS } from '../src/data/teams'
import { MATCHES } from './fixture'

const resolved = resolveMatches(MATCHES)
const progress = computeAllProgress(
  TEAMS.map((t) => t.name),
  resolved,
)
const favor = computeFavor(resolved, progress)

describe('computeFavor (live odds)', () => {
  it('gives every alive team a positive title chance and eliminated teams zero', () => {
    for (const [team, info] of favor) {
      const status = progress.get(team)?.status
      if (status === 'alive') expect(info.odds, team).toBeGreaterThan(0)
      if (status === 'out') expect(info.odds, team).toBe(0)
    }
  })

  it('keeps live title odds summing to ~100% across the field', () => {
    const total = [...favor.values()].reduce((s, i) => s + i.odds, 0)
    expect(total).toBeGreaterThan(99.5)
    expect(total).toBeLessThan(100.5)
  })

  it('rewards winning: Brazil (won its R32 tie) outrates its pre-tournament base', () => {
    // Brazil's seed is 1500 + 80*log2(11) ≈ 1776.8; a winning run should lift it.
    const base = 1500 + 80 * Math.log2(11)
    expect(favor.get('Brazil')!.rating).toBeGreaterThan(base)
  })

  it('moves odds off the static prior — live differs from pre-tournament', () => {
    const brazil = favor.get('Brazil')!
    expect(brazil.odds).not.toBe(brazil.priorOdds)
  })

  it('derives tier from the live odds', () => {
    const argentina = favor.get('Argentina')!
    // A strong, still-alive favourite should be a Favorite or Contender, not a long shot.
    expect(['favorite', 'contender']).toContain(argentina.tier)
  })
})
