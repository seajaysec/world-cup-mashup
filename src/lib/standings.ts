import type { FeedMatch, GroupRecord } from '../types'

function emptyRecord(): GroupRecord {
  return {
    played: 0,
    won: 0,
    drawn: 0,
    lost: 0,
    goalsFor: 0,
    goalsAgainst: 0,
    goalDiff: 0,
    points: 0,
  }
}

/**
 * Build each team's group-stage record from played group matches. Only matches
 * with a full-time score and a `group` are counted. Used both for display and as
 * a leaderboard tiebreaker between teams that exited at the same stage.
 */
export function computeGroupRecords(matches: FeedMatch[]): Map<string, GroupRecord> {
  const records = new Map<string, GroupRecord>()
  const ensure = (team: string): GroupRecord => {
    let r = records.get(team)
    if (!r) {
      r = emptyRecord()
      records.set(team, r)
    }
    return r
  }

  for (const match of matches) {
    if (!match.group) continue
    const ft = match.score?.ft
    if (!ft) continue
    const [g1, g2] = ft
    const a = ensure(match.team1)
    const b = ensure(match.team2)

    a.played++
    b.played++
    a.goalsFor += g1
    a.goalsAgainst += g2
    b.goalsFor += g2
    b.goalsAgainst += g1

    if (g1 > g2) {
      a.won++
      b.lost++
      a.points += 3
    } else if (g2 > g1) {
      b.won++
      a.lost++
      b.points += 3
    } else {
      a.drawn++
      b.drawn++
      a.points++
      b.points++
    }
  }

  for (const r of records.values()) {
    r.goalDiff = r.goalsFor - r.goalsAgainst
  }
  return records
}
