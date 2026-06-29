import type { FeedMatch, TeamMeta } from '../../types'
import type { LeaderboardEntry } from '../../lib/leaderboard'
import type { JokeProgress } from '../../lib/joke'
import { getTeamMeta } from '../../data/teams'
import { formatKickoff, formatSlot, isPlaceholder } from '../../lib/format'
import { StatusBadge, TierBadge } from '../Badges'
import { ClaimPicker } from '../ClaimPicker'
import { JokeCard } from '../JokeCard'
import styles from '../../styles/app.module.css'

/** When your team is out, pencil in a still-alive replacement (local only). */
function RepickPanel({
  member,
  deadTeam,
  available,
  repickTeam,
  onRepick,
  onClearRepick,
}: {
  member: string
  deadTeam: string
  available: TeamMeta[]
  repickTeam: string | undefined
  onRepick: (team: string) => void
  onClearRepick: () => void
}) {
  const repickMeta = repickTeam ? getTeamMeta(repickTeam) : undefined
  return (
    <div className={`${styles.card} ${styles.repickCard}`}>
      <div className={styles.sectionTitle}>Pick a replacement</div>
      {repickTeam ? (
        <>
          <div className={styles.nextOpponent}>
            {repickMeta?.flag ?? '🆕'} {repickTeam}
          </div>
          <p className={styles.muted}>
            Provisional — saved on this device only. 📩 Message Chris to make it official:
          </p>
          <p className={styles.repickMessage}>“Hey Chris, {member} is re-picking {repickTeam}.”</p>
          <div className={styles.repickActions}>
            <label>
              <span className="visually-hidden">Change replacement</span>
              <select
                className={styles.select}
                value={repickTeam}
                onChange={(e) => e.target.value && onRepick(e.target.value)}
              >
                {available.map((t) => (
                  <option key={t.name} value={t.name}>
                    {t.flag} {t.name}
                  </option>
                ))}
              </select>
            </label>
            <button type="button" className={styles.linkButton} onClick={onClearRepick}>
              Clear
            </button>
          </div>
        </>
      ) : (
        <>
          <p className={styles.muted}>
            {deadTeam} is out. Choose a still-alive team nobody owns to pencil in as your new pick,
            then tell Chris.
          </p>
          <label>
            <span className="visually-hidden">Choose a replacement team</span>
            <select
              className={styles.select}
              defaultValue=""
              onChange={(e) => e.target.value && onRepick(e.target.value)}
            >
              <option value="" disabled>
                {available.length ? 'Pick a replacement…' : 'No teams available right now'}
              </option>
              {available.map((t) => (
                <option key={t.name} value={t.name}>
                  {t.flag} {t.name}
                </option>
              ))}
            </select>
          </label>
        </>
      )}
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
  available,
  repickTeam,
  onRepick,
  onClearRepick,
}: {
  entry: LeaderboardEntry | undefined
  total: number
  onClaim: (member: string) => void
  claimedMember: string | null
  joke: JokeProgress | undefined
  available: TeamMeta[]
  repickTeam: string | undefined
  onRepick: (team: string) => void
  onClearRepick: () => void
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

  // For-fun picks get their own silly evolving season instead of a WC card.
  if (roster.joke && joke) {
    return <JokeCard joke={joke} member={roster.member} />
  }

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

      {progress.status === 'out' && (
        <RepickPanel
          member={roster.member}
          deadTeam={roster.team}
          available={available}
          repickTeam={repickTeam}
          onRepick={onRepick}
          onClearRepick={onClearRepick}
        />
      )}

      <GroupRecord entry={entry} />
    </>
  )
}
