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
  beatenBy: Defeat[]
  knockouts: number
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
      r = { member, kills: [], beatenBy: [], knockouts: 0, deadTeams: [] }
      rows.set(member, r)
    }
    return r
  }
  for (const rec of feuds.records) {
    const r = ensure(rec.member)
    r.kills = rec.wins
    r.beatenBy = rec.losses
  }
  for (const s of spoons) {
    const r = ensure(s.member)
    r.knockouts = s.count
    r.deadTeams = s.deadTeams
  }

  // Ranked by kills (desc). Getting knocked out drags you down; head-to-head
  // losses are the final nudge.
  const list = [...rows.values()].sort(
    (a, b) =>
      b.kills.length - a.kills.length ||
      a.knockouts - b.knockouts ||
      a.beatenBy.length - b.beatenBy.length ||
      a.member.localeCompare(b.member),
  )

  const maxKills = Math.max(0, ...list.map((r) => r.kills.length))
  const ruthlessUnique = maxKills > 0 && list.filter((r) => r.kills.length === maxKills).length === 1
  const maxKo = Math.max(0, ...list.map((r) => r.knockouts))
  const loserUnique = maxKo > 0 && list.filter((r) => r.knockouts === maxKo).length === 1

  return (
    <section>
      <h2 className={styles.sectionTitle}>⚔️ Body count</h2>
      <p className={styles.muted} style={{ marginTop: 0, fontSize: '0.85rem' }}>
        ⚔️ A <strong>kill</strong> is your team beating another family member&apos;s team — credited
        to whoever owned it <em>that day</em>, so re-picks are fair (a penalty-shootout win counts).
        💀 A <strong>knock-out</strong> is one of your teams going out, by anyone — that&apos;s your
        loss in the pick&apos;em. Most knock-outs is the 🥄 biggest loser.
      </p>

      {list.length === 0 ? (
        <p className={styles.muted}>Nothing yet — it&apos;s early.</p>
      ) : (
        <div className={styles.matchList}>
          {list.map((r) => {
            const ruthless = ruthlessUnique && r.kills.length === maxKills
            const biggestLoser = loserUnique && r.knockouts === maxKo
            return (
              <div
                key={r.member}
                className={`${styles.card} ${r.member === claimedMember ? styles.mine : ''}`}
              >
                <div className={styles.feudHead}>
                  <span className={styles.feudName}>
                    {ruthless && '🔪 '}
                    {biggestLoser && '🥄 '}
                    {r.member}
                  </span>
                  <span className={styles.feudTally}>
                    <span className={styles.feudWins}>⚔️ {r.kills.length}</span>
                    <span className={styles.feudLosses}>💀 {r.knockouts}</span>
                  </span>
                </div>

                {r.kills.length > 0 && (
                  <div className={styles.feudSection}>
                    <div className={styles.feudSub}>⚔️ Kills</div>
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

                {r.knockouts > 0 && (
                  <div className={styles.feudSection}>
                    <div className={styles.feudSub}>
                      💀 Knocked out{' '}
                      {biggestLoser && <span className={styles.muted}>· 🥄 biggest loser (so far)</span>}
                    </div>
                    <ul className={styles.feudLines}>
                      {r.deadTeams.map((d, i) => (
                        <li key={i}>{deadLine(d)}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {r.beatenBy.length > 0 && (
                  <div className={styles.feudSection}>
                    <div className={styles.feudSub}>Head-to-head losses (bragging rights)</div>
                    <ul className={styles.feudLines}>
                      {r.beatenBy.map((d, i) => (
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
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}
