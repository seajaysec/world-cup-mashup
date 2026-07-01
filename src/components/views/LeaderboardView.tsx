import type { GroupRecord, Tier } from '../../types'
import type { LeaderboardEntry } from '../../lib/leaderboard'
import type { JokeProgress } from '../../lib/joke'
import { ROSTER } from '../../data/roster'
import { getTeamMeta, TIER_LABELS, TIER_RANGE_LABELS } from '../../data/teams'
import { StatusBadge, TierBadge } from '../Badges'
import { useFavor } from '../FavorContext'
import styles from '../../styles/app.module.css'

const TIER_ORDER: Tier[] = ['favorite', 'contender', 'darkhorse', 'longshot']

/** "1 pt · −8 GD · 1 GF" — the group-stage tiebreakers, shown so the ordering
 * (and the wooden spoon) is self-explanatory. */
function groupStatLine(rec: GroupRecord): string {
  const gd = rec.goalDiff > 0 ? `+${rec.goalDiff}` : `${rec.goalDiff}`
  return `${rec.points} pt${rec.points === 1 ? '' : 's'} · ${gd} GD · ${rec.goalsFor} GF`
}

function rowClasses(entry: LeaderboardEntry, mine: boolean): string {
  const classes = [styles.lbRow]
  if (entry.isLeader) classes.push(styles.leader)
  if (mine) classes.push(styles.mine)
  return classes.join(' ')
}

export function LeaderboardView({
  leaderboard,
  claimedMember,
  jokeByMember,
}: {
  leaderboard: LeaderboardEntry[]
  claimedMember: string | null
  jokeByMember: Map<string, JokeProgress>
}) {
  const favor = useFavor()

  // Anyone who was re-assigned keeps a visible history (re-picks are closed now).
  const reassigned = ROSTER.filter((r) => r.formerTeams && r.formerTeams.length > 0)

  return (
    <section>
      <p className={styles.lbIntro}>
        Everyone ranked best to worst by how far their team has gone. 👑 leads the race to{' '}
        <strong>win it all</strong>. Ties break on group points, goal difference, then goals scored.
        The ✨ exhibition sides play their own game. The 🥄 wooden-spoon race (most teams knocked
        out) lives on the <strong>Feuds</strong> tab.
      </p>
      <p className={styles.tierLegend}>
        Every 🏆 % is the same thing: the live chance to win the whole tournament.{' '}
        {TIER_ORDER.map((t, i) => (
          <span key={t}>
            {i > 0 && ' · '}
            <strong>{TIER_LABELS[t]}</strong> {TIER_RANGE_LABELS[t]}
          </span>
        ))}
        . <a href="#how-it-works">How it&apos;s calculated →</a>
      </p>

      <ol className={styles.lbList} style={{ listStyle: 'none', margin: 0, padding: 0 }}>
        {leaderboard.map((entry) => {
          const meta = getTeamMeta(entry.roster.team)
          const mine = entry.roster.member === claimedMember
          const joke =
            entry.progress.status === 'notCompeting'
              ? jokeByMember.get(entry.roster.member)
              : undefined
          const live =
            entry.progress.status === 'alive' || entry.progress.status === 'champion'
              ? favor(entry.roster.team)
              : undefined
          return (
            <li className={rowClasses(entry, mine)} key={entry.roster.member}>
              <span className={styles.lbRank}>
                {entry.isLeader ? '👑' : joke ? '✨' : entry.rank}
              </span>
              <span className={styles.lbFlag} aria-hidden>
                {entry.roster.flag}
              </span>
              <span className={styles.lbWho}>
                <div className={styles.lbMember}>{entry.roster.member}</div>
                <div className={styles.lbTeam}>
                  {entry.roster.team}
                  {meta ? (
                    live && <TierBadge tier={live.tier} odds={live.odds} />
                  ) : (
                    joke && <TierBadge tier={joke.tier} />
                  )}
                </div>
                {entry.progress.status === 'out' && entry.progress.groupRecord && (
                  <div className={styles.lbStat}>{groupStatLine(entry.progress.groupRecord)}</div>
                )}
              </span>
              <span className={styles.lbRight}>
                {joke ? (
                  <>
                    <span className={`${styles.badge} ${styles.statusSparkle}`}>
                      ✨ {joke.record.points} pts
                    </span>
                    <span className={styles.muted} style={{ fontSize: '0.72rem' }}>
                      {joke.form || 'warming up'}
                    </span>
                  </>
                ) : (
                  <>
                    <StatusBadge status={entry.progress.status} />
                    <span className={styles.muted} style={{ fontSize: '0.75rem' }}>
                      {entry.progress.standingLabel}
                    </span>
                  </>
                )}
              </span>
            </li>
          )
        })}
      </ol>

      {reassigned.length > 0 && (
        <>
          <h2 className={styles.sectionTitle}>Re-pick history</h2>
          <ul className={styles.matchList} style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            {reassigned.map((r) => (
              <li className={styles.rosterRow} key={r.member}>
                <span className={styles.lbFlag} aria-hidden>
                  {r.flag}
                </span>
                <span className={styles.lbWho}>
                  <div className={styles.lbMember}>{r.member}</div>
                  <div className={styles.lbTeam}>
                    was {r.formerTeams!.map((f) => f.team).join(', ')} → now {r.team}
                  </div>
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  )
}
