import { useEffect, useMemo, useState } from 'react'
import { canonicalTeamName } from './data/teams'
import { loadFeed, type LoadedFeed } from './lib/feed'
import { derive, rosterByMember } from './lib/derive'
import {
  clearClaimedMember,
  getClaimedMember,
  setClaimedMember as persistClaim,
} from './lib/format'
import { Tabs, type TabKey } from './components/Tabs'
import { ClaimPicker } from './components/ClaimPicker'
import { MyTeamView } from './components/views/MyTeamView'
import { LeaderboardView } from './components/views/LeaderboardView'
import { BracketView } from './components/views/BracketView'
import { RosterView } from './components/views/RosterView'
import { ScheduleView } from './components/views/ScheduleView'
import styles from './styles/app.module.css'

function feedNote(loaded: LoadedFeed): string {
  switch (loaded.source) {
    case 'live':
      return `Live data · updated ${new Date(loaded.fetchedAt ?? Date.now()).toLocaleTimeString()}`
    case 'cache':
      return `Offline — showing cached data from ${new Date(loaded.fetchedAt ?? 0).toLocaleString()}`
    case 'snapshot':
      return 'Offline — showing the bundled snapshot, which may be out of date'
  }
}

export function App() {
  const [loaded, setLoaded] = useState<LoadedFeed | null>(null)
  const [failed, setFailed] = useState(false)
  const [tab, setTab] = useState<TabKey>('me')
  const [claimedMember, setClaim] = useState<string | null>(() => getClaimedMember())

  useEffect(() => {
    let active = true
    loadFeed()
      .then((result) => active && setLoaded(result))
      .catch(() => active && setFailed(true))
    return () => {
      active = false
    }
  }, [])

  // Capture "now" once per load so the joke seasons and schedule are stable for the render.
  const derived = useMemo(() => (loaded ? derive(loaded.feed.matches, new Date()) : null), [loaded])

  function claim(member: string) {
    persistClaim(member)
    setClaim(member)
    setTab('me')
  }
  function unclaim() {
    clearClaimedMember()
    setClaim(null)
  }

  const claimedRoster = rosterByMember(claimedMember)
  const myTeam = claimedRoster && !claimedRoster.joke ? canonicalTeamName(claimedRoster.team) : null

  return (
    <div className="app-shell">
      <header className={styles.header}>
        <h1 className={styles.title}>
          <span className={styles.trophy} aria-hidden>
            🏆
          </span>
          Family World Cup 2026
        </h1>
        <p className={styles.subtitle}>How everyone&apos;s teams are doing.</p>
      </header>

      <div className={styles.claimBar}>
        {claimedRoster ? (
          <>
            <div className={styles.who}>
              <div className={styles.label}>You&apos;re following</div>
              <div className={styles.name}>
                {claimedRoster.flag} {claimedRoster.team} · {claimedRoster.member}
              </div>
            </div>
            <button type="button" className={styles.linkButton} onClick={unclaim}>
              Change
            </button>
          </>
        ) : (
          <>
            <div className={styles.who}>
              <div className={styles.label}>Who are you?</div>
            </div>
            <ClaimPicker value={claimedMember} onClaim={claim} />
          </>
        )}
      </div>

      {failed && (
        <div className={styles.center}>
          Couldn&apos;t load the tournament data. Please check your connection and refresh.
        </div>
      )}

      {!failed && !derived && <div className={styles.center}>Loading the tournament…</div>}

      {derived && (
        <main>
          {tab === 'me' && (
            <MyTeamView
              entry={claimedMember ? derived.entryByMember.get(claimedMember) : undefined}
              total={derived.leaderboard.length}
              onClaim={claim}
              claimedMember={claimedMember}
              joke={claimedMember ? derived.jokeByMember.get(claimedMember) : undefined}
            />
          )}
          {tab === 'leaderboard' && (
            <LeaderboardView
              leaderboard={derived.leaderboard}
              claimedMember={claimedMember}
              jokeByMember={derived.jokeByMember}
            />
          )}
          {tab === 'bracket' && (
            <BracketView matches={derived.matches} owners={derived.ownerByTeam} myTeam={myTeam} />
          )}
          {tab === 'roster' && (
            <RosterView
              leaderboard={derived.leaderboard}
              familyTeams={derived.familyTeams}
              claimedMember={claimedMember}
              jokeByMember={derived.jokeByMember}
            />
          )}
          {tab === 'schedule' && (
            <ScheduleView matches={derived.matches} owners={derived.ownerByTeam} myTeam={myTeam} />
          )}

          {loaded && <p className={styles.feedNote}>{feedNote(loaded)}</p>}
        </main>
      )}

      <Tabs active={tab} onChange={setTab} />
    </div>
  )
}
