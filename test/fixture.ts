import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import type { Feed } from '../src/types'

/** The bundled snapshot doubles as a deterministic test fixture. */
const path = fileURLToPath(new URL('../public/worldcup-2026.snapshot.json', import.meta.url))

export const FEED = JSON.parse(readFileSync(path, 'utf8')) as Feed
export const MATCHES = FEED.matches
