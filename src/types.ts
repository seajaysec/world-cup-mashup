/** Shapes for the openfootball worldcup.json feed and our derived domain model. */

/** A single match as it appears in `2026/worldcup.json`. */
export interface FeedMatch {
  round: string
  date: string
  time: string
  team1: string
  team2: string
  /** Absent until a match is played. `ft` = full time, `ht` = half time. */
  score?: { ft?: [number, number]; ht?: [number, number] } | null
  group?: string
  ground?: string
  /** Only knockout matches carry a number (used by W##/L## placeholders). */
  num?: number
}

export interface Feed {
  name: string
  matches: FeedMatch[]
}

/** Curated pre-tournament favoredness. */
export type Tier = 'favorite' | 'contender' | 'darkhorse' | 'longshot'

/** A family member's pick. */
export interface RosterEntry {
  member: string
  /** Display name of the team as the family wrote it (e.g. "Congo DR", "Galaxy"). */
  team: string
  flag: string
  /** True for the for-fun picks that aren't actually in the World Cup. */
  joke?: boolean
}

/** Static metadata about a real World Cup team. */
export interface TeamMeta {
  /** Canonical name exactly as it appears in the feed (e.g. "DR Congo"). */
  name: string
  flag: string
  group: string
  tier: Tier
}

/**
 * How far a team got / is. Ordinal value (see STAGE_ORDER in lib/progress.ts)
 * drives leaderboard ordering. `semi` and `final` are transient stages held by
 * teams still alive in those rounds; once played they resolve to a result stage
 * (champion / runnerUp / third / fourth).
 */
export type StageKey =
  | 'champion'
  | 'final'
  | 'runnerUp'
  | 'third'
  | 'fourth'
  | 'semi'
  | 'quarter'
  | 'round16'
  | 'round32'
  | 'group'
  | 'notCompeting'

export type Status = 'alive' | 'out' | 'champion' | 'notCompeting'

/** Group-stage record, used both for display and as a leaderboard tiebreaker. */
export interface GroupRecord {
  played: number
  won: number
  drawn: number
  lost: number
  goalsFor: number
  goalsAgainst: number
  goalDiff: number
  points: number
}

/** Everything we compute about one team's run in the tournament. */
export interface TeamProgress {
  team: string
  status: Status
  /** The furthest stage the team reached (for ranking). */
  stage: StageKey
  /** Human label for the current standing, e.g. "In the Round of 16". */
  standingLabel: string
  /** How/when they went out, if eliminated. */
  eliminatedLabel?: string
  /** The team's next unplayed match, if still alive. */
  nextMatch?: FeedMatch
  /** Group-stage record (undefined for the for-fun picks). */
  groupRecord?: GroupRecord
}
