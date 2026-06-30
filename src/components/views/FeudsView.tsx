import type { Defeat, Feuds, SpoonTally } from '../../lib/feuds'
import styles from '../../styles/app.module.css'

function shortDate(date: string): string {
  const d = new Date(`${date}T00:00:00Z`)
  return Number.isNaN(d.getTime())
    ? date
    : new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', timeZone: 'UTC' }).format(d)
}

interface Row {
  member: string
  kills: Defeat[]
  defeats: Defeat[]
  spoons: number
  deadTeams: string[]
}

function whenLabel(d: Defeat): string {
  return `${d.group ?? d.round} · ${shortDate(d.date)}`
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
  // Merge kills, defeats and spoons into one row per member.
  const rows = new Map<string, Row>()
  const ensure = (member: string): Row => {
    let r = rows.get(member)
    if (!r) {
      r = { member, kills: [], defeats: [], spoons: 0, deadTeams: [] }
      rows.set(member, r)
    }
    return r
  }
  for (const rec of feuds.records) {
    const r = ensure(rec.member)
    r.kills = rec.wins
    r.defeats = rec.losses
  }
  for (const s of spoons) {
    const r = ensure(s.member)
    r.spoons = s.count
    r.deadTeams = s.deadTeams
  }

  const list = [...rows.values()].sort(
    (a, b) =>
      b.kills.length - a.kills.length ||
      b.defeats.length - a.defeats.length ||
      b.spoons - a.spoons ||
      a.member.localeCompare(b.member),
  )

  const maxKills = Math.max(0, ...list.map((r) => r.kills.length))
  const ruthlessUnique = maxKills > 0 && list.filter((r) => r.kills.length === maxKills).length === 1
  const maxSpoons = Math.max(0, ...list.map((r) => r.spoons))

  return (
    <section>
      <h2 className={styles.sectionTitle}>⚔️ Body count</h2>
      <p className={styles.muted} style={{ marginTop: 0, fontSize: '0.85rem' }}>
        Ranked by kills. A <strong>kill</strong> is beating another family member&apos;s team in a
        real match — credited to whoever owned the team <em>that day</em>, so re-picks are fair
        (draws don&apos;t count). 🥄 <strong>Wooden spoons</strong> are your knocked-out teams; the
        most spoons is the biggest loser.
      </p>

      {list.length === 0 ? (
        <p className={styles.muted}>No clashes or spoons yet — it&apos;s early.</p>
      ) : (
        <div className={styles.matchList}>
          {list.map((r) => {
            const ruthless = ruthlessUnique && r.kills.length === maxKills
            const spoonKing = maxSpoons > 0 && r.spoons === maxSpoons
            return (
              <div
                key={r.member}
                className={`${styles.card} ${r.member === claimedMember ? styles.mine : ''}`}
              >
                <div className={styles.feudHead}>
                  <span className={styles.feudName}>
                    {ruthless && '🔪 '}
                    {r.member}
                  </span>
                  <span className={styles.feudTally}>
                    <span className={styles.feudWins}>⚔️ {r.kills.length}</span>
                    <span className={styles.feudLosses}>💀 {r.defeats.length}</span>
                    {r.spoons > 0 && <span className={styles.feudSpoons}>🥄 {r.spoons}</span>}
                  </span>
                </div>

                {r.kills.length > 0 && (
                  <div className={styles.feudSection}>
                    <div className={styles.feudSub}>Kills</div>
                    <ul className={styles.feudLines}>
                      {r.kills.map((d, i) => (
                        <li key={i}>
                          beat <strong>{d.loserMember}</strong> · {d.winnerFlag} {d.winnerTeam}{' '}
                          {d.scoreWinner}–{d.scoreLoser} {d.loserTeam} {d.loserFlag}
                          <span className={styles.feudWhen}> · {whenLabel(d)}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {r.defeats.length > 0 && (
                  <div className={styles.feudSection}>
                    <div className={styles.feudSub}>Defeats</div>
                    <ul className={styles.feudLines}>
                      {r.defeats.map((d, i) => (
                        <li key={i}>
                          lost to <strong>{d.winnerMember}</strong> · {d.loserFlag} {d.loserTeam}{' '}
                          {d.scoreLoser}–{d.scoreWinner} {d.winnerTeam} {d.winnerFlag}
                          <span className={styles.feudWhen}> · {whenLabel(d)}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {r.spoons > 0 && (
                  <div className={styles.feudSection}>
                    <div className={styles.feudSub}>
                      🥄 Wooden spoons {spoonKing && <span className={styles.muted}>· biggest loser (so far)</span>}
                    </div>
                    <ul className={styles.feudLines}>
                      {r.deadTeams.map((t, i) => (
                        <li key={i}>{t} — knocked out</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}
