import type { FeedMatch, RosterEntry } from '../types'
import { getTeamMeta } from '../data/teams'
import { finalScore, matchTimeKey, parseKickoff, wasShootout, winnerSide } from './format'

/**
 * Client-side match alerts. While the page is open (it refreshes hourly and on
 * focus, and we re-check every few minutes), we watch the live feed for every
 * family-owned team and fire a local browser notification when one of their
 * games kicks off, and again when it finishes (won / drew / lost / knocked out).
 *
 * There's no push server — a static GitHub Pages site can't securely collect
 * push subscriptions. So this only fires while a tab is open. A localStorage
 * baseline of already-seen events means you never get a backlog: turning alerts
 * on "primes" every current event as seen, so you only hear about what changes
 * from that moment forward.
 */

const ENABLED_KEY = 'wc2026.notify.enabled'
const SEEN_KEY = 'wc2026.notify.seen'
// Set on the very first visit so the away-recap can tell "first time here"
// (baseline silently, show nothing) from a genuine return visit (show the diff).
const INIT_KEY = 'wc2026.notify.init'

export function notificationsSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'Notification' in window &&
    'serviceWorker' in navigator
  )
}

export function notifyEnabled(): boolean {
  try {
    return localStorage.getItem(ENABLED_KEY) === '1' && Notification.permission === 'granted'
  } catch {
    return false
  }
}

function setEnabledFlag(on: boolean): void {
  try {
    if (on) localStorage.setItem(ENABLED_KEY, '1')
    else localStorage.removeItem(ENABLED_KEY)
  } catch {
    /* storage disabled — alerts just won't persist across reloads */
  }
}

function getSeen(): Set<string> {
  try {
    const raw = localStorage.getItem(SEEN_KEY)
    return new Set(raw ? (JSON.parse(raw) as string[]) : [])
  } catch {
    return new Set()
  }
}

function setSeen(seen: Set<string>): void {
  try {
    localStorage.setItem(SEEN_KEY, JSON.stringify([...seen]))
  } catch {
    /* no-op */
  }
}

function visitedBefore(): boolean {
  try {
    return localStorage.getItem(INIT_KEY) === '1'
  } catch {
    return false
  }
}

function markVisited(): void {
  try {
    localStorage.setItem(INIT_KEY, '1')
  } catch {
    /* no-op */
  }
}

/** Register the notification service worker (idempotent). */
async function getRegistration(): Promise<ServiceWorkerRegistration | null> {
  if (!notificationsSupported()) return null
  try {
    const url = `${import.meta.env.BASE_URL}notify-sw.js`
    return await navigator.serviceWorker.register(url, { scope: import.meta.env.BASE_URL })
  } catch {
    return null
  }
}

/**
 * Ask for notification permission and register the worker. Returns true if we
 * end up able to show notifications. Caller should prime the baseline on success
 * so the user doesn't get flooded with past events.
 */
export async function enableNotifications(): Promise<boolean> {
  if (!notificationsSupported()) return false
  let permission = Notification.permission
  if (permission === 'default') {
    try {
      permission = await Notification.requestPermission()
    } catch {
      return false
    }
  }
  if (permission !== 'granted') {
    setEnabledFlag(false)
    return false
  }
  await getRegistration()
  setEnabledFlag(true)
  return true
}

export function disableNotifications(): void {
  setEnabledFlag(false)
}

async function show(title: string, body: string, tag: string): Promise<void> {
  const data = { url: typeof window !== 'undefined' ? window.location.href : undefined }
  const options: NotificationOptions = { body, tag, data }
  try {
    const reg = await navigator.serviceWorker.getRegistration(import.meta.env.BASE_URL)
    if (reg) {
      await reg.showNotification(title, options)
      return
    }
  } catch {
    /* fall through to the page-level Notification (desktop) */
  }
  try {
    new Notification(title, options)
  } catch {
    /* nothing we can do */
  }
}

/** A stable id for a match (group matches carry no number). */
function matchKey(m: FeedMatch): string {
  return `${m.date}|${m.team1}|${m.team2}`
}

/** True for a knockout match (no group, so a loss means elimination). */
function isKnockout(m: FeedMatch): boolean {
  return !m.group
}

export interface NotifyEvent {
  key: string
  title: string
  body: string
}

function withFlag(team: string, owner?: RosterEntry): string {
  const flag = owner?.flag ?? getTeamMeta(team)?.flag ?? ''
  return flag ? `${flag} ${team}` : team
}

