import type { Status, Tier } from '../types'
import { formatOdds, TIER_LABELS } from '../data/teams'
import { useFavor } from './FavorContext'
import styles from '../styles/app.module.css'

const STATUS_TEXT: Record<Status, string> = {
  alive: 'Still in it',
  out: 'Knocked out',
  champion: 'Champions',
  notCompeting: 'Just for fun',
}

const STATUS_CLASS: Record<Status, string> = {
  alive: styles.statusAlive,
  out: styles.statusOut,
  champion: styles.statusChampion,
  notCompeting: styles.statusNeutral,
}

export function StatusBadge({ status }: { status: Status }) {
  return <span className={`${styles.badge} ${STATUS_CLASS[status]}`}>{STATUS_TEXT[status]}</span>
}

const TIER_CLASS: Record<Tier, string> = {
  favorite: styles.tierFavorite,
  contender: styles.tierContender,
  darkhorse: styles.tierDarkhorse,
  longshot: styles.tierLongshot,
}

/**
 * Tier label with the quantified title-win odds, e.g. "Favorite · 🏆 14%".
 * The 🏆 makes clear this is the chance to win the whole tournament — not a match.
 */
export function TierBadge({ tier, odds }: { tier: Tier; odds?: number }) {
  const title =
    odds != null
      ? `${TIER_LABELS[tier]} — ${formatOdds(odds)} chance to win the tournament`
      : 'Favoredness to win the tournament'
  return (
    <span className={`${styles.badge} ${styles.tier} ${TIER_CLASS[tier]}`} title={title}>
      {TIER_LABELS[tier]}
      {odds != null && <span className={styles.tierOdds}> · 🏆 {formatOdds(odds)}</span>}
    </span>
  )
}

/**
 * Compact, LIVE favoredness mark for dense rows (schedule, bracket): the current
 * title-win odds, coloured by tier, prefixed with 🏆 so it can't be mistaken for
 * match odds. Renders nothing for placeholder/eliminated teams (0%).
 */
export function FavorMark({ team }: { team: string }) {
  const favor = useFavor()
  const info = favor(team)
  if (!info || info.odds <= 0) return null
  return (
    <span
      className={`${styles.favorMark} ${TIER_CLASS[info.tier]}`}
      title={`${formatOdds(info.odds)} chance to win the tournament (pre-tournament ${formatOdds(info.priorOdds)})`}
    >
      🏆 {formatOdds(info.odds)}
    </span>
  )
}

/** Shows which family member owns a team. Render nothing for unowned teams. */
export function OwnerChip({ member, flag }: { member: string; flag?: string }) {
  return (
    <span className={styles.ownerChip} title={`${member}'s pick`}>
      <span aria-hidden>{flag ?? '👤'}</span>
      {member}
    </span>
  )
}

/** Marks a team nobody in the family picked — the counterpart to OwnerChip, so
 * every team mention is unambiguous (owned by someone, or explicitly unclaimed). */
export function UnclaimedTag() {
  return (
    <span className={styles.unclaimedTag} title="No family member picked this team">
      unclaimed
    </span>
  )
}
