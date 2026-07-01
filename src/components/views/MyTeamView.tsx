import type { FeedMatch } from '../../types'
import type { LeaderboardEntry } from '../../lib/leaderboard'
import type { JokeProgress } from '../../lib/joke'
import { formatOdds, getTeamMeta, TIER_LABELS } from '../../data/teams'
import { formatKickoff, formatSlot, isPlaceholder } from '../../lib/format'
import { StatusBadge, TierBadge } from '../Badges'
import { CountryStats } from '../CountryStats'
import { useFavor } from '../FavorContext'
import { ClaimPicker } from '../ClaimPicker'
import { JokeCard } from '../JokeCard'
import styles from '../../styles/app.module.css'

/** Your team's out and re-picks are closed — no replacement, just the send-off. */
function OutCard({ team }: { team: string }) {
  return (
    <div className={`${styles.card} ${styles.repickCard}`}>
      <div className={styles.sectionTitle}>Knocked out</div>
      <p className={styles.muted} style={{ marginBottom: 0 }}>
        {team} is out — and every team is taken, so there&apos;s no re-pick this time. If
        you&apos;re out, you&apos;re out. Better luck next year! 🫡
      </p>
    </div>
  )
}

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
  joke,
  mySpoons,
}: {
  entry: LeaderboardEntry | undefined
  total: number
  onClaim: (member: string) => void
  claimedMember: string | null
  joke: JokeProgress | undefined
  mySpoons: number
}) {
  const favor = useFavor()
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

  // For-fun picks get their own silly evolving season instead of a WC card.
  if (roster.joke && joke) {
    return <JokeCard joke={joke} member={roster.member} />
  }

  const meta = getTeamMeta(roster.team)
  const live = progress.status === 'alive' || progress.status === 'champion' ? favor(roster.team) : undefined

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
          {live && <TierBadge tier={live.tier} odds={live.odds} />}
        </div>
        <p className={styles.muted}>{progress.standingLabel}</p>
        {live && (
          <p className={styles.lbStat}>
            🏆 {formatOdds(live.odds)} chance to win the tournament · was{' '}
            {formatOdds(live.priorOdds)} before kickoff
          </p>
        )}
        {!live && meta && progress.status === 'out' && (
          <p className={styles.lbStat}>
            Pre-tournament: {TIER_LABELS[meta.tier]} · 🏆 {formatOdds(meta.odds)} to win the tournament
          </p>
        )}
      </div>

      <div className={styles.card}>
        <div className={styles.rankCallout}>
          {entry.isLeader && '👑 '}
          <strong>#{entry.rank}</strong> of {total}
          {entry.isLeader && ' — top of the family! On track to win it all.'}
        </div>
        {mySpoons > 0 && (
          <p className={styles.lbStat}>
            🥄 {mySpoons} wooden spoon{mySpoons === 1 ? '' : 's'} so far (teams of yours knocked
            out) — see the Feuds tab.
          </p>
        )}
      </div>

      {progress.status === 'alive' && progress.nextMatch && (
        <NextMatch match={progress.nextMatch} team={progress.team} />
      )}

      {progress.status === 'out' && <OutCard team={roster.team} />}

      <GroupRecord entry={entry} />

      <CountryStats team={roster.team} />
    </>
  )
}
