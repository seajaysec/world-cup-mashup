import { useCallback, useEffect, useMemo, useState } from 'react'
import { canonicalTeamName, TEAMS } from './data/teams'
import { loadFeed, type LoadedFeed } from './lib/feed'
import { derive, rosterByMember } from './lib/derive'
import {
  clearClaimedMember,
  clearRepick,
  formatKickoff,
  formatSlot,
  getClaimedMember,
  getRepicks,
  isPlaceholder,
  parseKickoff,
  setClaimedMember as persistClaim,
  setRepick,
} from './lib/format'
import {
  disableNotifications,
  enableNotifications,
  notificationsSupported,
  notifyEnabled,
  primeBaseline,
  syncNotifications,
} from './lib/notify'
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
  const when = loaded.fetchedAt ? new Date(loaded.fetchedAt).toLocaleString() : null
  switch (loaded.source) {
    case 'live':
    case 'cache':
      // It's a snapshot your browser pulled at this time — not a live ticker.
      return `Your copy — pulled from the feed ${when ?? 'recently'}.`
    case 'snapshot':
      return 'Showing the bundled snapshot (couldn’t reach the live feed) — may be out of date.'
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
  const [alertsOn, setAlertsOn] = useState(() => notifyEnabled())

  useEffect(() => {
    const onHash = () => setShowAbout(window.location.hash === ABOUT_HASH)
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  const closeAbout = () => {
    if (window.location.hash) window.location.hash = ''
    setShowAbout(false)
  }

  const [refreshing, setRefreshing] = useState(false)
  const refreshFeed = useCallback(async (initial = false) => {
    setRefreshing(true)
    try {
      const result = await loadFeed()
      setLoaded(result)
      setFailed(false)
    } catch {
      if (initial) setFailed(true)
    } finally {
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    refreshFeed(true)
    // Keep an open tab current: re-fetch hourly, and whenever it regains focus
    // after being hidden a while (so a phone left open overnight catches up).
    const hourly = setInterval(() => refreshFeed(), 60 * 60 * 1000)
    const onVisible = () => {
      if (document.visibilityState === 'visible') refreshFeed()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      clearInterval(hourly)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [refreshFeed])

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

  // A heads-up when the claimed member's team kicks off soon (within ~24h).
  const upcomingSoon = useMemo(() => {
    if (!derived || !claimedMember || !myTeam) return null
    const next = derived.entryByMember.get(claimedMember)?.progress.nextMatch
    if (!next) return null
    const kick = parseKickoff(next.date, next.time)
    if (!kick) return null
    const hours = (kick.getTime() - now.getTime()) / 3_600_000
    if (hours < -2.5 || hours > 24) return null
    const oppRaw = canonicalTeamName(next.team1) === myTeam ? next.team2 : next.team1
    const opponent = isPlaceholder(oppRaw) ? formatSlot(oppRaw) : oppRaw
    return { team: claimedRoster!.team, opponent, when: formatKickoff(next), live: hours <= 0 }
  }, [derived, claimedMember, myTeam, now, claimedRoster])

  // Match alerts: while alerts are on, re-check the feed for any family team that
  // just kicked off or just finished. Results refresh with the feed (hourly / on
  // focus); start detection runs on a lighter timer so it doesn't lag the clock.
  useEffect(() => {
    if (!alertsOn || !derived) return
    const run = () =>
      void syncNotifications(derived.matches, derived.familyTeams, derived.ownerByTeam)
    run()
    const timer = setInterval(run, 5 * 60 * 1000)
    return () => clearInterval(timer)
  }, [alertsOn, derived])

  async function toggleAlerts() {
    if (alertsOn) {
      disableNotifications()
      setAlertsOn(false)
      return
    }
    const ok = await enableNotifications()
    if (ok && derived) {
      // Don't replay games that already happened — only alert on what changes now.
      primeBaseline(derived.matches, derived.familyTeams, derived.ownerByTeam)
    }
    setAlertsOn(ok)
  }

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

      {notificationsSupported() && (
        <div className={styles.alertsBar}>
          <span className={styles.alertsText}>
            {alertsOn
              ? '🔔 Alerts on — you’ll be pinged when any family team kicks off or finishes (while this tab is open).'
              : '🔕 Get a ping when any family team starts a game or wins/loses.'}
          </span>
          <button type="button" className={styles.linkButton} onClick={toggleAlerts}>
            {alertsOn ? 'Turn off' : 'Turn on alerts'}
          </button>
        </div>
      )}

      {!showAbout && upcomingSoon && (
        <div className={styles.todayBanner}>
          🔔 <strong>{upcomingSoon.team}</strong>{' '}
          {upcomingSoon.live ? 'are playing now' : 'play soon'} — vs {upcomingSoon.opponent} ·{' '}
          {upcomingSoon.when}
        </div>
      )}

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

          {loaded && (
            <p className={styles.feedNote}>
              {feedNote(loaded)}{' '}
              <button
                type="button"
                className={styles.refreshButton}
                onClick={() => refreshFeed()}
                disabled={refreshing}
              >
                {refreshing ? 'Refreshing…' : '↻ Refresh'}
              </button>
            </p>
          )}
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
