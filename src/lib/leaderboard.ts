import type { GroupRecord, RosterEntry, TeamProgress } from '../types'
import { canonicalTeamName, getTeamMeta, TIER_RANK } from '../data/teams'
import { STAGE_ORDER } from './progress'

export interface LeaderboardEntry {
  /** 1-based position after sorting (dense; ties share a position). */
  rank: number
  roster: RosterEntry
  progress: TeamProgress
  /** Top of the board — on track to "win it all". */
  isLeader: boolean
}

/** Alive/champion sit above eliminated teams at the same stage. */
function statusRank(progress: TeamProgress): number {
  switch (progress.status) {
    case 'champion':
    case 'alive':
      return 0
    case 'out':
      return 1
    case 'notCompeting':
      return 2
  }
}

const ZERO: GroupRecord = {
  played: 0,
  won: 0,
  drawn: 0,
  lost: 0,
  goalsFor: 0,
  goalsAgainst: 0,
  goalDiff: 0,
  points: 0,
}

/**
 * Order two picks from best to worst. The chain matches the agreed rules:
 *   stage reached → alive over out → group points → goal difference →
 *   goals scored → favoredness tier → member name (stable).
 * Returns a negative number when `a` should rank ahead of `b`.
 */
function compareEntries(a: RosterEntry, b: RosterEntry, progress: Map<string, TeamProgress>): number {
  const pa = progress.get(canonicalTeamName(a.team))!
  const pb = progress.get(canonicalTeamName(b.team))!

  const byStage = STAGE_ORDER[pb.stage] - STAGE_ORDER[pa.stage]
  if (byStage !== 0) return byStage

  const byStatus = statusRank(pa) - statusRank(pb)
  if (byStatus !== 0) return byStatus

  const ra = pa.groupRecord ?? ZERO
  const rb = pb.groupRecord ?? ZERO
  if (rb.points !== ra.points) return rb.points - ra.points
  if (rb.goalDiff !== ra.goalDiff) return rb.goalDiff - ra.goalDiff
  if (rb.goalsFor !== ra.goalsFor) return rb.goalsFor - ra.goalsFor

  const ta = getTeamMeta(a.team)
  const tb = getTeamMeta(b.team)
  const tierA = ta ? TIER_RANK[ta.tier] : 99
  const tierB = tb ? TIER_RANK[tb.tier] : 99
  if (tierA !== tierB) return tierA - tierB

  return a.member.localeCompare(b.member)
}

/** True when two picks are tied on everything that matters for ranking. */
function tied(a: RosterEntry, b: RosterEntry, progress: Map<string, TeamProgress>): boolean {
  return compareEntries(a, b, progress) === 0
}

/**
 * Build the unified leaderboard: every pick ranked best → worst. The top entry
 * is the "wins it all" front-runner; the lowest-ranked real (non-joke) team is
 * the wooden spoon. Dense ranks mean genuinely tied picks share a position.
 */
export function buildLeaderboard(
  roster: readonly RosterEntry[],
  progress: Map<string, TeamProgress>,
): LeaderboardEntry[] {
  const sorted = [...roster].sort((a, b) => compareEntries(a, b, progress))

  const entries: LeaderboardEntry[] = sorted.map((roster, index) => {
    let rank = index + 1
    if (index > 0 && tied(sorted[index - 1], roster, progress)) {
      // Same position as the previous pick — find that shared rank.
      rank = -1 // placeholder, fixed up below
    }
    return {
      rank,
      roster,
      progress: progress.get(canonicalTeamName(roster.team))!,
      isLeader: false,
    }
  })

  // Resolve dense ranks (ties share the earlier position).
  for (let i = 0; i < entries.length; i++) {
    if (entries[i].rank === -1) entries[i].rank = entries[i - 1].rank
  }

  // Leader = the single best pick (only if it's a real competitor). The wooden
  // spoon is no longer the board's bottom team — it's a cumulative tally of
  // knocked-out teams (see lib/feuds.ts → computeSpoons), shown on the Feuds tab.
  if (entries.length > 0 && entries[0].progress.status !== 'notCompeting') {
    entries[0].isLeader = true
  }

  return entries
}
