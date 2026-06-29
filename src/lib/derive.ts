import type { FeedMatch, RosterEntry, TeamProgress } from '../types'
import { ROSTER } from '../data/roster'
import { canonicalTeamName, TEAMS } from '../data/teams'
import { computeAllProgress, resolveMatches } from './progress'
import { buildLeaderboard, type LeaderboardEntry } from './leaderboard'
import { computeJokeProgress, isJokeTeam, type JokeProgress } from './joke'
import { computeFavor, type FavorInfo } from './odds'

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
  /** Canonical team name → the family member who owns it (real teams only). */
  ownerByTeam: Map<string, RosterEntry>
  /** Joke-team season per team name ("Galaxy", "Denver Nuggets"). */
  jokeByTeam: Map<string, JokeProgress>
  /** Joke season per owning member, for quick lookup. */
  jokeByMember: Map<string, JokeProgress>
  /** Live favoredness (Elo + title odds) per canonical team name. */
  favorByTeam: Map<string, FavorInfo>
}

/** Crunch the raw feed into everything the views need. Pure + memo-friendly. */
export function derive(rawMatches: FeedMatch[], now: Date): Derived {
  const matches = resolveMatches(rawMatches)
  // Compute progress for everyone in the roster *and* every World Cup team, so
  // the "up for grabs" pool knows which unpicked teams are still alive.
  const progressByTeam = computeAllProgress(
    [...ROSTER.map((r) => r.team), ...TEAMS.map((t) => t.name)],
    matches,
  )
  const leaderboard = buildLeaderboard(ROSTER, progressByTeam)

  const entryByMember = new Map<string, LeaderboardEntry>()
  for (const entry of leaderboard) entryByMember.set(entry.roster.member, entry)

  const familyTeams = new Set<string>()
  const ownerByTeam = new Map<string, RosterEntry>()
  const jokeByTeam = new Map<string, JokeProgress>()
  const jokeByMember = new Map<string, JokeProgress>()

  for (const r of ROSTER) {
    if (r.joke) {
      const jp = computeJokeProgress(r.team, matches, now)
      jokeByTeam.set(r.team, jp)
      jokeByMember.set(r.member, jp)
    } else {
      const canonical = canonicalTeamName(r.team)
      familyTeams.add(canonical)
      // First listed owner wins if two people somehow share a team.
      if (!ownerByTeam.has(canonical)) ownerByTeam.set(canonical, r)
    }
  }

  const favorByTeam = computeFavor(matches, progressByTeam)

  return {
    matches,
    progressByTeam,
    leaderboard,
    entryByMember,
    familyTeams,
    ownerByTeam,
    jokeByTeam,
    jokeByMember,
    favorByTeam,
  }
}

export function rosterByMember(member: string | null): RosterEntry | undefined {
  if (!member) return undefined
  return ROSTER.find((r) => r.member === member)
}

export { isJokeTeam }
