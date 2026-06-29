import raw from './owid-stats.json'
import { canonicalTeamName } from './teams'

export interface OwidMetric {
  key: string
  title: string
  slug: string
  dir: 'high' | 'low'
  note: string
  page: string
}

export interface OwidValue {
  value: number
  display: string
  year: number
}

interface OwidFile {
  generated: string
  source: string
  metrics: OwidMetric[]
  data: Record<string, Record<string, OwidValue>>
}

const owid = raw as OwidFile

export const OWID_METRICS: OwidMetric[] = owid.metrics
export const OWID_GENERATED: string = owid.generated
export const OWID_SOURCE: string = owid.source

const byKey = new Map(owid.metrics.map((m) => [m.key, m]))

export function owidValue(metricKey: string, team: string): OwidValue | null {
  return owid.data[metricKey]?.[canonicalTeamName(team)] ?? null
}

export interface RankedTeam extends OwidValue {
  team: string
  rank: number
}

/** Rank the given teams (those with data) for a metric, best → worst per its
 * direction. This is "a separate competition" — pass the 48 World Cup teams, or
 * just the family's teams. */
export function leaderboardAmong(metricKey: string, teams: string[]): RankedTeam[] {
  const metric = byKey.get(metricKey)
  const table = owid.data[metricKey]
  if (!metric || !table) return []
  const rows = teams
    .map((t) => ({ name: canonicalTeamName(t), v: table[canonicalTeamName(t)] }))
    .filter((r): r is { name: string; v: OwidValue } => Boolean(r.v))
    // De-dupe (e.g. England & Scotland both → UK figures would double-count).
    .filter((r, i, arr) => arr.findIndex((x) => x.name === r.name) === i)
    .sort((a, b) => (metric.dir === 'high' ? b.v.value - a.v.value : a.v.value - b.v.value))
  return rows.map((r, i) => ({ team: r.name, rank: i + 1, ...r.v }))
}

/** A team's rank + the field size, among the given pool. */
export function rankAmong(
  metricKey: string,
  team: string,
  teams: string[],
): { rank: number; total: number; value: OwidValue } | null {
  const board = leaderboardAmong(metricKey, teams)
  const name = canonicalTeamName(team)
  const row = board.find((r) => r.team === name)
  if (!row) return null
  return { rank: row.rank, total: board.length, value: { value: row.value, display: row.display, year: row.year } }
}
