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
  for (const entry of roster) {
    if (entry.joke) continue
    const ordered = [
      ...(entry.formerTeams ?? []).map((f) => ({ team: f.team, until: dateMs(f.until) })),
      { team: entry.team, until: Number.POSITIVE_INFINITY },
    ]
    let from = Number.NEGATIVE_INFINITY
    for (const span of ordered) {
      const team = canonicalTeamName(span.team)
      const list = byTeam.get(team) ?? []
      list.push({ entry, from, until: span.until })
      byTeam.set(team, list)
      from = span.until
    }
  }
  return (team, date) => {
    const when = dateMs(date)
    return byTeam.get(canonicalTeamName(team))?.find((s) => when >= s.from && when < s.until)?.entry
  }
}
