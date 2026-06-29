import { useState } from 'react'
import type { FeedMatch, TeamMeta } from '../../types'
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

/** When your team is out, pencil in a still-alive replacement (local only). You
 * can scout a candidate's country stats before committing. */
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
  const [preview, setPreview] = useState('')

  if (repickTeam) {
    const repickMeta = getTeamMeta(repickTeam)
    return (
      <>
        <div className={`${styles.card} ${styles.repickCard}`}>
          <div className={styles.sectionTitle}>Your replacement pick</div>
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
        </div>
        <CountryStats team={repickTeam} heading={`Where ${repickTeam} ranks in the world`} />
      </>
    )
  }

  return (
    <>
      <div className={`${styles.card} ${styles.repickCard}`}>
        <div className={styles.sectionTitle}>Pick a replacement</div>
        <p className={styles.muted}>
          {deadTeam} is out. Scout a still-alive team nobody owns — check how they stack up below —
          then lock it in and tell Chris.
        </p>
        <label>
          <span className="visually-hidden">Scout a replacement team</span>
          <select
            className={styles.select}
            value={preview}
            onChange={(e) => setPreview(e.target.value)}
          >
            <option value="" disabled>
              {available.length ? 'Scout a replacement…' : 'No teams available right now'}
            </option>
            {available.map((t) => (
              <option key={t.name} value={t.name}>
                {t.flag} {t.name}
              </option>
            ))}
          </select>
        </label>
        {preview && (
          <button
            type="button"
            className={styles.primaryButton}
            style={{ marginTop: 'var(--space-3)' }}
            onClick={() => onRepick(preview)}
          >
            Make {preview} my pick
          </button>
        )}
      </div>
      {preview && <CountryStats team={preview} heading={`Scouting ${preview}`} />}
    </>
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
  mySpoons,
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

      <CountryStats team={roster.team} />
    </>
  )
}
