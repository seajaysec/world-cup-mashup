import { describe, expect, it } from 'vitest'
import type { FeedMatch } from '../src/types'
import {
  buildSlotResolver,
  compareBracketMatches,
  computeGroupTables,
} from '../src/lib/bracket'
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

describe('compareBracketMatches', () => {
  const NOW = new Date(2026, 5, 30, 12, 0) // local noon, Jun 30

  // Build a match from a *locally*-constructed instant, writing the feed date and
  // time (with this machine's real UTC offset) so they round-trip back to that
  // exact local day — making the test timezone-independent.
  const pad = (n: number) => String(n).padStart(2, '0')
  const ko = (label: string, day: number, hour: number, played: boolean): FeedMatch => {
    const d = new Date(2026, 5, day, hour, 0)
    const off = -d.getTimezoneOffset() // minutes east of UTC
    const sign = off >= 0 ? '+' : '-'
    const date = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
    const time = `${pad(d.getHours())}:00 UTC${sign}${pad(Math.floor(Math.abs(off) / 60))}:${pad(Math.abs(off) % 60)}`
    return {
      round: 'Round of 32',
      date,
      time,
      team1: label,
      team2: 'x',
      num: 1,
      ...(played ? { score: { ft: [1, 0] as [number, number] } } : {}),
    }
  }

  it('orders upcoming → today-finished → earlier days', () => {
    const upcomingLater = ko('upcomingLater', 30, 20, false) // today, not played, 8pm
    const upcomingSoon = ko('upcomingSoon', 30, 14, false) // today, not played, 2pm
    const finishedToday = ko('finishedToday', 30, 9, true) // today, played
    const yesterday = ko('yesterday', 29, 18, true) // earlier day, played
    const input = [yesterday, finishedToday, upcomingLater, upcomingSoon]
    const order = [...input].sort((a, b) => compareBracketMatches(a, b, NOW)).map((m) => m.team1)
    expect(order).toEqual(['upcomingSoon', 'upcomingLater', 'finishedToday', 'yesterday'])
  })

  it('puts the soonest upcoming game on top', () => {
    const a = ko('a', 30, 21, false)
    const b = ko('b', 30, 15, false)
    const order = [a, b].sort((x, y) => compareBracketMatches(x, y, NOW)).map((m) => m.team1)
    expect(order).toEqual(['b', 'a'])
  })

  it('sinks an awaiting-result game from a past day to the bottom', () => {
    const staleAwaiting = ko('stale', 28, 18, false) // 2 days ago, never resulted
    const finishedToday = ko('today', 30, 9, true)
    const order = [staleAwaiting, finishedToday]
      .sort((a, b) => compareBracketMatches(a, b, NOW))
      .map((m) => m.team1)
    expect(order).toEqual(['today', 'stale'])
  })
})
