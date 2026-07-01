import { useState } from 'react'
import { ROSTER } from '../data/roster'
import { canonicalTeamName, getTeamMeta, TEAMS } from '../data/teams'
import { OWID_GENERATED, OWID_SOURCE, OWID_METRICS, leaderboardAmong, owidValue, rankAmong } from '../data/owid'
import { useFavor } from './FavorContext'
import styles from '../styles/app.module.css'

/** [winner, loser] emoji per category — flavour for top and bottom of the board. */
const EMOJI: Record<string, [string, string]> = {
  soccer: ['🥇', '🥶'],
  democracy: ['🗽', '🙈'],
  gdp: ['🤑', '🪙'],
  life: ['🧓', '⏳'],
  happiness: ['😄', '😩'],
  gender: ['⚖️', '🙅'],
  co2: ['🌱', '🏭'],
  debt: ['🏦', '💸'],
  military: ['🪖', '🕊️'],
  population: ['🐘', '🐜'],
}

const WC_NAMES = TEAMS.map((t) => t.name)
const FAMILY = ROSTER.filter((r) => !r.joke).map((r) => ({
  team: canonicalTeamName(r.team),
  member: r.member,
}))
const FAMILY_NAMES = FAMILY.map((f) => f.team)
const MEMBER_BY_TEAM = new Map(FAMILY.map((f) => [f.team, f.member]))

function rankClass(rank: number, total: number): string {
  const pct = rank / total
  if (pct <= 1 / 3) return styles.rankGood
  if (pct >= 2 / 3) return styles.rankBad
  return styles.rankMid
}

/** Sparkline for the Elo trend. */
function Sparkline({ values }: { values: number[] }) {
  if (values.length < 2) return null
  const w = 60
  const h = 18
  const min = Math.min(...values)
  const max = Math.max(...values)
  const span = max - min || 1
  const pts = values.map((v, i) => `${((i / (values.length - 1)) * w).toFixed(1)},${(h - ((v - min) / span) * h).toFixed(1)}`).join(' ')
  return (
    <svg width={w} height={h} className={styles.sparkline} aria-hidden>
      <polyline points={pts} fill="none" stroke={values[values.length - 1] >= values[0] ? 'var(--color-alive)' : 'var(--color-out)'} strokeWidth="1.5" />
    </svg>
  )
}

/** The family leaderboard revealed when a metric row is tapped. */
function FamilyBoard({
  rows,
  emoji,
  highlight,
}: {
  rows: { team: string; display: string }[]
  emoji: [string, string]
  highlight: string
}) {
  return (
    <ol className={styles.famBoard}>
      {rows.map((row, i) => {
        const member = MEMBER_BY_TEAM.get(row.team)
        const mark = i === 0 ? emoji[0] : i === rows.length - 1 ? emoji[1] : ''
        return (
          <li key={row.team} className={`${styles.famRow} ${row.team === highlight ? styles.famMine : ''}`}>
            <span className={styles.famRank}>{mark || i + 1}</span>
            <span aria-hidden>{getTeamMeta(row.team)?.flag ?? '🏳️'}</span>
            <span className={styles.famWho}>
              <strong>{member}</strong> · {row.team}
            </span>
            <span className={styles.famValue}>{row.display}</span>
          </li>
        )
      })}
    </ol>
  )
}

export function CountryStats({ team, heading }: { team: string; heading?: string }) {
  const favor = useFavor()
  const canonical = canonicalTeamName(team)
  const soccer = favor(canonical)
  const [open, setOpen] = useState<string | null>(null)
  const toggle = (key: string) => setOpen((o) => (o === key ? null : key))

  // Soccer family board (by live Elo).
  const soccerBoard = FAMILY_NAMES.map((t) => ({ team: t, rating: favor(t)?.rating ?? 0 }))
    .sort((a, b) => b.rating - a.rating)
    .map((r) => ({ team: r.team, display: String(Math.round(r.rating)) }))

  return (
    <div className={styles.card}>
      <div className={styles.sectionTitle}>{heading ?? `Where ${team} ranks among World Cup teams`}</div>
      <p className={styles.muted} style={{ marginTop: 0, fontSize: '0.82rem' }}>
        A separate competition: rank is among the World Cup teams that have data for each metric — so
        the field size (e.g. /48, /47, /40) varies, since the sources don&apos;t cover every nation.
        Tap a row for the family leaderboard.
      </p>

      <ul className={styles.owidList}>
        {/* SOCCER — live Elo */}
        {soccer && (
          <li>
            <button type="button" className={styles.owidRow} onClick={() => toggle('soccer')}>
              <span className={styles.owidTitle}>
                <span className={styles.owidChevron} aria-hidden>{open === 'soccer' ? '▾' : '▸'}</span>
                ⚽ Soccer (Elo)
              </span>
              <span className={styles.owidTrend}>
                <Sparkline values={soccer.history} />
                <span className={styles.owidValue}>{Math.round(soccer.rating)}</span>
              </span>
              <span className={`${styles.owidRank} ${rankClass(soccer.eloRank, soccer.eloTotal)}`}>
                #{soccer.eloRank}<span className={styles.owidTotal}>/{soccer.eloTotal}</span>
              </span>
            </button>
            {open === 'soccer' && (
              <FamilyBoard rows={soccerBoard} emoji={EMOJI.soccer} highlight={canonical} />
            )}
          </li>
        )}

        {OWID_METRICS.map((metric) => {
          const value = owidValue(metric.key, canonical)
          const wc = rankAmong(metric.key, canonical, WC_NAMES)
          const isOpen = open === metric.key
          const famRows = isOpen ? leaderboardAmong(metric.key, FAMILY_NAMES) : []
          return (
            <li key={metric.key}>
              <button type="button" className={styles.owidRow} onClick={() => toggle(metric.key)} title={metric.note}>
                <span className={styles.owidTitle}>
                  <span className={styles.owidChevron} aria-hidden>{isOpen ? '▾' : '▸'}</span>
                  {metric.title}
                </span>
                {value ? (
                  <>
                    <span className={styles.owidValue}>{value.display}</span>
                    <span className={`${styles.owidRank} ${wc ? rankClass(wc.rank, wc.total) : ''}`}>
                      {wc ? <>#{wc.rank}<span className={styles.owidTotal}>/{wc.total}</span></> : '—'}
                    </span>
                  </>
                ) : (
                  <>
                    <span className={styles.owidValue}>—</span>
                    <span className={styles.owidRankNone}>no data</span>
                  </>
                )}
              </button>
              {isOpen && (
                <>
                  <FamilyBoard rows={famRows} emoji={EMOJI[metric.key] ?? ['🥇', '🥄']} highlight={canonical} />
                  <p className={styles.famNote}>
                    {metric.note}{' '}
                    <a href={metric.page} target="_blank" rel="noreferrer">source ↗</a>
                  </p>
                </>
              )}
            </li>
          )
        })}
      </ul>

      <p className={styles.owidSource}>
        Soccer is our live Elo. Other metrics:{' '}
        <a href="https://ourworldindata.org" target="_blank" rel="noreferrer">{OWID_SOURCE}</a> · data
        baked {OWID_GENERATED.slice(0, 10)}.
      </p>
    </div>
  )
}
