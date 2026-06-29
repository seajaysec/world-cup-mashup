import type { Feed } from '../types'

const FEED_URL =
  'https://raw.githubusercontent.com/openfootball/worldcup.json/master/2026/worldcup.json'

const SNAPSHOT_URL = `${import.meta.env.BASE_URL}worldcup-2026.snapshot.json`

const CACHE_KEY = 'wc2026.feed.cache.v1'

export type FeedSource = 'live' | 'cache' | 'snapshot'

export interface LoadedFeed {
  feed: Feed
  source: FeedSource
  /** When the feed data was fetched from GitHub (ms epoch), if known. */
  fetchedAt: number | null
}

interface CachedFeed {
  ts: number
  feed: Feed
}

function readCache(): CachedFeed | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as CachedFeed
  } catch {
    return null
  }
}

function writeCache(feed: Feed, ts: number): void {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ ts, feed }))
  } catch {
    /* storage full / disabled — caching is best-effort */
  }
}

function isValidFeed(value: unknown): value is Feed {
  return (
    typeof value === 'object' &&
    value !== null &&
    Array.isArray((value as Feed).matches) &&
    (value as Feed).matches.length > 0
  )
}

/**
 * Load the tournament data, preferring the live openfootball feed and degrading
 * gracefully: live fetch → last cached copy → the snapshot bundled at build time.
 * The app always gets *some* data so it never shows a blank screen.
 */
export async function loadFeed(): Promise<LoadedFeed> {
  try {
    const res = await fetch(FEED_URL, { cache: 'no-store' })
    if (!res.ok) throw new Error(`feed responded ${res.status}`)
    const json: unknown = await res.json()
    if (!isValidFeed(json)) throw new Error('feed JSON was not in the expected shape')
    const ts = Date.now()
    writeCache(json, ts)
    return { feed: json, source: 'live', fetchedAt: ts }
  } catch {
    const cached = readCache()
    if (cached && isValidFeed(cached.feed)) {
      return { feed: cached.feed, source: 'cache', fetchedAt: cached.ts }
    }
    const res = await fetch(SNAPSHOT_URL)
    const feed = (await res.json()) as Feed
    return { feed, source: 'snapshot', fetchedAt: null }
  }
}
