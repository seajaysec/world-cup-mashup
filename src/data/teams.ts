import type { TeamMeta, Tier } from '../types'

/**
 * The 48 World Cup 2026 teams. `name` MUST match the openfootball feed spelling,
 * and `group` is taken from the feed.
 *
 * The fourth value is a curated, pre-tournament **title-win odds** in percent —
 * a deliberately subjective guess at how favored each team is to win it all. It's
 * the single source of truth for favoredness: the tier (Favorite / Contender /
 * Dark horse / Long shot) is derived from it via the bands in `tierForOdds`.
 * Tune the numbers to taste; nothing breaks if they don't sum to exactly 100.
 */
const RAW: [name: string, flag: string, group: string, odds: number][] = [
  ['Argentina', '🇦🇷', 'Group J', 14],
  ['France', '🇫🇷', 'Group I', 13],
  ['Spain', '🇪🇸', 'Group H', 11],
  ['Brazil', '🇧🇷', 'Group C', 11],
  ['England', '🏴󠁧󠁢󠁥󠁮󠁧󠁿', 'Group L', 8],
  ['Germany', '🇩🇪', 'Group E', 6],
  ['Portugal', '🇵🇹', 'Group K', 5],

  ['Netherlands', '🇳🇱', 'Group F', 4],
  ['Belgium', '🇧🇪', 'Group G', 3],
  ['USA', '🇺🇸', 'Group D', 2.5],
  ['Uruguay', '🇺🇾', 'Group H', 2.5],
  ['Croatia', '🇭🇷', 'Group L', 2.5],
  ['Morocco', '🇲🇦', 'Group C', 2],
  ['Colombia', '🇨🇴', 'Group K', 2],
  ['Japan', '🇯🇵', 'Group F', 2],
  ['Senegal', '🇸🇳', 'Group I', 2],

  ['Switzerland', '🇨🇭', 'Group B', 1.5],
  ['Mexico', '🇲🇽', 'Group A', 1.5],
  ['Norway', '🇳🇴', 'Group I', 1.2],
  ['Sweden', '🇸🇪', 'Group F', 1],
  ['South Korea', '🇰🇷', 'Group A', 1],
  ['Ecuador', '🇪🇨', 'Group E', 1],
  ['Canada', '🇨🇦', 'Group B', 1],
  ['Ivory Coast', '🇨🇮', 'Group E', 0.8],
  ['Austria', '🇦🇹', 'Group J', 0.8],
  ['Turkey', '🇹🇷', 'Group D', 0.8],
  ['Egypt', '🇪🇬', 'Group G', 0.8],
  ['Australia', '🇦🇺', 'Group D', 0.7],
  ['Paraguay', '🇵🇾', 'Group D', 0.6],

  ['Iran', '🇮🇷', 'Group G', 0.4],
  ['Ghana', '🇬🇭', 'Group L', 0.4],
  ['Czech Republic', '🇨🇿', 'Group A', 0.4],
  ['Algeria', '🇩🇿', 'Group J', 0.3],
  ['Scotland', '🏴󠁧󠁢󠁳󠁣󠁴󠁿', 'Group C', 0.3],
  ['Bosnia & Herzegovina', '🇧🇦', 'Group B', 0.3],
  ['Tunisia', '🇹🇳', 'Group F', 0.3],
  ['DR Congo', '🇨🇩', 'Group K', 0.3],
  ['Panama', '🇵🇦', 'Group L', 0.2],
  ['Qatar', '🇶🇦', 'Group B', 0.2],
  ['Saudi Arabia', '🇸🇦', 'Group H', 0.2],
  ['South Africa', '🇿🇦', 'Group A', 0.2],
  ['Uzbekistan', '🇺🇿', 'Group K', 0.2],
  ['Iraq', '🇮🇶', 'Group I', 0.2],
  ['Jordan', '🇯🇴', 'Group J', 0.2],
  ['Cape Verde', '🇨🇻', 'Group H', 0.2],
  ['New Zealand', '🇳🇿', 'Group G', 0.2],
  ['Haiti', '🇭🇹', 'Group C', 0.1],
  ['Curaçao', '🇨🇼', 'Group E', 0.1],
]

/** Favoredness bands. Lower bound in percent; this is what "quantifies" a tier. */
export const TIER_BANDS: { tier: Tier; min: number }[] = [
  { tier: 'favorite', min: 5 },
  { tier: 'contender', min: 2 },
  { tier: 'darkhorse', min: 0.6 },
  { tier: 'longshot', min: 0 },
]

export function tierForOdds(odds: number): Tier {
  return (TIER_BANDS.find((b) => odds >= b.min) ?? TIER_BANDS[TIER_BANDS.length - 1]).tier
}

export const TEAMS: readonly TeamMeta[] = RAW.map(([name, flag, group, odds]) => ({
  name,
  flag,
  group,
  odds,
  tier: tierForOdds(odds),
}))

/** Maps roster spellings to the canonical feed spelling where they differ. */
const TEAM_ALIASES: Record<string, string> = {
  'Congo DR': 'DR Congo',
}

const TEAMS_BY_NAME = new Map(TEAMS.map((t) => [t.name, t]))

export function canonicalTeamName(name: string): string {
  return TEAM_ALIASES[name] ?? name
}

export function getTeamMeta(name: string): TeamMeta | undefined {
  return TEAMS_BY_NAME.get(canonicalTeamName(name))
}

export const TIER_LABELS: Record<Tier, string> = {
  favorite: 'Favorite',
  contender: 'Contender',
  darkhorse: 'Dark horse',
  longshot: 'Long shot',
}

/** Human-readable odds band per tier, for a legend ("Favorite = ≥5% to win it all"). */
export const TIER_RANGE_LABELS: Record<Tier, string> = {
  favorite: '≥5%',
  contender: '2–5%',
  darkhorse: '0.6–2%',
  longshot: '<0.6%',
}

/** Lower = more favored; used as a final leaderboard tiebreaker. */
export const TIER_RANK: Record<Tier, number> = {
  favorite: 0,
  contender: 1,
  darkhorse: 2,
  longshot: 3,
}

/** "14%", "2.5%", "0.4%" — trims trailing zeros sensibly. */
export function formatOdds(odds: number): string {
  const text = odds >= 1 && Number.isInteger(odds) ? String(odds) : odds.toFixed(1)
  return `${text}%`
}
