import type { FeedMatch, TeamProgress, Tier } from '../types'
import { canonicalTeamName, getTeamMeta, tierForOdds, TEAMS } from '../data/teams'
import { finalScore, matchTimeKey } from './format'

/**
 * Live favoredness model — no external API, all derived from the feed.
 *
 * 1. Each team starts at an Elo rating seeded from its curated pre-tournament
 *    title odds (the "history before the World Cup" prior).
 * 2. Every played match nudges both teams' ratings, World-Football-Elo style:
 *    the swing scales with the result, how *surprising* it was given the
 *    opponent's current rating, and the goal margin. Beating a strong side moves
 *    you more than thrashing a weak one.
 * 3. Live title-win odds are a softmax over the current ratings of the teams that
 *    are still alive (eliminated teams are 0%; a crowned champion is 100%).
 *
 * Inputs are results, goals, and opponent strength — the feed has no save or
 * possession data, so those aren't modelled.
 */

export interface FavorInfo {
  /** Current Elo-style power rating. */
  rating: number
  /** Live probability of winning the whole tournament, in percent. */
  odds: number
  /** Tier derived from the live odds. */
  tier: Tier
  /** The pre-tournament prior odds, for "from X% before kickoff" context. */
  priorOdds: number
  /** Rating after each played match (history[0] is the pre-tournament seed). */
  history: number[]
  /** Rank by current rating among all World Cup teams (1 = strongest). */
  eloRank: number
  eloTotal: number
}

/** Map curated prior odds (%) to a starting Elo. Monotonic; ~1234–1805 range. */
function baseElo(priorOdds: number): number {
  return 1500 + 80 * Math.log2(priorOdds)
}

function isKnockout(round: string): boolean {
  return !round.startsWith('Matchday')
}

/** Goal-margin multiplier (à la World Football Elo). */
function marginMultiplier(goalDiff: number): number {
  if (goalDiff <= 1) return 1
  if (goalDiff === 2) return 1.5
  return (11 + goalDiff) / 8
}

const SOFTMAX_SCALE = 120

export function computeFavor(
  matches: FeedMatch[],
  progressByTeam: Map<string, TeamProgress>,
): Map<string, FavorInfo> {
  const rating = new Map<string, number>()
  const history = new Map<string, number[]>()
  for (const t of TEAMS) {
    const base = baseElo(t.odds)
    rating.set(t.name, base)
    history.set(t.name, [base])
  }

  // Replay played matches in chronological order so ratings compound correctly.
  const played = matches
    .filter((m) => m.score?.ft)
    .slice()
    .sort((a, b) => matchTimeKey(a) - matchTimeKey(b))

  for (const m of played) {
    const a = canonicalTeamName(m.team1)
    const b = canonicalTeamName(m.team2)
    const Ra = rating.get(a)
    const Rb = rating.get(b)
    if (Ra == null || Rb == null) continue // placeholder/non-WC side

    const [g1, g2] = finalScore(m)!
    const expectedA = 1 / (1 + 10 ** ((Rb - Ra) / 400))
    const scoreA = g1 > g2 ? 1 : g1 < g2 ? 0 : 0.5
    const k = (isKnockout(m.round) ? 45 : 30) * marginMultiplier(Math.abs(g1 - g2))
    const delta = k * (scoreA - expectedA)
    rating.set(a, Ra + delta)
    rating.set(b, Rb - delta)
    history.get(a)!.push(Ra + delta)
    history.get(b)!.push(Rb - delta)
  }

  let champion: string | undefined
  for (const [team, p] of progressByTeam) if (p.status === 'champion') champion = team

  // Softmax denominator over still-alive teams.
  let denom = 0
  if (!champion) {
    for (const [name, r] of rating) {
      if (progressByTeam.get(name)?.status === 'alive') denom += Math.exp((r - 1500) / SOFTMAX_SCALE)
    }
  }

  // Elo ranks across the whole field (strongest first), regardless of alive/out.
  const rankOrder = [...rating.entries()]
    .filter(([name]) => getTeamMeta(name))
    .sort((a, b) => b[1] - a[1])
  const eloTotal = rankOrder.length
  const eloRank = new Map<string, number>()
  rankOrder.forEach(([name], idx) => eloRank.set(name, idx + 1))

  const info = new Map<string, FavorInfo>()
  for (const [name, r] of rating) {
    const meta = getTeamMeta(name)
    if (!meta) continue
    const status = progressByTeam.get(name)?.status
    let odds = 0
    if (champion) odds = name === champion ? 100 : 0
    else if (status === 'alive' && denom > 0) odds = (100 * Math.exp((r - 1500) / SOFTMAX_SCALE)) / denom
    info.set(name, {
      rating: r,
      odds,
      tier: tierForOdds(odds),
      priorOdds: meta.odds,
      history: history.get(name) ?? [r],
      eloRank: eloRank.get(name) ?? eloTotal,
      eloTotal,
    })
  }
  return info
}
