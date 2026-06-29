import { describe, expect, it } from 'vitest'
import { computeGroupRecords } from '../src/lib/standings'
import { MATCHES } from './fixture'

describe('computeGroupRecords', () => {
  const records = computeGroupRecords(MATCHES)

  it('tallies a known group record correctly (Netherlands, Group F)', () => {
    const nl = records.get('Netherlands')
    expect(nl).toBeDefined()
    expect(nl).toMatchObject({
      played: 3,
      won: 2,
      drawn: 1,
      lost: 0,
      goalsFor: 10,
      goalsAgainst: 4,
      goalDiff: 6,
      points: 7,
    })
  })

  it('does not count knockout matches toward group records', () => {
    // Brazil played a Round of 32 game; its group record stays at 3 games.
    expect(records.get('Brazil')?.played).toBe(3)
  })

  it('derives goal difference from goals for/against', () => {
    for (const r of records.values()) {
      expect(r.goalDiff).toBe(r.goalsFor - r.goalsAgainst)
    }
  })
})
