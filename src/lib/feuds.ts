import type { FeedMatch, RosterEntry, TeamProgress } from '../types'
import { canonicalTeamName, getTeamMeta } from '../data/teams'
import { matchTimeKey, wasShootout, winnerSide } from './format'
import { buildOwnerResolver } from './ownership'

/** One family-member-beats-another result (a "kill"). */
export interface Defeat {
  date: string
  round: string
  group?: string
  winnerMember: string
  winnerTeam: string
  winnerFlag: string
  loserMember: string
  loserTeam: string
  loserFlag: string
  scoreWinner: number
  scoreLoser: number
  /** True if the tie was settled on penalties. */
  pens: boolean
}

export interface MemberRecord {
  member: string
  wins: Defeat[]
  losses: Defeat[]
}

export interface Feuds {
  /** Every family-vs-family decisive result, chronological. */
  feed: Defeat[]
  /** Per-member tally, sorted by most wins (then fewest losses). */
  records: MemberRecord[]
}

export function computeFeuds(roster: readonly RosterEntry[], matches: FeedMatch[]): Feuds {
  const ownerOf = buildOwnerResolver(roster)
  const feed: Defeat[] = []

  const played = matches
    .filter((m) => m.score?.ft)
    .slice()
    .sort((a, b) => matchTimeKey(a) - matchTimeKey(b))

  for (const m of played) {
    const side = winnerSide(m) // penalty shootouts count (the winner advanced)
    if (side === 0) continue // a genuine draw isn't a kill
    const ft = m.score!.ft!
    const owner1 = ownerOf(m.team1, m.date)?.member
    const owner2 = ownerOf(m.team2, m.date)?.member
    if (!owner1 || !owner2 || owner1 === owner2) continue

    const team1Won = side === 1
    const winTeam = canonicalTeamName(team1Won ? m.team1 : m.team2)
    const loseTeam = canonicalTeamName(team1Won ? m.team2 : m.team1)
    feed.push({
      date: m.date,
      round: m.round,
      group: m.group,
      winnerMember: team1Won ? owner1 : owner2,
      winnerTeam: winTeam,
      winnerFlag: getTeamMeta(winTeam)?.flag ?? '🏳️',
      loserMember: team1Won ? owner2 : owner1,
      loserTeam: loseTeam,
      loserFlag: getTeamMeta(loseTeam)?.flag ?? '🏳️',
      scoreWinner: Math.max(ft[0], ft[1]),
      scoreLoser: Math.min(ft[0], ft[1]),
      pens: wasShootout(m),
    })
  }

  const records = new Map<string, MemberRecord>()
  const ensure = (member: string): MemberRecord => {
    let r = records.get(member)
    if (!r) {
      r = { member, wins: [], losses: [] }
      records.set(member, r)
    }
    return r
  }
  for (const d of feed) {
    ensure(d.winnerMember).wins.push(d)
    ensure(d.loserMember).losses.push(d)
  }

  return {
    feed,
    records: [...records.values()].sort(
      (a, b) => b.wins.length - a.wins.length || a.losses.length - b.losses.length || a.member.localeCompare(b.member),
    ),
  }
}

/** One knocked-out team a member owned, with how it went out. */
export interface DeadTeam {
  team: string
  exit?: TeamProgress['exit']
}

/** A member's running wooden-spoon tally. */
export interface SpoonTally {
  member: string
  /** Number of this member's teams that have been knocked out (former + current-if-out). */
  count: number
  deadTeams: DeadTeam[]
  /** True for the member(s) currently holding the most spoons. */
  isLeader: boolean
}

/**
 * Wooden spoons rack up: every team a member has owned that got knocked out is a
 * spoon. Whoever has the most is the "biggest loser" — and wins that prize.
 */
export function computeSpoons(
  roster: readonly RosterEntry[],
  progressByTeam: Map<string, TeamProgress>,
): SpoonTally[] {
  const tallies: SpoonTally[] = []
  const toDead = (team: string): DeadTeam => ({
    team: canonicalTeamName(team),
    exit: progressByTeam.get(canonicalTeamName(team))?.exit,
  })
  for (const entry of roster) {
    if (entry.joke) continue
    const dead = [...(entry.formerTeams ?? []).map((f) => toDead(f.team))]
    const currentOut = progressByTeam.get(canonicalTeamName(entry.team))?.status === 'out'
    if (currentOut) dead.push(toDead(entry.team))
    if (dead.length === 0) continue
    tallies.push({ member: entry.member, count: dead.length, deadTeams: dead, isLeader: false })
  }
  tallies.sort((a, b) => b.count - a.count || a.member.localeCompare(b.member))
  const max = tallies[0]?.count ?? 0
  for (const t of tallies) t.isLeader = t.count === max && max > 0
  return tallies
}
