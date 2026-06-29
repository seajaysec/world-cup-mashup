import { useMemo, useState } from 'react'
import type { FeedMatch, RosterEntry } from '../../types'
import { canonicalTeamName, getTeamMeta } from '../../data/teams'
import { formatKickoff, formatSlot, isPlaceholder } from '../../lib/format'
import { happyIcon, sadIcon } from '../../lib/icons'
import { OwnerChip } from '../Badges'
import styles from '../../styles/app.module.css'

// Top → bottom: the trophy first, the opening round last.
const ROUNDS: { key: string; label: string }[] = [
  { key: 'Final', label: 'Final' },
  { key: 'Match for third place', label: '3rd-place playoff' },
  { key: 'Semi-final', label: 'Semi-finals' },
  { key: 'Quarter-final', label: 'Quarter-finals' },
  { key: 'Round of 16', label: 'Round of 16' },
  { key: 'Round of 32', label: 'World Cup Start — 32 Teams' },
]

interface Round {
  key: string
  label: string
  games: FeedMatch[]
  played: number
  /** True once at least one real team has reached this round. */
  hasTeams: boolean
}

function buildRounds(matches: FeedMatch[]): Round[] {
  return ROUNDS.map((r) => {
    const games = matches
      .filter((m) => m.round === r.key)
      .sort((a, b) => (a.num ?? 0) - (b.num ?? 0))
    const played = games.filter((m) => m.score?.ft).length
    const hasTeams = games.some((m) => !isPlaceholder(m.team1) || !isPlaceholder(m.team2))
    return { ...r, games, played, hasTeams }
  }).filter((r) => r.games.length > 0)
}

function winnerSide(match: FeedMatch): 1 | 2 | 0 {
  const ft = match.score?.ft
  if (!ft) return 0
  return ft[0] > ft[1] ? 1 : ft[1] > ft[0] ? 2 : 0
}

function KoTeam({
  team,
  goals,
  isWinner,
  isLoser,
  mood,
  owners,
  myTeam,
}: {
  team: string
  goals?: number
  isWinner: boolean
  isLoser: boolean
  mood?: string
  owners: Map<string, RosterEntry>
  myTeam: string | null
}) {
  const placeholder = isPlaceholder(team)
  const canonical = placeholder ? team : canonicalTeamName(team)
  const owner = placeholder ? undefined : owners.get(canonical)
  const mine = !placeholder && myTeam === canonical
  const classes = [styles.koTeam]
  if (isWinner) classes.push(styles.koWin)
  if (isLoser) classes.push(styles.koLose)
  if (owner) classes.push(styles.fam)
  if (mine) classes.push(styles.koMine)

  return (
    <div className={classes.join(' ')}>
      <span aria-hidden className={styles.koFlag}>
        {placeholder ? '·' : (getTeamMeta(team)?.flag ?? '·')}
      </span>
      <span className={styles.koName}>{placeholder ? formatSlot(team) : team}</span>
      {owner && <OwnerChip member={owner.member} flag={owner.flag} />}
      {mood && (
        <span aria-hidden className={styles.koMood}>
          {mood}
        </span>
      )}
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
  const rounds = useMemo(() => buildRounds(matches), [matches])
  const [open, setOpen] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {}
    for (const r of buildRounds(matches)) init[r.key] = r.hasTeams
    return init
  })

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
        The road to the trophy, trophy-first. Tap a round to open or close it — rounds without teams
        yet start collapsed. Played games show the score and who advanced.
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

      {rounds.map((round) => {
        const isOpen = open[round.key] ?? round.hasTeams
        return (
          <div key={round.key} className={styles.koRound}>
            <button
              type="button"
              className={styles.koRoundHead}
              aria-expanded={isOpen}
              onClick={() => setOpen((o) => ({ ...o, [round.key]: !isOpen }))}
            >
              <span className={styles.koChevron} aria-hidden>
                {isOpen ? '▾' : '▸'}
              </span>
              <span className={styles.koRoundLabel}>{round.label}</span>
              <span className={styles.koRoundCount}>
                {round.played}/{round.games.length} played
              </span>
            </button>

            {isOpen && (
              <div className={styles.koList}>
                {round.games.map((match, i) => {
                  const ft = match.score?.ft
                  const win = winnerSide(match)
                  const seed = match.num ?? i
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
                        isLoser={win === 2}
                        mood={win === 1 ? happyIcon(seed) : win === 2 ? sadIcon(seed) : undefined}
                        owners={owners}
                        myTeam={myTeam}
                      />
                      <KoTeam
                        team={match.team2}
                        goals={ft?.[1]}
                        isWinner={win === 2}
                        isLoser={win === 1}
                        mood={win === 2 ? happyIcon(seed) : win === 1 ? sadIcon(seed) : undefined}
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
            )}
          </div>
        )
      })}
    </section>
  )
}
