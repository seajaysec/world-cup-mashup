import type { FeedMatch, RosterEntry } from '../types'
import { canonicalTeamName, getTeamMeta } from '../data/teams'
import { finalScore, formatKickoff, formatSlot, isPlaceholder, wasShootout, winnerSide } from '../lib/format'
import { FavorMark, OwnerChip, UnclaimedTag } from './Badges'
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
      {!placeholder && (
        <div className={styles.matchSideMeta}>
          {owner ? <OwnerChip member={owner.member} flag={owner.flag} /> : <UnclaimedTag />}
          <FavorMark team={team} />
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
  // The decisive score (after extra time if played), and who actually won —
  // never a raw full-time read, so an extra-time or shootout win is shown right.
  const final = finalScore(match)
  const played = Boolean(final)
  const [g1, g2] = final ?? [undefined, undefined]
  const side = winnerSide(match)
  const shootout = wasShootout(match)

  return (
    <div className={`${styles.matchRow} ${highlight ? styles.highlight : ''}`}>
      <div className={styles.matchMeta}>
        <span>{match.group ?? match.round}</span>
        <span>{formatKickoff(match)}</span>
      </div>
      <div className={styles.matchTeams}>
        <MatchSide team={match.team1} side="left" isWinner={side === 1} owners={owners} />
        {played ? (
          <span className={styles.matchScore}>
            {g1}&ndash;{g2}
            {shootout && <span className={styles.pensTag}> ({match.score!.p![0]}&ndash;{match.score!.p![1]} pens)</span>}
          </span>
        ) : (
          <span className={`${styles.matchScore} ${styles.vs}`}>vs</span>
        )}
        <MatchSide team={match.team2} side="right" isWinner={side === 2} owners={owners} />
      </div>
      {match.ground && <div className={styles.matchVenue}>📍 {match.ground}</div>}
    </div>
  )
}
