import type { LeaderboardEntry } from '../../lib/leaderboard'
import { getTeamMeta, TEAMS } from '../../data/teams'
import { StatusBadge, TierBadge } from '../Badges'
import styles from '../../styles/app.module.css'

function RosterRow({ entry, mine }: { entry: LeaderboardEntry; mine: boolean }) {
  const meta = getTeamMeta(entry.roster.team)
  return (
    <li className={`${styles.rosterRow} ${mine ? styles.mine : ''}`}>
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
      <StatusBadge status={entry.progress.status} />
    </li>
  )
}

function Group({ title, entries, claimedMember }: { title: string; entries: LeaderboardEntry[]; claimedMember: string | null }) {
  if (entries.length === 0) return null
  return (
    <>
      <h2 className={styles.sectionTitle}>
        {title} ({entries.length})
      </h2>
      <ul className={styles.matchList} style={{ listStyle: 'none', margin: 0, padding: 0 }}>
        {entries.map((entry) => (
          <RosterRow key={entry.roster.member} entry={entry} mine={entry.roster.member === claimedMember} />
        ))}
      </ul>
    </>
  )
}

export function RosterView({
  leaderboard,
  familyTeams,
  claimedMember,
}: {
  leaderboard: LeaderboardEntry[]
  familyTeams: Set<string>
  claimedMember: string | null
}) {
  const alive = leaderboard.filter(
    (e) => e.progress.status === 'alive' || e.progress.status === 'champion',
  )
  const out = leaderboard.filter((e) => e.progress.status === 'out')
  const fun = leaderboard.filter((e) => e.progress.status === 'notCompeting')

  const available = TEAMS.filter((t) => !familyTeams.has(t.name)).sort((a, b) =>
    a.name.localeCompare(b.name),
  )

  return (
    <section>
      <Group title="Still in it" entries={alive} claimedMember={claimedMember} />
      <Group title="Knocked out" entries={out} claimedMember={claimedMember} />
      <Group title="Just for fun" entries={fun} claimedMember={claimedMember} />

      <h2 className={styles.sectionTitle}>Up for grabs ({available.length})</h2>
      <p className={styles.muted} style={{ fontSize: '0.85rem', marginTop: 0 }}>
        World Cup teams nobody picked.
      </p>
      <div className={styles.availableList}>
        {available.map((team) => (
          <span className={styles.availableChip} key={team.name}>
            <span aria-hidden>{team.flag}</span>
            {team.name}
          </span>
        ))}
      </div>
    </section>
  )
}
