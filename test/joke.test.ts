import { describe, expect, it } from 'vitest'
import { computeJokeProgress, isJokeTeam } from '../src/lib/joke'
import { derive } from '../src/lib/derive'
import { MATCHES } from './fixture'

const NOW = new Date('2026-07-05T00:00:00Z')

describe('computeJokeProgress', () => {
  it('builds an evolving season from played World Cup days', () => {
    const galaxy = computeJokeProgress('Galaxy', MATCHES, NOW)
    const games = galaxy.record.won + galaxy.record.drawn + galaxy.record.lost
    expect(games).toBeGreaterThan(0)
    expect(galaxy.record.points).toBe(galaxy.record.won * 3 + galaxy.record.drawn)
    expect(galaxy.form.length).toBeLessThanOrEqual(5)
    expect(galaxy.standingLabel).toContain(galaxy.league)
  })

  it('schedules a future fixture when later World Cup days remain', () => {
    // The final (2026-07-19) is after NOW, so an upcoming fixture must exist.
    const galaxy = computeJokeProgress('Galaxy', MATCHES, NOW)
    expect(galaxy.next).toBeDefined()
    expect(galaxy.next!.date > '2026-07-05').toBe(true)
  })

  it('gives the Nuggets basketball-style scorelines', () => {
    const nuggets = computeJokeProgress('Denver Nuggets', MATCHES, NOW)
    expect(nuggets.recent.length).toBeGreaterThan(0)
    for (const m of nuggets.recent) {
      expect(m.scoreFor).toBeGreaterThan(50)
      expect(m.scoreAgainst).toBeGreaterThan(50)
    }
  })

  it('is fully deterministic for the same inputs', () => {
    const a = computeJokeProgress('Galaxy', MATCHES, NOW)
    const b = computeJokeProgress('Galaxy', MATCHES, NOW)
    expect(a).toEqual(b)
  })

  it('recognises the joke teams', () => {
    expect(isJokeTeam('Galaxy')).toBe(true)
    expect(isJokeTeam('Denver Nuggets')).toBe(true)
    expect(isJokeTeam('Brazil')).toBe(false)
  })
})

describe('derive ownership + joke wiring', () => {
  const d = derive(MATCHES, NOW)

  it('maps real teams to their owning member', () => {
    expect(d.ownerByTeam.get('France')?.member).toBe('Chris')
    expect(d.ownerByTeam.get('DR Congo')?.member).toBe('Preston') // via alias
    expect(d.ownerByTeam.has('Galaxy')).toBe(false) // joke teams aren't owners of a WC team
  })

  it('computes a joke season per owning member', () => {
    expect(d.jokeByMember.get('Harlan')?.team).toBe('Galaxy')
    expect(d.jokeByMember.get('Charlie')?.team).toBe('Denver Nuggets')
  })
})