/** Build the alerts a single family-team match warrants at `now`. */
function eventsForMatch(
  m: FeedMatch,
  side: 1 | 2,
  owner: RosterEntry | undefined,
  oppOwner: RosterEntry | undefined,
  nowMs: number,
): NotifyEvent[] {
  const key = matchKey(m)
  const team = side === 1 ? m.team1 : m.team2
  const opp = side === 1 ? m.team2 : m.team1
  const teamLabel = withFlag(team, owner)
  const oppLabel = withFlag(opp, oppOwner)
  const who = owner ? `${owner.member}'s ` : ''
  const clash = owner && oppOwner ? ` (${owner.member} vs ${oppOwner.member}!)` : ''

  const kick = parseKickoff(m.date, m.time)
  const resulted = Boolean(m.score?.ft)
  const started = resulted || (kick ? nowMs >= kick.getTime() : false)

  const events: NotifyEvent[] = []

  if (started) {
    events.push({
      key: `${side}|start|${key}`,
      title: `⚽ ${team} are playing`,
      body: `${who}team is up against ${oppLabel} — ${m.round}.${clash}`,
    })
  }

  if (resulted) {
    const final = finalScore(m) ?? [0, 0]
    const a = side === 1 ? final[0] : final[1] // goals for
    const b = side === 1 ? final[1] : final[0] // goals against
    const ws = winnerSide(m)
    const pens = wasShootout(m) ? ' (on penalties)' : ''
    let title: string
    let body: string
    if (ws === 0) {
      title = `🤝 ${team} drew`
      body = `${teamLabel} drew ${a}–${b} with ${oppLabel}.`
    } else if (ws === side) {
      title = `✅ ${team} won`
      body = `${teamLabel} beat ${oppLabel} ${a}–${b}${pens}.`
    } else if (isKnockout(m)) {
      title = `💀 ${team} knocked out`
      body = `${oppLabel} won ${b}–${a}${pens}. ${who}run is over.`
    } else {
      title = `❌ ${team} lost`
      body = `${oppLabel} beat ${teamLabel} ${b}–${a}.`
    }
    events.push({ key: `${side}|result|${key}`, title, body })
  }

  return events
}

/** Every alert-worthy event across all family teams, right now. Exported for tests. */
export function computeNotifyEvents(
  matches: FeedMatch[],
  familyTeams: Set<string>,
  ownerByTeam: Map<string, RosterEntry>,
  nowMs: number,
): NotifyEvent[] {
  const out: NotifyEvent[] = []
  for (const m of matches) {
    const fam1 = familyTeams.has(m.team1)
    const fam2 = familyTeams.has(m.team2)
    if (!fam1 && !fam2) continue
    if (fam1) {
      out.push(
        ...eventsForMatch(m, 1, ownerByTeam.get(m.team1), ownerByTeam.get(m.team2), nowMs),
      )
    }
    if (fam2) {
      out.push(
        ...eventsForMatch(m, 2, ownerByTeam.get(m.team2), ownerByTeam.get(m.team1), nowMs),
      )
    }
  }
  return out
}

/**
 * Mark every currently-true event as already-seen without notifying. Call this
 * the moment alerts are switched on so the user doesn't get a flood of games
 * that already kicked off or finished.
 */
export function primeBaseline(
  matches: FeedMatch[],
  familyTeams: Set<string>,
  ownerByTeam: Map<string, RosterEntry>,
  nowMs: number = Date.now(),
): void {
  const seen = getSeen()
  for (const e of computeNotifyEvents(matches, familyTeams, ownerByTeam, nowMs)) seen.add(e.key)
  setSeen(seen)
}

/**
 * Fire notifications for any family-team event we haven't seen yet, then record
 * them so they never fire twice. No-op unless alerts are enabled.
 */
export async function syncNotifications(
  matches: FeedMatch[],
  familyTeams: Set<string>,
  ownerByTeam: Map<string, RosterEntry>,
  nowMs: number = Date.now(),
): Promise<void> {
  if (!notifyEnabled()) return
  const seen = getSeen()
  const fresh = computeNotifyEvents(matches, familyTeams, ownerByTeam, nowMs).filter((e) => !seen.has(e.key))
  if (!fresh.length) return
  // Record first so a failed/slow show() can't cause a duplicate next tick.
  for (const e of fresh) seen.add(e.key)
  setSeen(seen)
  for (const e of fresh) {
    await show(e.title, e.body, e.key)
  }
}

export interface AwayItem {
  key: string
  title: string
  body: string
  /** Kickoff time, for ordering newest-first. */
  t: number
}

/**
 * "While you were away": every family-team game that kicked off or finished
 * since the last time this browser saw it — i.e. events not already in the seen
 * baseline (which a live notification would have consumed while the tab was
 * open). Reuses the same baseline as the notifications so a game is never both
 * notified live *and* re-listed here. Updating the baseline is a side effect, so
 * call this once per page load.
 *
 * Returns `firstVisit: true` (and no items) the very first time, so a brand-new
 * visitor isn't dumped the whole tournament so far.
 */
export function summarizeSinceLastVisit(
  matches: FeedMatch[],
  familyTeams: Set<string>,
  ownerByTeam: Map<string, RosterEntry>,
  nowMs: number = Date.now(),
): { firstVisit: boolean; items: AwayItem[] } {
  const seen = getSeen()
  const current = computeNotifyEvents(matches, familyTeams, ownerByTeam, nowMs)
  const fresh = new Set(current.filter((e) => !seen.has(e.key)).map((e) => e.key))
  const byKey = new Map(current.map((e) => [e.key, e]))

  // Advance the baseline to "everything known now" so these don't resurface.
  for (const e of current) seen.add(e.key)
  setSeen(seen)

  const firstVisit = !visitedBefore()
  markVisited()
  if (firstVisit) return { firstVisit: true, items: [] }

  // One line per family match-side: a finished result supersedes its kickoff.
  const items: AwayItem[] = []
  for (const m of matches) {
    const t = matchTimeKey(m)
    const id = matchKey(m)
    for (const side of [1, 2] as const) {
      const team = side === 1 ? m.team1 : m.team2
      if (!familyTeams.has(team)) continue
      const resultKey = `${side}|result|${id}`
      const startKey = `${side}|start|${id}`
      if (fresh.has(resultKey)) items.push({ ...byKey.get(resultKey)!, t })
      else if (fresh.has(startKey)) items.push({ ...byKey.get(startKey)!, t })
    }
  }
  items.sort((a, b) => b.t - a.t)
  return { firstVisit: false, items }
}
