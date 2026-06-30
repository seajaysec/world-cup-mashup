import { describe, expect, it } from 'vitest'
import type { FeedMatch, RosterEntry } from '../src/types'
import { computeNotifyEvents } from '../src/lib/notify'

const ALICE: RosterEntry = { member: 'Alice', team: 'Brazil', flag: '🇧🇷' }
const BOB: RosterEntry = { member: 'Bob', team: 'France', flag: '🇫🇷' }

const familyTeams = new Set(['Brazil', 'France'])
const owners = new Map<string, RosterEntry>([
  ['Brazil', ALICE],
  ['France', BOB],
])

// A far-future kickoff and a clearly-past one, anchored so tests are deterministic.
const FUTURE = '2026-12-01'
const NOW = Date.parse('2026-06-30T12:00:00Z')

function match(over: Partial<FeedMatch>): FeedMatch {
  return {
    round: 'Matchday 1',
    date: '2026-06-29',
    time: '20:00 UTC-6',
    team1: 'Brazil',
    team2: 'Mexico',
    group: 'A',
    ...over,
  }
}

describe('computeNotifyEvents', () => {
  it('ignores matches with no family team', () => {
    const m = match({ team1: 'Mexico', team2: 'Spain' })
    expect(computeNotifyEvents([m], familyTeams, owners, NOW)).toHaveLength(0)
  })

  it('emits no events for a family game still in the future', () => {
    const m = match({ date: FUTURE })
    expect(computeNotifyEvents([m], familyTeams, owners, NOW)).toHaveLength(0)
  })

  it('emits a single start event once kickoff has passed but no result yet', () => {
    const m = match({}) // 2026-06-29, already past NOW
    const events = computeNotifyEvents([m], familyTeams, owners, NOW)
    expect(events).toHaveLength(1)
    expect(events[0].key).toBe('1|start|2026-06-29|Brazil|Mexico')
    expect(events[0].title).toContain('Brazil')
  })

  it('emits start + a win result when the family team won', () => {
    const m = match({ score: { ft: [3, 1] } })
    const events = computeNotifyEvents([m], familyTeams, owners, NOW)
    const result = events.find((e) => e.key.includes('|result|'))
    expect(result).toBeDefined()
    expect(result!.title).toContain('✅')
    expect(result!.body).toContain('3–1')
  })

  it('marks a knockout loss as knocked out, not just lost', () => {
    const m = match({ round: 'Round of 32', group: undefined, score: { ft: [0, 2] } })
    const result = computeNotifyEvents([m], familyTeams, owners, NOW).find((e) =>
      e.key.includes('|result|'),
    )
    expect(result!.title).toContain('💀')
    expect(result!.body).toContain('run is over')
  })

  it('treats a group-stage loss as lost, not knocked out', () => {
    const m = match({ score: { ft: [0, 2] } })
    const result = computeNotifyEvents([m], familyTeams, owners, NOW).find((e) =>
      e.key.includes('|result|'),
    )
    expect(result!.title).toContain('❌')
  })

  it('credits a penalty-shootout win to the shootout winner', () => {
    const m = match({
      round: 'Round of 32',
      group: undefined,
      score: { ft: [1, 1], p: [4, 2] },
    })
    const result = computeNotifyEvents([m], familyTeams, owners, NOW).find((e) =>
      e.key.includes('|result|'),
    )
    expect(result!.title).toContain('✅')
    expect(result!.body).toContain('on penalties')
  })

  it('fires both sides for a family-vs-family clash', () => {
    const m = match({ team2: 'France', score: { ft: [2, 0] } })
    const events = computeNotifyEvents([m], familyTeams, owners, NOW)
    // Two starts + two results (one per owned side).
    expect(events.filter((e) => e.key.includes('|start|'))).toHaveLength(2)
    const results = events.filter((e) => e.key.includes('|result|'))
    expect(results).toHaveLength(2)
    expect(results.find((e) => e.key.startsWith('1|'))!.title).toContain('✅') // Brazil won
    expect(results.find((e) => e.key.startsWith('2|'))!.title).toContain('❌') // France lost
  })
})
