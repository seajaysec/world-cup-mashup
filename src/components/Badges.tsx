import type { Status, Tier } from '../types'
import { formatOdds, getTeamMeta, TIER_LABELS } from '../data/teams'
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

/** Tier label, optionally with the quantified odds, e.g. "Favorite · 14%". */
export function TierBadge({ tier, odds }: { tier: Tier; odds?: number }) {
  const title = odds != null ? `${TIER_LABELS[tier]} — ${formatOdds(odds)} to win it all` : 'Pre-tournament favoredness'
  return (
    <span className={`${styles.badge} ${styles.tier} ${TIER_CLASS[tier]}`} title={title}>
      {TIER_LABELS[tier]}
      {odds != null && <span className={styles.tierOdds}> · {formatOdds(odds)}</span>}
    </span>
  )
}

/**
 * Compact favoredness mark for dense rows (schedule, bracket): just the odds %,
 * coloured by tier. Renders nothing for unknown/placeholder teams.
 */
export function FavorMark({ team }: { team: string }) {
  const meta = getTeamMeta(team)
  if (!meta) return null
  return (
    <span
      className={`${styles.favorMark} ${TIER_CLASS[meta.tier]}`}
      title={`${TIER_LABELS[meta.tier]} — ${formatOdds(meta.odds)} to win it all`}
    >
      {formatOdds(meta.odds)}
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
