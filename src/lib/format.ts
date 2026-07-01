import type { FeedMatch } from '../types'

/**
 * Parse an openfootball kickoff ("2026-06-29" + "20:00 UTC-6") into a real
 * instant in time. Returns null if the time string is missing/unrecognised
 * (some far-future knockout fixtures omit the time).
 */
export function parseKickoff(date: string, time: string | undefined): Date | null {
  if (!date) return null
  if (!time) return null
  const m = time.trim().match(/^(\d{1,2}):(\d{2})\s*UTC([+-])(\d{1,2})(?::?(\d{2}))?$/)
  if (!m) return null
  const [, hh, mm, sign, offH, offM] = m
  const oh = offH.padStart(2, '0')
  const om = (offM ?? '00').padStart(2, '0')
  const iso = `${date}T${hh.padStart(2, '0')}:${mm}:00${sign}${oh}:${om}`
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? null : d
}

/**
 * The decisive aggregate score of a match: after extra time if it was played
 * (`et`), otherwise full time (`ft`). Undefined until the match is played.
 *
 * openfootball reports a knockout in layers — `ft` is the score at 90 minutes,
 * `et` the score after extra time (cumulative, so it already includes the `ft`
 * goals), and `p` the penalty shootout. A game won in extra time has a *drawn*
 * `ft`, so anything deciding a result must read `et ?? ft`, never `ft` alone.
 */
export function finalScore(match: FeedMatch): [number, number] | undefined {
  return match.score?.et ?? match.score?.ft ?? undefined
}

/**
 * Which side won. 1 = team1, 2 = team2, 0 = genuine draw (group stage). Uses the
 * post-extra-time score, and falls to the penalty shootout when that's level —
 * so an extra-time or shootout knockout returns its real winner, not 0.
 */
export function winnerSide(match: FeedMatch): 0 | 1 | 2 {
  const final = finalScore(match)
  if (!final) return 0
  if (final[0] > final[1]) return 1
  if (final[1] > final[0]) return 2
  const p = match.score?.p
  if (p && p[0] !== p[1]) return p[0] > p[1] ? 1 : 2
  return 0
}

/** True when a level (post-extra-time) score was settled by a penalty shootout. */
export function wasShootout(match: FeedMatch): boolean {
  const final = finalScore(match)
  return Boolean(final && final[0] === final[1] && match.score?.p)
}

/**
 * "YYYY-MM-DD" for an instant in the *viewer's* local timezone. Use this — not
 * `toISOString().slice(0,10)`, which is the UTC day and can be off by one
 * (e.g. a US-evening "now" is already tomorrow in UTC) — for any "is this
 * today?" check, so the answer matches the date the viewer actually sees.
 */
export function localDayKey(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** True if the kickoff falls on the same local calendar day as `now`. */
export function isSameLocalDay(a: Date, b: Date): boolean {
  return localDayKey(a) === localDayKey(b)
}

/** Sort key for matches in chronological order (date, then time, then number). */
export function matchTimeKey(match: FeedMatch): number {
  const kickoff = parseKickoff(match.date, match.time)
  if (kickoff) return kickoff.getTime()
  // Fall back to date-only so timeless fixtures still sort sensibly.
  const dayOnly = new Date(`${match.date}T00:00:00Z`)
  return Number.isNaN(dayOnly.getTime()) ? Number.MAX_SAFE_INTEGER : dayOnly.getTime()
}

/** "Mon, Jun 29 · 8:00 PM" in the viewer's local timezone. */
export function formatKickoff(match: FeedMatch): string {
  const kickoff = parseKickoff(match.date, match.time)
  if (!kickoff) {
    const day = new Date(`${match.date}T00:00:00Z`)
    if (Number.isNaN(day.getTime())) return match.date
    return new Intl.DateTimeFormat(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      timeZone: 'UTC',
    }).format(day)
  }
  return new Intl.DateTimeFormat(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(kickoff)
}

/** True if the match's kickoff is in the future relative to `now`. */
export function isUpcoming(match: FeedMatch, now: number = Date.now()): boolean {
  const kickoff = parseKickoff(match.date, match.time)
  if (!kickoff) return matchTimeKey(match) >= now
  return kickoff.getTime() >= now
}

/** Human label for an unresolved bracket slot, e.g. "W75" → "Winner of match 75". */
export function formatSlot(token: string): string {
  const win = /^W(\d+)$/.exec(token)
  if (win) return `Winner of match ${win[1]}`
  const lose = /^L(\d+)$/.exec(token)
  if (lose) return `Loser of match ${lose[1]}`
  return token
}

/** True if a team name is still an unresolved bracket placeholder. */
export function isPlaceholder(token: string): boolean {
  return /^[WL]\d+$/.test(token)
}

const CLAIM_KEY = 'wc2026.claim.member'

/** Which family member is "me" in this browser. Null if not claimed. */
export function getClaimedMember(): string | null {
  try {
    return localStorage.getItem(CLAIM_KEY)
  } catch {
    return null
  }
}

export function setClaimedMember(member: string): void {
  try {
    localStorage.setItem(CLAIM_KEY, member)
  } catch {
    /* private mode / storage disabled — claim simply won't persist */
  }
}

export function clearClaimedMember(): void {
  try {
    localStorage.removeItem(CLAIM_KEY)
  } catch {
    /* no-op */
  }
}
