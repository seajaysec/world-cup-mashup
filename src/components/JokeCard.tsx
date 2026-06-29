import type { JokeProgress } from '../lib/joke'
import { TierBadge } from './Badges'
import styles from '../styles/app.module.css'

const RESULT_CLASS: Record<'W' | 'D' | 'L', string> = {
  W: styles.formWin,
  D: styles.formDraw,
  L: styles.formLoss,
}

/** A playful card for the for-fun picks — their own evolving silly season. */
export function JokeCard({ joke, member }: { joke: JokeProgress; member: string }) {
  const { record } = joke
  const stats: [string, string | number][] = [
    ['Pts', record.points],
    ['W-D-L', `${record.won}-${record.drawn}-${record.lost}`],
    ['For', record.for],
    ['Diff', record.for - record.against > 0 ? `+${record.for - record.against}` : record.for - record.against],
  ]

  return (
    <>
      <div className={`${styles.card} ${styles.heroCard} ${styles.jokeCard}`}>
        <div className={styles.heroTop}>
          <span className={styles.heroFlag} aria-hidden>
            {joke.emoji}
          </span>
          <div className={styles.heroNames}>
            <span className={styles.heroTeam}>{joke.team}</span>
            <span className={styles.heroMember}>{member}&apos;s pick</span>
          </div>
        </div>
        <div className={styles.heroBadges}>
          <span className={`${styles.badge} ${styles.statusSparkle}`}>✨ Exhibition side</span>
          <TierBadge tier={joke.tier} />
        </div>
        <p className={styles.muted}>{joke.standingLabel}</p>
        <p className={styles.jokeBlurb}>{joke.blurb}</p>
      </div>

      <div className={styles.card}>
        <div className={styles.sectionTitle}>If they were really in it…</div>
        <div className={styles.nextOpponent}>🔮 {joke.projection}</div>
        {joke.pedigree && <p className={styles.muted}>{joke.pedigree}</p>}
      </div>

      <div className={styles.card}>
        <div className={styles.sectionTitle}>{joke.league}</div>
        <div className={styles.statGrid}>
          {stats.map(([label, value]) => (
            <div className={styles.stat} key={label}>
              <div className={styles.statValue}>{value}</div>
              <div className={styles.statLabel}>{label}</div>
            </div>
          ))}
        </div>
        {joke.form && (
          <div className={styles.formRow}>
            <span className={styles.statLabel}>Form</span>
            <span className={styles.formDots}>
              {joke.recent.map((m, i) => (
                <span key={i} className={`${styles.formDot} ${RESULT_CLASS[m.result]}`} title={`${m.scoreFor}-${m.scoreAgainst} vs ${m.opponent}`}>
                  {m.result}
                </span>
              ))}
            </span>
          </div>
        )}
      </div>

      {joke.next && (
        <div className={styles.card}>
          <div className={styles.sectionTitle}>Next fixture</div>
          <div className={styles.nextOpponent}>vs {joke.next.opponent}</div>
          <div className={styles.nextMeta}>🗓️ {joke.next.date}</div>
        </div>
      )}

      {joke.recent.length > 0 && (
        <div className={styles.card}>
          <div className={styles.sectionTitle}>Recent results</div>
          <ul className={styles.jokeResults}>
            {[...joke.recent].reverse().map((m, i) => (
              <li key={i}>
                <span className={`${styles.formDot} ${RESULT_CLASS[m.result]}`}>{m.result}</span>
                <span className={styles.jokeScore}>
                  {m.scoreFor}&ndash;{m.scoreAgainst}
                </span>
                <span className={styles.muted}>vs {m.opponent}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  )
}
