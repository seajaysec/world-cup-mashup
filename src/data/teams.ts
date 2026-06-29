import type { TeamMeta, Tier } from '../types'

/**
 * Metadata for all 48 teams in the 2026 World Cup.
 *
 * `name` MUST match the spelling used in the openfootball feed exactly, otherwise
 * the team's matches won't be found. Groups are taken straight from the feed.
 *
 * `tier` is a curated, pre-tournament estimate of how favored each team is. It is
 * intentionally subjective and is the one thing you may want to hand-tune — edit
 * the values below; nothing else depends on them being "correct".
 */
export const TEAMS: readonly TeamMeta[] = [
  { name: 'Argentina', flag: '🇦🇷', group: 'Group J', tier: 'favorite' },
  { name: 'France', flag: '🇫🇷', group: 'Group I', tier: 'favorite' },
  { name: 'Spain', flag: '🇪🇸', group: 'Group H', tier: 'favorite' },
  { name: 'Brazil', flag: '🇧🇷', group: 'Group C', tier: 'favorite' },
  { name: 'England', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', group: 'Group L', tier: 'favorite' },
  { name: 'Germany', flag: '🇩🇪', group: 'Group E', tier: 'favorite' },
  { name: 'Portugal', flag: '🇵🇹', group: 'Group K', tier: 'favorite' },

  { name: 'Netherlands', flag: '🇳🇱', group: 'Group F', tier: 'contender' },
  { name: 'Belgium', flag: '🇧🇪', group: 'Group G', tier: 'contender' },
  { name: 'Uruguay', flag: '🇺🇾', group: 'Group H', tier: 'contender' },
  { name: 'Croatia', flag: '🇭🇷', group: 'Group L', tier: 'contender' },
  { name: 'Morocco', flag: '🇲🇦', group: 'Group C', tier: 'contender' },
  { name: 'USA', flag: '🇺🇸', group: 'Group D', tier: 'contender' },
  { name: 'Colombia', flag: '🇨🇴', group: 'Group K', tier: 'contender' },
  { name: 'Japan', flag: '🇯🇵', group: 'Group F', tier: 'contender' },
  { name: 'Senegal', flag: '🇸🇳', group: 'Group I', tier: 'contender' },

  { name: 'Switzerland', flag: '🇨🇭', group: 'Group B', tier: 'darkhorse' },
  { name: 'Mexico', flag: '🇲🇽', group: 'Group A', tier: 'darkhorse' },
  { name: 'South Korea', flag: '🇰🇷', group: 'Group A', tier: 'darkhorse' },
  { name: 'Ecuador', flag: '🇪🇨', group: 'Group E', tier: 'darkhorse' },
  { name: 'Norway', flag: '🇳🇴', group: 'Group I', tier: 'darkhorse' },
  { name: 'Ivory Coast', flag: '🇨🇮', group: 'Group E', tier: 'darkhorse' },
  { name: 'Sweden', flag: '🇸🇪', group: 'Group F', tier: 'darkhorse' },
  { name: 'Austria', flag: '🇦🇹', group: 'Group J', tier: 'darkhorse' },
  { name: 'Turkey', flag: '🇹🇷', group: 'Group D', tier: 'darkhorse' },
  { name: 'Egypt', flag: '🇪🇬', group: 'Group G', tier: 'darkhorse' },
  { name: 'Canada', flag: '🇨🇦', group: 'Group B', tier: 'darkhorse' },
  { name: 'Australia', flag: '🇦🇺', group: 'Group D', tier: 'darkhorse' },
  { name: 'Paraguay', flag: '🇵🇾', group: 'Group D', tier: 'darkhorse' },

  { name: 'Iran', flag: '🇮🇷', group: 'Group G', tier: 'longshot' },
  { name: 'Ghana', flag: '🇬🇭', group: 'Group L', tier: 'longshot' },
  { name: 'Algeria', flag: '🇩🇿', group: 'Group J', tier: 'longshot' },
  { name: 'Scotland', flag: '🏴󠁧󠁢󠁳󠁣󠁴󠁿', group: 'Group C', tier: 'longshot' },
  { name: 'Panama', flag: '🇵🇦', group: 'Group L', tier: 'longshot' },
  { name: 'Bosnia & Herzegovina', flag: '🇧🇦', group: 'Group B', tier: 'longshot' },
  { name: 'Czech Republic', flag: '🇨🇿', group: 'Group A', tier: 'longshot' },
  { name: 'Qatar', flag: '🇶🇦', group: 'Group B', tier: 'longshot' },
  { name: 'Saudi Arabia', flag: '🇸🇦', group: 'Group H', tier: 'longshot' },
  { name: 'Tunisia', flag: '🇹🇳', group: 'Group F', tier: 'longshot' },
  { name: 'South Africa', flag: '🇿🇦', group: 'Group A', tier: 'longshot' },
  { name: 'Uzbekistan', flag: '🇺🇿', group: 'Group K', tier: 'longshot' },
  { name: 'Iraq', flag: '🇮🇶', group: 'Group I', tier: 'longshot' },
  { name: 'Jordan', flag: '🇯🇴', group: 'Group J', tier: 'longshot' },
  { name: 'Haiti', flag: '🇭🇹', group: 'Group C', tier: 'longshot' },
  { name: 'DR Congo', flag: '🇨🇩', group: 'Group K', tier: 'longshot' },
  { name: 'Curaçao', flag: '🇨🇼', group: 'Group E', tier: 'longshot' },
  { name: 'Cape Verde', flag: '🇨🇻', group: 'Group H', tier: 'longshot' },
  { name: 'New Zealand', flag: '🇳🇿', group: 'Group G', tier: 'longshot' },
]

/**
 * Maps the names the family wrote on their picks to the canonical feed spelling.
 * Only needed where the two differ.
 */
const TEAM_ALIASES: Record<string, string> = {
  'Congo DR': 'DR Congo',
}

const TEAMS_BY_NAME = new Map(TEAMS.map((t) => [t.name, t]))

/** Resolve any spelling (roster or feed) to the canonical feed name. */
export function canonicalTeamName(name: string): string {
  return TEAM_ALIASES[name] ?? name
}

/** Look up metadata by any spelling. Returns undefined for non-WC (joke) teams. */
export function getTeamMeta(name: string): TeamMeta | undefined {
  return TEAMS_BY_NAME.get(canonicalTeamName(name))
}

export const TIER_LABELS: Record<Tier, string> = {
  favorite: 'Favorite',
  contender: 'Contender',
  darkhorse: 'Dark horse',
  longshot: 'Long shot',
}

/** Lower = more favored; used as a final leaderboard tiebreaker. */
export const TIER_RANK: Record<Tier, number> = {
  favorite: 0,
  contender: 1,
  darkhorse: 2,
  longshot: 3,
}
