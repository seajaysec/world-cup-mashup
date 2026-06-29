import type { FeedMatch } from '../types'
import { canonicalTeamName, getTeamMeta } from '../data/teams'
import { formatKickoff, formatSlot, isPlaceholder } from '../lib/format'
import styles from '../styles/app.module.css'

interface SideProps {
  team: string
  side: 'left' | 'right'
  goals?: number
  isWinner: boolean
  family: Set<string>
}

function flagFor(team: string): string {
  return getTeamMeta(team)?.flag ?? '·'
}

function MatchSide({ team, side, isWinner, family }: SideProps) {
  const placeholder = isPlaceholder(team)
  const name = placeholder ? formatSlot(team) : team
  const isFamily = !placeholder && family.has(canonicalTeamName(team))
  const classes = [styles.matchSide, side === 'right' ? styles.right : '']
  if (isWinner) classes.push(styles.win)
  if (isFamily) classes.push(styles.fam)

  return (
    <div className={classes.join(' ')}>
      {side === 'left' && <span aria-hidden>{placeholder ? '·' : flagFor(team)}</span>}
      <span className={styles.nm}>{name}</span>
      {side === 'right' && <span aria-hidden>{placeholder ? '·' : flagFor(team)}</span>}
    </div>
  )
}

/** A single fixture: round + time, both teams, and the score or a "vs" pill. */
export function MatchRow({
  match,
  family,
  highlight,
}: {
  match: FeedMatch
  family: Set<string>
  highlight?: boolean
}) {
  const ft = match.score?.ft
  const played = Boolean(ft)
  const [g1, g2] = ft ?? [undefined, undefined]
  const team1Won = played && g1! > g2!
  const team2Won = played && g2! > g1!

  return (
    <div className={`${styles.matchRow} ${highlight ? styles.highlight : ''}`}>
      <div className={styles.matchMeta}>
        <span>{match.group ?? match.round}</span>
        <span>{formatKickoff(match)}</span>
      </div>
      <div className={styles.matchTeams}>
        <MatchSide team={match.team1} side="left" isWinner={team1Won} family={family} />
        {played ? (
          <span className={styles.matchScore}>
            {g1}&ndash;{g2}
          </span>
        ) : (
          <span className={`${styles.matchScore} ${styles.vs}`}>vs</span>
        )}
        <MatchSide team={match.team2} side="right" isWinner={team2Won} family={family} />
      </div>
      {match.ground && <div className={styles.matchVenue}>📍 {match.ground}</div>}
    </div>
  )
}
