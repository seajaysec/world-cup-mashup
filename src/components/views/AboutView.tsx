import { TIER_LABELS, TIER_RANGE_LABELS } from '../../data/teams'
import { OWID_GENERATED } from '../../data/owid'
import styles from '../../styles/app.module.css'

const TIERS = ['favorite', 'contender', 'darkhorse', 'longshot'] as const

/** Plain-language explainer for how every number in the app is worked out. */
export function AboutView({ onBack }: { onBack: () => void }) {
  return (
    <section className={styles.about}>
      <button type="button" className={styles.linkButton} onClick={onBack}>
        ← Back
      </button>
      <h1 className={styles.aboutTitle}>How it works</h1>

      <h2 className={styles.sectionTitle}>The one percentage: 🏆 title odds</h2>
      <p>
        There is only <strong>one</strong> percentage in this app, and it always means the same
        thing: a team&apos;s <strong>live chance to win the whole tournament</strong>. It is{' '}
        <em>not</em> the chance of winning a particular match. Wherever you see 🏆 followed by a %,
        that&apos;s it.
      </p>
      <p>It&apos;s computed like this:</p>
      <ol className={styles.aboutList}>
        <li>
          <strong>A starting strength.</strong> Each team begins with an Elo rating seeded from a
          curated pre-tournament guess at how good they are.
        </li>
        <li>
          <strong>Updated after every played match.</strong> Win and you gain rating, lose and you
          drop it. The swing is bigger when you beat a <em>stronger</em> opponent and when you win
          by a larger goal margin (standard “World Football Elo”).
        </li>
        <li>
          <strong>Turned into title odds.</strong> Among the teams still alive, the current ratings
          are run through a softmax so the strongest get the largest share. Eliminated teams are 0%;
          a crowned champion is 100%. The live odds across all teams add up to ~100%.
        </li>
      </ol>
      <p className={styles.muted}>
        Because they share one pool, when a team is knocked out its odds flow to everyone still in —
        so the numbers drift over the tournament. The inputs are results, goals, and opponent
        strength; the data feed has no save or possession stats, so those aren&apos;t modelled.
      </p>

      <h2 className={styles.sectionTitle}>Favoredness tiers</h2>
      <p>The tier label is just a band of that same title-odds number:</p>
      <ul className={styles.aboutList}>
        {TIERS.map((t) => (
          <li key={t}>
            <strong>{TIER_LABELS[t]}</strong> — {TIER_RANGE_LABELS[t]} chance to win it all
          </li>
        ))}
      </ul>

      <h2 className={styles.sectionTitle}>The leaderboard &amp; prizes</h2>
      <p>
        Picks are ranked by how far their team has gone (Champion → Runner-up → 3rd → 4th →
        quarter-finals → Round of 16 → Round of 32 → out in the group stage). Teams still alive sit
        above teams out at the same stage. Ties break on group-stage <strong>points</strong>, then{' '}
        <strong>goal difference</strong>, then <strong>goals scored</strong>.
      </p>
      <ul className={styles.aboutList}>
        <li>👑 The pick at the very top is on track to <strong>win it all</strong>.</li>
        <li>
          🥄 The lowest real team is the <strong>wooden spoon</strong> — it loses the whole thing.
          Only one team holds it at a time, and it moves as teams are knocked out.
        </li>
      </ul>
      <p className={styles.muted}>
        Note: leaderboard rank (how far you&apos;ve gone) and 🏆 title odds (how likely you are to
        win) are different — a team a round ahead can still be less likely to lift the trophy than a
        stronger team behind it.
      </p>

      <h2 className={styles.sectionTitle}>The for-fun picks</h2>
      <p>
        La Galaxy 🌌 and the Denver Nuggets 🏀 aren&apos;t in the World Cup, so they play their own
        silly parallel season whose scorelines are derived from the real tournament&apos;s daily
        goal output. Their tier and “if they were really in it” projection reflect their real-world
        pedigree (MLS and NBA champions). They sit out of the actual prize race.
      </p>

      <h2 className={styles.sectionTitle}>The country rankings (just for fun)</h2>
      <p>
        On the My Team page, each team&apos;s country is ranked against every country in the world on
        nine indicators from{' '}
        <a href="https://ourworldindata.org" target="_blank" rel="noreferrer">
          Our World in Data
        </a>{' '}
        (democracy, GDP per capita, life expectancy, happiness, gender equality, CO₂ per capita,
        public debt, military spending, population) plus a SOCCER row driven by our live Elo. Each
        label links to its source chart. England and Scotland use the UK&apos;s figures; some small
        nations have no data for every metric. Data baked {OWID_GENERATED.slice(0, 10)}.
      </p>

      <h2 className={styles.sectionTitle}>Data &amp; updates</h2>
      <p>
        Match data comes from the public-domain{' '}
        <a
          href="https://github.com/openfootball/worldcup.json"
          target="_blank"
          rel="noreferrer"
        >
          openfootball/worldcup.json
        </a>{' '}
        feed and is fetched live in your browser, refreshing <strong>about once an hour</strong> (and
        whenever you return to the tab) so an open page doesn&apos;t go stale. If the live fetch
        fails it falls back to the last copy it saw, then to a snapshot bundled with the app.
        Knockout brackets are resolved from match results, so “Winner of match 78” is shown honestly
        as the two teams it&apos;s waiting on rather than a guess.
      </p>

      <button type="button" className={styles.linkButton} onClick={onBack}>
        ← Back
      </button>
    </section>
  )
}
