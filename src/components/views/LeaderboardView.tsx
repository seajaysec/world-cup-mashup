import type { GroupRecord, RosterEntry, Tier, TeamProgress } from '../../types'
import type { LeaderboardEntry } from '../../lib/leaderboard'
import type { JokeProgress } from '../../lib/joke'
import { ROSTER } from '../../data/roster'
import { getTeamMeta, TEAMS, TIER_LABELS, TIER_RANGE_LABELS } from '../../data/teams'
import { StatusBadge, TierBadge } from '../Badges'
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
  if (entry.isWoodenSpoon) classes.push(styles.spoon)
  if (mine) classes.push(styles.mine)
  return classes.join(' ')
}

export function LeaderboardView({
  leaderboard,
  claimedMember,
  jokeByMember,
  progressByTeam,
  ownerByTeam,
}: {
  leaderboard: LeaderboardEntry[]
  claimedMember: string | null
  jokeByMember: Map<string, JokeProgress>
  progressByTeam: Map<string, TeamProgress>
  ownerByTeam: Map<string, RosterEntry>
}) {
  // Members whose current team is out — they need a fresh pick.
  const needNewTeam = leaderboard.filter((e) => e.progress.status === 'out')

  // Unpicked teams still alive — the good replacement options.
  const upForGrabs = TEAMS.filter((t) => {
    if (ownerByTeam.has(t.name)) return false
    const status = progressByTeam.get(t.name)?.status
    return status === 'alive' || status === 'champion'
  }).sort((a, b) => a.name.localeCompare(b.name))

  // Anyone who has already been re-assigned keeps a visible history.
  const reassigned = ROSTER.filter((r) => r.formerTeams && r.formerTeams.length > 0)

  return (
    <section>
      <p className={styles.lbIntro}>
        Everyone ranked best to worst. 👑 leads the race to <strong>win it all</strong>; 🥄 is the
        wooden spoon for <strong>losing the whole thing</strong>. Ties break on group points, goal
        difference, then goals scored. Only the current last-place real team holds the 🥄 — it moves
        as teams go out. The ✨ exhibition sides play their own game.
      </p>
      <p className={styles.tierLegend}>
        Favoredness ={' '}
        {TIER_ORDER.map((t, i) => (
          <span key={t}>
            {i > 0 && ' · '}
            <strong>{TIER_LABELS[t]}</strong> {TIER_RANGE_LABELS[t]}
          </span>
        ))}{' '}
        to win it all.
      </p>

      <ol className={styles.lbList} style={{ listStyle: 'none', margin: 0, padding: 0 }}>
        {leaderboard.map((entry) => {
          const meta = getTeamMeta(entry.roster.team)
          const mine = entry.roster.member === claimedMember
          const joke =
            entry.progress.status === 'notCompeting'
              ? jokeByMember.get(entry.roster.member)
              : undefined
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
                  {meta ? (
                    <TierBadge tier={meta.tier} odds={meta.odds} />
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

      {needNewTeam.length > 0 && (
        <>
          <h2 className={styles.sectionTitle}>Knocked out — time to re-pick ({needNewTeam.length})</h2>
          <p className={styles.muted} style={{ fontSize: '0.85rem', marginTop: 0 }}>
            Out and ordered best → worst, so the bottom one holds the 🥄. The tiebreaker is
            group-stage record — points, then goal difference, then goals for (shown below each).
            Owners can pencil in a replacement on the <strong>My Team</strong> tab, then 📩 contact
            Chris to make it official.
          </p>
          <ul className={styles.matchList} style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            {needNewTeam.map((e) => (
              <li className={styles.rosterRow} key={e.roster.member}>
                <span className={styles.lbFlag} aria-hidden>
                  {e.roster.flag}
                </span>
                <span className={styles.lbWho}>
                  <div className={styles.lbMember}>
                    {e.isWoodenSpoon && '🥄 '}
                    {e.roster.member}
                  </div>
                  <div className={styles.lbTeam}>{e.roster.team} — knocked out</div>
                  {e.progress.groupRecord && (
                    <div className={styles.lbStat}>{groupStatLine(e.progress.groupRecord)}</div>
                  )}
                </span>
                <span className={`${styles.badge} ${styles.statusOut}`}>Needs a team</span>
              </li>
            ))}
          </ul>
        </>
      )}

      <h2 className={styles.sectionTitle}>Up for grabs — still alive ({upForGrabs.length})</h2>
      <p className={styles.muted} style={{ fontSize: '0.85rem', marginTop: 0 }}>
        Teams nobody picked that are still in the tournament — fair game for a re-pick.
      </p>
      <div className={styles.availableList}>
        {upForGrabs.length === 0 ? (
          <span className={styles.muted}>None right now.</span>
        ) : (
          upForGrabs.map((team) => (
            <span className={styles.availableChip} key={team.name}>
              <span aria-hidden>{team.flag}</span>
              {team.name}
              <TierBadge tier={team.tier} odds={team.odds} />
            </span>
          ))
        )}
      </div>

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
                    was {r.formerTeams!.join(', ')} → now {r.team}
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
