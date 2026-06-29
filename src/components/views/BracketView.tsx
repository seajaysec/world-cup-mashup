import { useMemo } from 'react'
import type { FeedMatch, RosterEntry } from '../../types'
import { canonicalTeamName, getTeamMeta } from '../../data/teams'
import { formatKickoff, formatSlot, isPlaceholder } from '../../lib/format'
import { OwnerChip } from '../Badges'
import styles from '../../styles/app.module.css'

const ROUNDS: { key: string; label: string }[] = [
  { key: 'Round of 32', label: 'Round of 32' },
  { key: 'Round of 16', label: 'Round of 16' },
  { key: 'Quarter-final', label: 'Quarter-finals' },
  { key: 'Semi-final', label: 'Semi-finals' },
  { key: 'Match for third place', label: '3rd-place playoff' },
  { key: 'Final', label: 'Final' },
]

function winnerSide(match: FeedMatch): 1 | 2 | 0 {
  const ft = match.score?.ft
  if (!ft) return 0
  return ft[0] > ft[1] ? 1 : ft[1] > ft[0] ? 2 : 0
}

function KoTeam({
  team,
  goals,
  isWinner,
  owners,
  myTeam,
}: {
  team: string
  goals?: number
  isWinner: boolean
  owners: Map<string, RosterEntry>
  myTeam: string | null
}) {
  const placeholder = isPlaceholder(team)
  const canonical = placeholder ? team : canonicalTeamName(team)
  const owner = placeholder ? undefined : owners.get(canonical)
  const mine = !placeholder && myTeam === canonical
  const classes = [styles.koTeam]
  if (isWinner) classes.push(styles.koWin)
  if (owner) classes.push(styles.fam)
  if (mine) classes.push(styles.koMine)

  return (
    <div className={classes.join(' ')}>
      <span aria-hidden className={styles.koFlag}>
        {placeholder ? '·' : (getTeamMeta(team)?.flag ?? '·')}
      </span>
      <span className={styles.koName}>{placeholder ? formatSlot(team) : team}</span>
      {owner && <OwnerChip member={owner.member} flag={owner.flag} />}
      <span className={styles.koGoals}>{goals ?? ''}</span>
    </div>
  )
}

export function BracketView({
  matches,
  owners,
  myTeam,
}: {
  matches: FeedMatch[]
  owners: Map<string, RosterEntry>
  myTeam: string | null
}) {
  const rounds = useMemo(
    () =>
      ROUNDS.map((r) => {
        const games = matches
          .filter((m) => m.round === r.key)
          .sort((a, b) => (a.num ?? 0) - (b.num ?? 0))
        const played = games.filter((m) => m.score?.ft).length
        return { ...r, games, played }
      }).filter((r) => r.games.length > 0),
    [matches],
  )

  const final = matches.find((m) => m.round === 'Final')
  const finalWinner =
    final && final.score?.ft
      ? winnerSide(final) === 1
        ? final.team1
        : winnerSide(final) === 2
          ? final.team2
          : null
      : null
  const championOwner = finalWinner ? owners.get(canonicalTeamName(finalWinner)) : undefined

  return (
    <section>
      <p className={styles.lbIntro}>
        The road to the trophy, top to bottom: {rounds.length} knockout rounds after the group
        stage. Played games show the result; upcoming ones show who&apos;s booked in (or who they&apos;re
        waiting on).
      </p>

      {finalWinner && (
        <div className={`${styles.card} ${styles.championBanner}`}>
          <span className={styles.heroFlag} aria-hidden>
            {getTeamMeta(finalWinner)?.flag ?? '🏆'}
          </span>
          <div>
            <div className={styles.championTitle}>🏆 {finalWinner} — World Champions</div>
            {championOwner && (
              <div className={styles.muted}>{championOwner.member} takes the crown!</div>
            )}
          </div>
        </div>
      )}

      {rounds.map((round) => (
        <div key={round.key} className={styles.koRound}>
          <h2 className={styles.koRoundHead}>
            <span>{round.label}</span>
            <span className={styles.koRoundCount}>
              {round.played}/{round.games.length} played
            </span>
          </h2>
          <div className={styles.koList}>
            {round.games.map((match, i) => {
              const ft = match.score?.ft
              const win = winnerSide(match)
              const fam =
                owners.has(canonicalTeamName(match.team1)) ||
                owners.has(canonicalTeamName(match.team2))
              return (
                <div
                  key={`${match.num ?? i}`}
                  className={`${styles.koMatch} ${fam ? styles.highlight : ''}`}
                >
                  <KoTeam
                    team={match.team1}
                    goals={ft?.[0]}
                    isWinner={win === 1}
                    owners={owners}
                    myTeam={myTeam}
                  />
                  <KoTeam
                    team={match.team2}
                    goals={ft?.[1]}
                    isWinner={win === 2}
                    owners={owners}
                    myTeam={myTeam}
                  />
                  <div className={styles.koMatchMeta}>
                    {formatKickoff(match)}
                    {match.ground ? ` · ${match.ground}` : ''}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </section>
  )
}
