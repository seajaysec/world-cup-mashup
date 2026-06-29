import type { LeaderboardEntry } from '../../lib/leaderboard'
import type { JokeProgress } from '../../lib/joke'
import { getTeamMeta } from '../../data/teams'
import { StatusBadge, TierBadge } from '../Badges'
import styles from '../../styles/app.module.css'

function rowClasses(entry: LeaderboardEntry, mine: boolean): string {
  const classes = [styles.lbRow]
  if (entry.isLeader) classes.push(styles.leader)
  if (entry.isWoodenSpoon) classes.push(styles.spoon)
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
  return (
    <section>
      <p className={styles.lbIntro}>
        Everyone ranked best to worst. 👑 leads the race to <strong>win it all</strong>; 🥄 is the
        wooden spoon for <strong>losing the whole thing</strong>. Ties are broken by group-stage
        points, goal difference, then goals scored. The ✨ exhibition sides play their own game.
      </p>
      <ol className={styles.lbList} style={{ listStyle: 'none', margin: 0, padding: 0 }}>
        {leaderboard.map((entry) => {
          const meta = getTeamMeta(entry.roster.team)
          const mine = entry.roster.member === claimedMember
          const joke = entry.progress.status === 'notCompeting' ? jokeByMember.get(entry.roster.member) : undefined
          return (
            <li className={rowClasses(entry, mine)} key={entry.roster.member}>
              <span className={styles.lbRank}>
                {entry.isLeader ? '👑' : entry.isWoodenSpoon ? '🥄' : joke ? '✨' : entry.rank}
              </span>
              <span className={styles.lbFlag} aria-hidden>
                {entry.roster.flag}
              </span>
              <span className={styles.lbWho}>
                <div className={styles.lbMember}>{entry.roster.member}</div>
                <div className={styles.lbTeam}>
                  {entry.roster.team}
                  {meta && <TierBadge tier={meta.tier} />}
                </div>
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
    </section>
  )
}
