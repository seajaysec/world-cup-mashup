import type { Status, Tier } from '../types'
import { TIER_LABELS } from '../data/teams'
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

export function TierBadge({ tier }: { tier: Tier }) {
  return (
    <span className={`${styles.badge} ${styles.tier} ${TIER_CLASS[tier]}`} title="Pre-tournament favoredness">
      {TIER_LABELS[tier]}
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
