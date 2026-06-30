import type { DeadTeam, Defeat, Feuds, SpoonTally } from '../../lib/feuds'
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
  deadTeams: DeadTeam[]
}

function ScoreLine({
  leftFlag,
  leftTeam,
  scoreLeft,
  scoreRight,
  rightTeam,
  rightFlag,
  pens,
}: {
  leftFlag: string
  leftTeam: string
  scoreLeft: number
  scoreRight: number
  rightTeam: string
  rightFlag: string
  pens: boolean
}) {
  return (
    <span className={styles.scoreLine}>
      {leftFlag} {leftTeam} <span className={styles.scoreChip}>{scoreLeft}–{scoreRight}</span>{' '}
      {rightTeam} {rightFlag}
      {pens && <span className={styles.pensTag}> (pens)</span>}
    </span>
  )
}

function deadLine(d: DeadTeam): string {
  if (!d.exit) return `${d.team} — didn’t make it out of the group stage`
  const e = d.exit
  const pens = e.pens ? ' on pens' : ''
  return `${d.team} — knocked out by ${e.opponentFlag} ${e.opponent} (${e.round}, ${e.scoreFor}–${e.scoreAgainst}${pens}) · ${shortDate(e.date)}`
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

  // Sort by kills (desc); defeats and spoons drag you down (asc); then name.
  const list = [...rows.values()].sort(
    (a, b) =>
      b.kills.length - a.kills.length ||
      a.defeats.length - b.defeats.length ||
      a.spoons - b.spoons ||
      a.member.localeCompare(b.member),
  )

  const maxKills = Math.max(0, ...list.map((r) => r.kills.length))
  const ruthlessUnique = maxKills > 0 && list.filter((r) => r.kills.length === maxKills).length === 1
  const maxSpoons = Math.max(0, ...list.map((r) => r.spoons))
  const loserUnique = maxSpoons > 0 && list.filter((r) => r.spoons === maxSpoons).length === 1

  return (
    <section>
      <h2 className={styles.sectionTitle}>⚔️ Body count</h2>
      <p className={styles.muted} style={{ marginTop: 0, fontSize: '0.85rem' }}>
        Ranked by kills (defeats and spoons drag you down). A <strong>kill</strong> is beating
        another family member&apos;s team in a real match — credited to whoever owned the team{' '}
        <em>that day</em>, so re-picks are fair (a penalty-shootout win counts; a true draw
        doesn&apos;t). 🥄 <strong>Wooden spoons</strong> are your knocked-out teams; the most is the
        biggest loser.
      </p>

      {list.length === 0 ? (
        <p className={styles.muted}>No clashes or spoons yet — it&apos;s early.</p>
      ) : (
        <div className={styles.matchList}>
          {list.map((r) => {
            const ruthless = ruthlessUnique && r.kills.length === maxKills
            const biggestLoser = loserUnique && r.spoons === maxSpoons
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
                          beat <strong>{d.loserMember}</strong> ·{' '}
                          <ScoreLine
                            leftFlag={d.winnerFlag}
                            leftTeam={d.winnerTeam}
                            scoreLeft={d.scoreWinner}
                            scoreRight={d.scoreLoser}
                            rightTeam={d.loserTeam}
                            rightFlag={d.loserFlag}
                            pens={d.pens}
                          />
                          <span className={styles.feudWhen}> · {d.group ?? d.round} · {shortDate(d.date)}</span>
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
                          lost to <strong>{d.winnerMember}</strong> ·{' '}
                          <ScoreLine
                            leftFlag={d.loserFlag}
                            leftTeam={d.loserTeam}
                            scoreLeft={d.scoreLoser}
                            scoreRight={d.scoreWinner}
                            rightTeam={d.winnerTeam}
                            rightFlag={d.winnerFlag}
                            pens={d.pens}
                          />
                          <span className={styles.feudWhen}> · {d.group ?? d.round} · {shortDate(d.date)}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {r.spoons > 0 && (
                  <div className={styles.feudSection}>
                    <div className={styles.feudSub}>
                      🥄 Wooden spoons{' '}
                      {biggestLoser && <span className={styles.muted}>· biggest loser (so far)</span>}
                    </div>
                    <ul className={styles.feudLines}>
                      {r.deadTeams.map((d, i) => (
                        <li key={i}>{deadLine(d)}</li>
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
