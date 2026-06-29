import type { FeedMatch, RosterEntry } from '../types'
import { canonicalTeamName, getTeamMeta } from '../data/teams'
import { formatKickoff, formatSlot, isPlaceholder } from '../lib/format'
import { FavorMark, OwnerChip } from './Badges'
import styles from '../styles/app.module.css'

interface SideProps {
  team: string
  side: 'left' | 'right'
  isWinner: boolean
  owners: Map<string, RosterEntry>
}

function flagFor(team: string): string {
  return getTeamMeta(team)?.flag ?? '·'
}

function MatchSide({ team, side, isWinner, owners }: SideProps) {
  const placeholder = isPlaceholder(team)
  const name = placeholder ? formatSlot(team) : team
  const owner = placeholder ? undefined : owners.get(canonicalTeamName(team))
  const classes = [styles.matchSide, side === 'right' ? styles.right : '']
  if (isWinner) classes.push(styles.win)
  if (owner) classes.push(styles.fam)

  return (
    <div className={classes.join(' ')}>
      <div className={styles.matchSideMain}>
        {side === 'left' && <span aria-hidden>{placeholder ? '·' : flagFor(team)}</span>}
        <span className={styles.nm}>{name}</span>
        {side === 'right' && <span aria-hidden>{placeholder ? '·' : flagFor(team)}</span>}
      </div>
      {(owner || !placeholder) && (
        <div className={styles.matchSideMeta}>
          {owner && <OwnerChip member={owner.member} flag={owner.flag} />}
          {!placeholder && <FavorMark team={team} />}
        </div>
      )}
    </div>
  )
}

/** A single fixture: round + time, both teams (with owners), and score or "vs". */
export function MatchRow({
  match,
  owners,
  highlight,
}: {
  match: FeedMatch
  owners: Map<string, RosterEntry>
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
        <MatchSide team={match.team1} side="left" isWinner={team1Won} owners={owners} />
        {played ? (
          <span className={styles.matchScore}>
            {g1}&ndash;{g2}
          </span>
        ) : (
          <span className={`${styles.matchScore} ${styles.vs}`}>vs</span>
        )}
        <MatchSide team={match.team2} side="right" isWinner={team2Won} owners={owners} />
      </div>
      {match.ground && <div className={styles.matchVenue}>📍 {match.ground}</div>}
    </div>
  )
}
