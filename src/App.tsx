import { useEffect, useMemo, useState } from 'react'
import { canonicalTeamName, TEAMS } from './data/teams'
import { loadFeed, type LoadedFeed } from './lib/feed'
import { derive, rosterByMember } from './lib/derive'
import {
  clearClaimedMember,
  clearRepick,
  getClaimedMember,
  getRepicks,
  setClaimedMember as persistClaim,
  setRepick,
} from './lib/format'
import { Tabs, type TabKey } from './components/Tabs'
import { FavorProvider } from './components/FavorContext'
import { ClaimPicker } from './components/ClaimPicker'
import { MyTeamView } from './components/views/MyTeamView'
import { LeaderboardView } from './components/views/LeaderboardView'
import { BracketView } from './components/views/BracketView'
import { ScheduleView } from './components/views/ScheduleView'
import { FeudsView } from './components/views/FeudsView'
import { AboutView } from './components/views/AboutView'
import styles from './styles/app.module.css'

const ABOUT_HASH = '#how-it-works'

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
  const [repicks, setRepicks] = useState<Record<string, string>>(() => getRepicks())
  const [showAbout, setShowAbout] = useState(
    () => typeof window !== 'undefined' && window.location.hash === ABOUT_HASH,
  )

  useEffect(() => {
    const onHash = () => setShowAbout(window.location.hash === ABOUT_HASH)
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  const closeAbout = () => {
    if (window.location.hash) window.location.hash = ''
    setShowAbout(false)
  }

  useEffect(() => {
    let active = true
    const refresh = (initial: boolean) =>
      loadFeed()
        .then((result) => active && setLoaded(result))
        .catch(() => active && initial && setFailed(true))

    refresh(true)

    // Keep an open tab current: re-fetch hourly, and whenever it regains focus
    // after being hidden a while (so a phone left open overnight catches up).
    const hourly = setInterval(() => refresh(false), 60 * 60 * 1000)
    const onVisible = () => {
      if (document.visibilityState === 'visible') refresh(false)
    }
    document.addEventListener('visibilitychange', onVisible)

    return () => {
      active = false
      clearInterval(hourly)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [])

  // Capture "now" once per load so the joke seasons, schedule, and bracket are
  // stable (and date-aware) for the render.
  const now = useMemo(() => new Date(), [loaded])
  const derived = useMemo(() => (loaded ? derive(loaded.feed.matches, now) : null), [loaded, now])

  function claim(member: string) {
    persistClaim(member)
    setClaim(member)
    setTab('me')
  }
  function unclaim() {
    clearClaimedMember()
    setClaim(null)
  }
  function repick(team: string) {
    if (!claimedMember) return
    setRepick(claimedMember, team)
    setRepicks(getRepicks())
  }
  function clearMyRepick() {
    if (!claimedMember) return
    clearRepick(claimedMember)
    setRepicks(getRepicks())
  }

  const claimedRoster = rosterByMember(claimedMember)
  const myTeam = claimedRoster && !claimedRoster.joke ? canonicalTeamName(claimedRoster.team) : null

  // Unpicked teams still alive — the valid replacement pool for re-picks.
  const available = useMemo(() => {
    if (!derived) return []
    return TEAMS.filter((t) => {
      if (derived.ownerByTeam.has(t.name)) return false
      const status = derived.progressByTeam.get(t.name)?.status
      return status === 'alive' || status === 'champion'
    }).sort((a, b) => a.name.localeCompare(b.name))
  }, [derived])

  return (
    <div className="app-shell">
      <header className={styles.header}>
        <h1 className={styles.title}>
          <span className={styles.trophy} aria-hidden>
            🏆
          </span>
          Family World Cup 2026
        </h1>
        <p className={styles.subtitle}>
          How everyone&apos;s teams are doing.{' '}
          <a className={styles.aboutLink} href={ABOUT_HASH}>
            ℹ️ How it works
          </a>
        </p>
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

      {showAbout && <AboutView onBack={closeAbout} />}

      {!showAbout && failed && (
        <div className={styles.center}>
          Couldn&apos;t load the tournament data. Please check your connection and refresh.
        </div>
      )}

      {!showAbout && !failed && !derived && (
        <div className={styles.center}>Loading the tournament…</div>
      )}

      {!showAbout && derived && (
        <FavorProvider value={(team) => derived.favorByTeam.get(team)}>
        <main>
          {tab === 'me' && (
            <MyTeamView
              entry={claimedMember ? derived.entryByMember.get(claimedMember) : undefined}
              total={derived.leaderboard.length}
              onClaim={claim}
              claimedMember={claimedMember}
              joke={claimedMember ? derived.jokeByMember.get(claimedMember) : undefined}
              available={available}
              repickTeam={claimedMember ? repicks[claimedMember] : undefined}
              onRepick={repick}
              onClearRepick={clearMyRepick}
              mySpoons={
                derived.spoons.find((s) => s.member === claimedMember)?.count ?? 0
              }
            />
          )}
          {tab === 'leaderboard' && (
            <LeaderboardView
              leaderboard={derived.leaderboard}
              claimedMember={claimedMember}
              jokeByMember={derived.jokeByMember}
              progressByTeam={derived.progressByTeam}
              ownerByTeam={derived.ownerByTeam}
            />
          )}
          {tab === 'bracket' && (
            <BracketView
              matches={derived.matches}
              owners={derived.ownerByTeam}
              myTeam={myTeam}
              now={now}
            />
          )}
          {tab === 'schedule' && (
            <ScheduleView matches={derived.matches} owners={derived.ownerByTeam} myTeam={myTeam} />
          )}
          {tab === 'feuds' && (
            <FeudsView feuds={derived.feuds} spoons={derived.spoons} claimedMember={claimedMember} />
          )}

          {loaded && <p className={styles.feedNote}>{feedNote(loaded)}</p>}
        </main>
        </FavorProvider>
      )}

      <Tabs
        active={tab}
        onChange={(k) => {
          setTab(k)
          closeAbout()
        }}
      />
    </div>
  )
}
