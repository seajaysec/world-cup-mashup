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
