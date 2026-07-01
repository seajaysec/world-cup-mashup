import type { RosterEntry } from '../types'
import { canonicalTeamName } from '../data/teams'

/** Resolve which family member owned a team on a given date (YYYY-MM-DD). */
export type OwnerResolver = (team: string, date: string) => RosterEntry | undefined

interface Span {
  entry: RosterEntry
  from: number
  until: number
}

function dateMs(date: string): number {
  return new Date(`${date}T00:00:00Z`).getTime()
}

/**
 * Build a date-aware ownership lookup from the roster's dated history. A team is
 * owned by whoever held it on the match date — so a re-picked team's earlier
 * games stay with its previous owner, and a newly-picked team's past games
 * aren't back-credited. For future dates this returns the current owner (the
 * current span runs to +∞).
 */
export function buildOwnerResolver(roster: readonly RosterEntry[]): OwnerResolver {
  const byTeam = new Map<string, Span[]>()
  const push = (entry: RosterEntry, teamName: string, from: number, until: number) => {
    const team = canonicalTeamName(teamName)
    const list = byTeam.get(team) ?? []
    list.push({ entry, from, until })
    byTeam.set(team, list)
  }
  for (const entry of roster) {
    if (entry.joke) continue
    // Former teams chain from -∞ through each one's `until`.
    let from = Number.NEGATIVE_INFINITY
    for (const f of entry.formerTeams ?? []) {
      const until = dateMs(f.until)
      push(entry, f.team, from, until)
      from = until
    }
    // The current team starts at `since` when given — so a fresh pick of a team
    // that was already playing doesn't back-credit its earlier games — otherwise
    // right after the last former team (or -∞ if there were none).
    const currentFrom = entry.since ? Math.max(from, dateMs(entry.since)) : from
    push(entry, entry.team, currentFrom, Number.POSITIVE_INFINITY)
  }
  return (team, date) => {
    const when = dateMs(date)
    return byTeam.get(canonicalTeamName(team))?.find((s) => when >= s.from && when < s.until)?.entry
  }
}
