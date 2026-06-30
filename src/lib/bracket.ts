import type { FeedMatch, GroupRecord } from '../types'
import { canonicalTeamName } from '../data/teams'
import { computeGroupRecords } from './standings'
import { winnerSide } from './format'

/**
 * What occupies one side of a knockout tie, for display:
 * - `team`   — a decided, real team (advanced here or playing here).
 * - `candidates` — this slot is the winner/loser of an unplayed game whose two
 *   participants are known, so we can show "A or B" instead of a meaningless
 *   "Winner of match 78".
 * - `tbd`    — not yet determinable (an earlier feeder is itself undecided).
 */
export type Slot =
  | { kind: 'team'; team: string }
  | { kind: 'candidates'; a: string; b: string }
  | { kind: 'tbd' }

/**
 * Build a resolver over the (already winner-propagated) match list. It turns a
 * slot token into something honest to show:
 *   "Brazil"            → it really is Brazil (won its game)
 *   "W78" (78 unplayed) → { candidates: Ivory Coast / Norway }
 *   "W89" (89 unplayed, its feeders also undecided) → tbd
 */
export function buildSlotResolver(matches: FeedMatch[]): (token: string) => Slot {
  const byNum = new Map<number, FeedMatch>()
  for (const m of matches) if (m.num != null) byNum.set(m.num, m)

  function nameOf(slot: Slot): string | null {
    return slot.kind === 'team' ? slot.team : null
  }

  function resolve(token: string): Slot {
    const win = /^W(\d+)$/.exec(token)
    const lose = /^L(\d+)$/.exec(token)
    if (!win && !lose) return { kind: 'team', team: canonicalTeamName(token) }

    const feeder = byNum.get(Number((win ?? lose)![1]))
    if (!feeder) return { kind: 'tbd' }

    const side = winnerSide(feeder) // respects penalty shootouts
    if (side !== 0) {
      const winner = side === 1 ? feeder.team1 : feeder.team2
      const loser = side === 1 ? feeder.team2 : feeder.team1
      return { kind: 'team', team: canonicalTeamName(win ? winner : loser) }
    }

    // Unplayed feeder: show its two participants if both are concrete teams.
    const s1 = nameOf(resolve(feeder.team1))
    const s2 = nameOf(resolve(feeder.team2))
    if (s1 && s2) return { kind: 'candidates', a: s1, b: s2 }
    return { kind: 'tbd' }
  }

  return resolve
}

export interface GroupTableRow {
  team: string
  record: GroupRecord
  advanced: boolean
}

/**
 * Final-ish standings for every group, plus whether each team advanced (i.e. it
 * shows up in the Round of 32). Sorted by points → goal difference → goals for.
 */
export function computeGroupTables(
  matches: FeedMatch[],
): { group: string; rows: GroupTableRow[] }[] {
  const records = computeGroupRecords(matches)

  const r32Teams = new Set<string>()
  for (const m of matches) {
    if (m.round !== 'Round of 32') continue
    r32Teams.add(canonicalTeamName(m.team1))
    r32Teams.add(canonicalTeamName(m.team2))
  }

  const byGroup = new Map<string, string[]>()
  for (const m of matches) {
    if (!m.group) continue
    for (const raw of [m.team1, m.team2]) {
      const team = canonicalTeamName(raw)
      const list = byGroup.get(m.group) ?? []
      if (!list.includes(team)) list.push(team)
      byGroup.set(m.group, list)
    }
  }

  const empty: GroupRecord = {
    played: 0,
    won: 0,
    drawn: 0,
    lost: 0,
    goalsFor: 0,
    goalsAgainst: 0,
    goalDiff: 0,
    points: 0,
  }

  return [...byGroup.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([group, teams]) => {
      const rows = teams
        .map((team) => ({
          team,
          record: records.get(team) ?? empty,
          advanced: r32Teams.has(team),
        }))
        .sort(
          (x, y) =>
            y.record.points - x.record.points ||
            y.record.goalDiff - x.record.goalDiff ||
            y.record.goalsFor - x.record.goalsFor ||
            x.team.localeCompare(y.team),
        )
      return { group, rows }
    })
}
