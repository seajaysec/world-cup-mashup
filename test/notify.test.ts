import { beforeEach, describe, expect, it } from 'vitest'
import type { FeedMatch, RosterEntry } from '../src/types'
import { computeNotifyEvents, summarizeSinceLastVisit } from '../src/lib/notify'

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

/** Minimal in-memory localStorage so the stateful recap can be tested in node. */
function installLocalStorage(): void {
  const store = new Map<string, string>()
  ;(globalThis as { localStorage?: Storage }).localStorage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, String(v)),
    removeItem: (k: string) => void store.delete(k),
    clear: () => store.clear(),
    key: (i: number) => [...store.keys()][i] ?? null,
    get length() {
      return store.size
    },
  } as Storage
}

describe('summarizeSinceLastVisit', () => {
  beforeEach(installLocalStorage)

  it('shows nothing on the very first visit (no backlog dump)', () => {
    const m = match({ score: { ft: [3, 1] } })
    const res = summarizeSinceLastVisit([m], familyTeams, owners, NOW)
    expect(res.firstVisit).toBe(true)
    expect(res.items).toHaveLength(0)
  })

  it('reports a result that landed while away on a return visit', () => {
    // First visit: nothing has happened yet.
    summarizeSinceLastVisit([], familyTeams, owners, NOW)
    // Return visit: a family game finished in the meantime.
    const m = match({ score: { ft: [3, 1] } })
    const res = summarizeSinceLastVisit([m], familyTeams, owners, NOW)
    expect(res.firstVisit).toBe(false)
    expect(res.items).toHaveLength(1)
    expect(res.items[0].title).toContain('✅')
  })

  it('collapses a finished game to a single result line (not start + result)', () => {
    summarizeSinceLastVisit([], familyTeams, owners, NOW)
    const m = match({ score: { ft: [0, 2] } })
    const res = summarizeSinceLastVisit([m], familyTeams, owners, NOW)
    expect(res.items).toHaveLength(1)
    expect(res.items[0].key).toContain('|result|')
  })

  it('does not repeat an item already shown on a prior visit', () => {
    summarizeSinceLastVisit([], familyTeams, owners, NOW)
    const m = match({ score: { ft: [3, 1] } })
    expect(summarizeSinceLastVisit([m], familyTeams, owners, NOW).items).toHaveLength(1)
    // Same data, next load — already consumed into the baseline.
    expect(summarizeSinceLastVisit([m], familyTeams, owners, NOW).items).toHaveLength(0)
  })
})
