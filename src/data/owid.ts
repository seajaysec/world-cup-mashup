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

export interface OwidStat {
  value: number
  display: string
  rank: number
  total: number
  year: number
}

interface OwidFile {
  generated: string
  source: string
  metrics: OwidMetric[]
  data: Record<string, Record<string, OwidStat>>
}

const owid = raw as OwidFile

export const OWID_METRICS: OwidMetric[] = owid.metrics
export const OWID_GENERATED: string = owid.generated
export const OWID_SOURCE: string = owid.source

/** Every metric paired with this team's stat (or null when OWID has no value). */
export function owidStatsFor(team: string): { metric: OwidMetric; stat: OwidStat | null }[] {
  const name = canonicalTeamName(team)
  return owid.metrics.map((metric) => ({ metric, stat: owid.data[metric.key]?.[name] ?? null }))
}
