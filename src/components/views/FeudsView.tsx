import type { Feuds, SpoonTally } from '../../lib/feuds'
import styles from '../../styles/app.module.css'

function shortDate(date: string): string {
  const d = new Date(`${date}T00:00:00Z`)
  return Number.isNaN(d.getTime())
    ? date
    : new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', timeZone: 'UTC' }).format(d)
}

export function FeudsView({
  feuds,
  spoons,
  claimedMember,
}: {
  feuds: Feuds
  spoons: SpoonTally[]
  claimedMember: string | null
}) {
  const { feed, records } = feuds
  const topWins = records[0]?.wins.length ?? 0
  const uniqueLeader = topWins > 0 && records.filter((r) => r.wins.length === topWins).length === 1

  return (
    <section>
      <h2 className={styles.sectionTitle}>⚔️ Body count — family feuds</h2>
      <p className={styles.muted} style={{ marginTop: 0, fontSize: '0.85rem' }}>
        When your team beats another family member&apos;s team, that&apos;s a kill. Each result is
        credited to whoever owned the team <em>that day</em>, so re-picks are handled fairly. Draws
        don&apos;t count.
      </p>

      {records.length === 0 ? (
        <p className={styles.muted}>No family-vs-family clashes yet — but they&apos;re coming.</p>
      ) : (
        <ul className={styles.matchList} style={{ listStyle: 'none', margin: 0, padding: 0 }}>
          {records.map((r) => {
            const ruthless = uniqueLeader && r.wins.length === topWins
            return (
              <li
                className={`${styles.tallyRow} ${r.member === claimedMember ? styles.mine : ''}`}
                key={r.member}
              >
                <span className={styles.lbWho}>
                  <div className={styles.lbMember}>
                    {ruthless && '🔪 '}
                    {r.member}
                  </div>
                  <div className={styles.lbStat}>
                    {ruthless ? 'Most ruthless in the family' : 'Family head-to-head'}
                  </div>
                </span>
                <span className={styles.feudTally}>
                  <span className={styles.feudWins}>⚔️ {r.wins.length}</span>
                  <span className={styles.feudLosses}>💀 {r.losses.length}</span>
                </span>
              </li>
            )
          })}
        </ul>
      )}

      {feed.length > 0 && (
        <>
          <h2 className={styles.sectionTitle}>Kill feed</h2>
          <ul className={styles.killFeed}>
            {[...feed].reverse().map((d, i) => (
              <li key={i} className={`${styles.killRow} ${d.winnerMember === claimedMember || d.loserMember === claimedMember ? styles.mine : ''}`}>
                <div className={styles.killLine}>
                  <strong>{d.winnerMember}</strong> <span aria-hidden>{d.winnerFlag}</span>{' '}
                  {d.winnerTeam} <span className={styles.killBeat}>beat</span>{' '}
                  <strong>{d.loserMember}</strong> <span aria-hidden>{d.loserFlag}</span>{' '}
                  {d.loserTeam}{' '}
                  <span className={styles.killScore}>
                    {d.scoreWinner}–{d.scoreLoser}
                  </span>
                </div>
                <div className={styles.killMeta}>
                  {d.group ?? d.round} · {shortDate(d.date)}
                </div>
              </li>
            ))}
          </ul>
        </>
      )}

      <h2 className={styles.sectionTitle}>🥄 Wooden-spoon race</h2>
      <p className={styles.muted} style={{ marginTop: 0, fontSize: '0.85rem' }}>
        Spoons rack up: every team you&apos;ve owned that got knocked out is one spoon. Most spoons
        is the biggest loser — and <strong>wins that prize</strong>.
      </p>
      {spoons.length === 0 ? (
        <p className={styles.muted}>No spoons yet — everyone&apos;s team is still alive.</p>
      ) : (
        <ul className={styles.matchList} style={{ listStyle: 'none', margin: 0, padding: 0 }}>
          {spoons.map((s) => (
            <li
              className={`${styles.tallyRow} ${s.member === claimedMember ? styles.mine : ''} ${s.isLeader ? styles.spoon : ''}`}
              key={s.member}
            >
              <span className={styles.lbWho}>
                <div className={styles.lbMember}>
                  {s.isLeader && '🥄 '}
                  {s.member}
                  {s.isLeader && <span className={styles.muted}> — biggest loser (so far)</span>}
                </div>
                <div className={styles.lbStat}>Out: {s.deadTeams.join(', ')}</div>
              </span>
              <span className={styles.spoonCount}>🥄 × {s.count}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
