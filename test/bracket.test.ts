import { describe, expect, it } from 'vitest'
import { buildSlotResolver, computeGroupTables } from '../src/lib/bracket'
import { MATCHES } from './fixture'

const resolve = buildSlotResolver(MATCHES)

describe('buildSlotResolver', () => {
  it('resolves a decided feeder to the real winner', () => {
    expect(resolve('W76')).toEqual({ kind: 'team', team: 'Brazil' }) // Brazil beat Japan
  })

  it('resolves an unplayed feeder to its two candidate teams (not a fake winner)', () => {
    const slot = resolve('W78') // match 78: Ivory Coast vs Norway, not played
    expect(slot.kind).toBe('candidates')
    expect(slot).toMatchObject({ a: 'Ivory Coast', b: 'Norway' })
  })

  it('marks slots whose feeders are themselves undecided as TBD', () => {
    expect(resolve('W97')).toEqual({ kind: 'tbd' }) // a quarter-final fed by unplayed R16 ties
  })

  it('passes real team names straight through (canonicalised)', () => {
    expect(resolve('Congo DR')).toEqual({ kind: 'team', team: 'DR Congo' })
  })
})

describe('computeGroupTables', () => {
  const tables = computeGroupTables(MATCHES)

  it('produces one table of four teams per group', () => {
    expect(tables).toHaveLength(12)
    for (const t of tables) expect(t.rows).toHaveLength(4)
  })

  it('flags teams that advanced to the Round of 32', () => {
    const groupF = tables.find((t) => t.group === 'Group F')!
    expect(groupF.rows.find((r) => r.team === 'Netherlands')?.advanced).toBe(true)
  })

  it('sorts each group by points descending', () => {
    for (const t of tables) {
      const pts = t.rows.map((r) => r.record.points)
      expect(pts).toEqual([...pts].sort((a, b) => b - a))
    }
  })
})
