import { useMemo, useState } from 'react'
import type { FeedMatch, RosterEntry } from '../../types'
import { canonicalTeamName } from '../../data/teams'
import { matchTimeKey } from '../../lib/format'
import { MatchRow } from '../MatchRow'
import styles from '../../styles/app.module.css'

type Filter = 'mine' | 'family' | 'all'

function involves(match: FeedMatch, teams: Set<string>): boolean {
  return teams.has(canonicalTeamName(match.team1)) || teams.has(canonicalTeamName(match.team2))
}

export function ScheduleView({
  matches,
  owners,
  myTeam,
}: {
  matches: FeedMatch[]
  owners: Map<string, RosterEntry>
  myTeam: string | null
}) {
  const [filter, setFilter] = useState<Filter>(myTeam ? 'mine' : 'family')
  const family = useMemo(() => new Set(owners.keys()), [owners])

  const { upcoming, results } = useMemo(() => {
    const teams =
      filter === 'all'
        ? null
        : filter === 'mine' && myTeam
          ? new Set([myTeam])
          : family

    const visible = teams ? matches.filter((m) => involves(m, teams)) : matches
    const played = visible
      .filter((m) => m.score?.ft)
      .sort((a, b) => matchTimeKey(b) - matchTimeKey(a))
    const pending = visible
      .filter((m) => !m.score?.ft)
      .sort((a, b) => matchTimeKey(a) - matchTimeKey(b))
    return { upcoming: pending, results: played }
  }, [matches, family, myTeam, filter])

  const mineSet = useMemo(() => (myTeam ? new Set([myTeam]) : null), [myTeam])

  return (
    <section>
      <div className={styles.filterRow} role="group" aria-label="Filter matches">
        {myTeam && (
          <button
            type="button"
            className={`${styles.filterButton} ${filter === 'mine' ? styles.active : ''}`}
            onClick={() => setFilter('mine')}
          >
            My team
          </button>
        )}
        <button
          type="button"
          className={`${styles.filterButton} ${filter === 'family' ? styles.active : ''}`}
          onClick={() => setFilter('family')}
        >
          Family teams
        </button>
        <button
          type="button"
          className={`${styles.filterButton} ${filter === 'all' ? styles.active : ''}`}
          onClick={() => setFilter('all')}
        >
          All matches
        </button>
      </div>

      <h2 className={styles.sectionTitle}>Coming up ({upcoming.length})</h2>
      {upcoming.length === 0 ? (
        <p className={styles.muted}>No upcoming matches for this filter.</p>
      ) : (
        <div className={styles.matchList}>
          {upcoming.map((match, i) => (
            <MatchRow
              key={`${match.round}-${match.team1}-${match.team2}-${i}`}
              match={match}
              owners={owners}
              highlight={Boolean(mineSet) && involves(match, mineSet!)}
            />
          ))}
        </div>
      )}

      <h2 className={styles.sectionTitle}>Results ({results.length})</h2>
      {results.length === 0 ? (
        <p className={styles.muted}>No results yet.</p>
      ) : (
        <div className={styles.matchList}>
          {results.map((match, i) => (
            <MatchRow
              key={`${match.round}-${match.team1}-${match.team2}-${i}`}
              match={match}
              owners={owners}
              highlight={Boolean(mineSet) && involves(match, mineSet!)}
            />
          ))}
        </div>
      )}
    </section>
  )
}
