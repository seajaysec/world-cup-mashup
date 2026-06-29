import type { FeedMatch, RosterEntry, TeamProgress } from '../types'
import { ROSTER } from '../data/roster'
import { canonicalTeamName } from '../data/teams'
import { computeAllProgress, resolveMatches } from './progress'
import { buildLeaderboard, type LeaderboardEntry } from './leaderboard'

export interface Derived {
  /** All matches with bracket placeholders resolved to real team names. */
  matches: FeedMatch[]
  /** Progress per canonical team name (roster teams only). */
  progressByTeam: Map<string, TeamProgress>
  leaderboard: LeaderboardEntry[]
  /** Leaderboard entry per member, for quick lookup. */
  entryByMember: Map<string, LeaderboardEntry>
  /** Canonical names of every real team someone in the family picked. */
  familyTeams: Set<string>
}

/** Crunch the raw feed into everything the views need. Pure + memo-friendly. */
export function derive(rawMatches: FeedMatch[]): Derived {
  const matches = resolveMatches(rawMatches)
  const progressByTeam = computeAllProgress(
    ROSTER.map((r) => r.team),
    matches,
  )
  const leaderboard = buildLeaderboard(ROSTER, progressByTeam)

  const entryByMember = new Map<string, LeaderboardEntry>()
  for (const entry of leaderboard) entryByMember.set(entry.roster.member, entry)

  const familyTeams = new Set<string>()
  for (const r of ROSTER) {
    if (!r.joke) familyTeams.add(canonicalTeamName(r.team))
  }

  return { matches, progressByTeam, leaderboard, entryByMember, familyTeams }
}

export function rosterByMember(member: string | null): RosterEntry | undefined {
  if (!member) return undefined
  return ROSTER.find((r) => r.member === member)
}
