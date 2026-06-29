import type { FeedMatch } from '../../types'
import type { LeaderboardEntry } from '../../lib/leaderboard'
import { getTeamMeta } from '../../data/teams'
import { formatKickoff, formatSlot, isPlaceholder } from '../../lib/format'
import { StatusBadge, TierBadge } from '../Badges'
import { ClaimPicker } from '../ClaimPicker'
import styles from '../../styles/app.module.css'

function NextMatch({ match, team }: { match: FeedMatch; team: string }) {
  const opponentRaw = match.team1 === team ? match.team2 : match.team1
  const opponent = isPlaceholder(opponentRaw) ? formatSlot(opponentRaw) : opponentRaw
  const opponentFlag = isPlaceholder(opponentRaw) ? '' : (getTeamMeta(opponentRaw)?.flag ?? '')

  return (
    <div className={styles.card}>
      <div className={styles.sectionTitle}>Next match</div>
      <div className={styles.nextMatch}>
        <div className={styles.nextOpponent}>
          vs {opponentFlag} {opponent}
        </div>
        <div className={styles.nextMeta}>{match.round}</div>
        <div className={styles.nextMeta}>🕑 {formatKickoff(match)}</div>
        {match.ground && <div className={styles.nextMeta}>📍 {match.ground}</div>}
      </div>
    </div>
  )
}

function GroupRecord({ entry }: { entry: LeaderboardEntry }) {
  const rec = entry.progress.groupRecord
  if (!rec || rec.played === 0) return null
  const cells: [string, string | number][] = [
    ['Pts', rec.points],
    ['W-D-L', `${rec.won}-${rec.drawn}-${rec.lost}`],
    ['Goals', `${rec.goalsFor}-${rec.goalsAgainst}`],
    ['GD', rec.goalDiff > 0 ? `+${rec.goalDiff}` : rec.goalDiff],
  ]
  return (
    <div className={styles.card}>
      <div className={styles.sectionTitle}>Group stage</div>
      <div className={styles.statGrid}>
        {cells.map(([label, value]) => (
          <div className={styles.stat} key={label}>
            <div className={styles.statValue}>{value}</div>
            <div className={styles.statLabel}>{label}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

export function MyTeamView({
  entry,
  total,
  onClaim,
  claimedMember,
}: {
  entry: LeaderboardEntry | undefined
  total: number
  onClaim: (member: string) => void
  claimedMember: string | null
}) {
  if (!entry) {
    return (
      <div className={styles.card}>
        <div className={styles.sectionTitle}>Welcome</div>
        <p className={styles.muted}>
          Pick your name to follow your team — how it&apos;s doing, what&apos;s next, and where you
          sit in the family standings.
        </p>
        <ClaimPicker value={claimedMember} onClaim={onClaim} />
      </div>
    )
  }

  const { roster, progress } = entry
  const meta = getTeamMeta(roster.team)

  return (
    <>
      <div className={`${styles.card} ${styles.heroCard}`}>
        <div className={styles.heroTop}>
          <span className={styles.heroFlag} aria-hidden>
            {roster.flag}
          </span>
          <div className={styles.heroNames}>
            <span className={styles.heroTeam}>{roster.team}</span>
            <span className={styles.heroMember}>{roster.member}&apos;s pick</span>
          </div>
        </div>
        <div className={styles.heroBadges}>
          <StatusBadge status={progress.status} />
          {meta && <TierBadge tier={meta.tier} />}
        </div>
        <p className={styles.muted}>{progress.standingLabel}</p>
      </div>

      <div className={styles.card}>
        <div className={styles.rankCallout}>
          {entry.isLeader && '👑 '}
          {entry.isWoodenSpoon && '🥄 '}
          <strong>#{entry.rank}</strong> of {total}
          {entry.isLeader && ' — top of the family! On track to win it all.'}
          {entry.isWoodenSpoon && ' — bottom of the pile (so far).'}
        </div>
      </div>

      {progress.status === 'alive' && progress.nextMatch && (
        <NextMatch match={progress.nextMatch} team={progress.team} />
      )}

      <GroupRecord entry={entry} />
    </>
  )
}
