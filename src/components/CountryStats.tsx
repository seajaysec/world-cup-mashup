import { canonicalTeamName } from '../data/teams'
import { OWID_GENERATED, OWID_SOURCE, owidStatsFor } from '../data/owid'
import { useFavor } from './FavorContext'
import styles from '../styles/app.module.css'

/** Tiny inline SVG sparkline for the Elo trend. */
function Sparkline({ values }: { values: number[] }) {
  if (values.length < 2) return null
  const w = 64
  const h = 20
  const min = Math.min(...values)
  const max = Math.max(...values)
  const span = max - min || 1
  const pts = values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * w
      const y = h - ((v - min) / span) * h
      return `${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')
  const up = values[values.length - 1] >= values[0]
  return (
    <svg width={w} height={h} className={styles.sparkline} aria-hidden>
      <polyline
        points={pts}
        fill="none"
        stroke={up ? 'var(--color-alive)' : 'var(--color-out)'}
        strokeWidth="1.5"
      />
    </svg>
  )
}

function rankClass(rank: number, total: number): string {
  const pct = rank / total
  if (pct <= 1 / 3) return styles.rankGood
  if (pct >= 2 / 3) return styles.rankBad
  return styles.rankMid
}

/**
 * "Just for fun" card: where this team's country ranks in the world on a handful
 * of Our World in Data indicators, plus a SOCCER row driven by our live Elo.
 * Used on My Team and when previewing a replacement pick.
 */
export function CountryStats({ team, heading }: { team: string; heading?: string }) {
  const favor = useFavor()
  const canonical = canonicalTeamName(team)
  const soccer = favor(canonical)
  const rows = owidStatsFor(canonical)
  const isUK = canonical === 'England' || canonical === 'Scotland'

  return (
    <div className={styles.card}>
      <div className={styles.sectionTitle}>{heading ?? `Where ${team} ranks in the world`}</div>
      <p className={styles.muted} style={{ marginTop: 0, fontSize: '0.82rem' }}>
        Just for fun — global rank among all countries.
      </p>

      <ul className={styles.owidList}>
        {/* SOCCER — our live Elo model */}
        {soccer && (
          <li className={styles.owidRow}>
            <span className={styles.owidTitle}>⚽ Soccer (Elo)</span>
            <span className={styles.owidTrend}>
              <Sparkline values={soccer.history} />
              <span className={styles.owidValue}>
                {Math.round(soccer.rating)}
                <span className={styles.owidDelta}>
                  {soccer.history.length > 1 &&
                    ` ${soccer.rating >= soccer.history[0] ? '▲' : '▼'}${Math.abs(
                      Math.round(soccer.rating - soccer.history[0]),
                    )}`}
                </span>
              </span>
            </span>
            <span className={`${styles.owidRank} ${rankClass(soccer.eloRank, soccer.eloTotal)}`}>
              #{soccer.eloRank}<span className={styles.owidTotal}>/{soccer.eloTotal}</span>
            </span>
          </li>
        )}

        {rows.map(({ metric, stat }) => (
          <li className={styles.owidRow} key={metric.key}>
            <a className={styles.owidTitle} href={metric.page} target="_blank" rel="noreferrer" title={metric.note}>
              {metric.title}
            </a>
            {stat ? (
              <>
                <span className={styles.owidValue}>{stat.display}</span>
                <span className={`${styles.owidRank} ${rankClass(stat.rank, stat.total)}`}>
                  #{stat.rank}
                  <span className={styles.owidTotal}>/{stat.total}</span>
                </span>
              </>
            ) : (
              <>
                <span className={styles.owidValue}>—</span>
                <span className={styles.owidRankNone}>no data</span>
              </>
            )}
          </li>
        ))}
      </ul>

      <p className={styles.owidSource}>
        {isUK && 'England & Scotland use the UK’s figures. '}
        Soccer is our live Elo. Other metrics:{' '}
        <a href="https://ourworldindata.org" target="_blank" rel="noreferrer">
          {OWID_SOURCE}
        </a>{' '}
        (each label links to its chart) · data baked {OWID_GENERATED.slice(0, 10)}.
      </p>
    </div>
  )
}
