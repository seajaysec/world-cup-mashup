import type { FeedMatch, Tier } from '../types'

/**
 * The "just for fun" picks (La Galaxy 🌌, Denver Nuggets 🏀) aren't in the World
 * Cup — but we don't want them sitting in a dead "not competing" row. Instead
 * each plays its own silly parallel season whose results are *derived from the
 * real World Cup*: the goals scored across all real matches on a given day feed
 * the joke team's scoreline that day. No API, fully deterministic, and it evolves
 * as the tournament unfolds — so they stay in the mix and (hopefully) raise a
 * smile.
 */

export interface JokeMatch {
  date: string
  opponent: string
  scoreFor: number
  scoreAgainst: number
  result: 'W' | 'D' | 'L'
}

export interface JokeUpcoming {
  date: string
  opponent: string
}

export interface JokeProgress {
  team: string
  emoji: string
  league: string
  /** How favored they'd be if they were really in it (based on real pedigree). */
  tier: Tier
  /** Where they'd likely land in a World Cup, given their real-world résumé. */
  projection: string
  /** One line of real-world bona fides. */
  pedigree: string
  record: { won: number; drawn: number; lost: number; points: number; for: number; against: number }
  form: string
  recent: JokeMatch[]
  next?: JokeUpcoming
  standingLabel: string
  blurb: string
  /** For ordering joke teams among themselves. */
  powerScore: number
}

interface JokeConfig {
  team: string
  emoji: string
  league: string
  tier: Tier
  projection: string
  pedigree: string
  opponents: string[]
  /** Turn a day's real-World-Cup output into this team's silly scoreline. */
  score: (realGoals: number, realMatches: number, seed: number) => [number, number]
  blurbs: (p: { points: number; played: number; lastGoals: number }) => string[]
}

const CONFIGS: Record<string, JokeConfig> = {
  Galaxy: {
    team: 'Galaxy',
    emoji: '🌌',
    league: 'the Intergalactic Cup',
    // LA Galaxy: the most decorated club in MLS history (6 MLS Cups, incl. 2024).
    tier: 'contender',
    projection: 'Deep run — a quarter-final or better, easily',
    pedigree: 'LA Galaxy: 6× MLS Cup champions (most ever), 2024 winners.',
    opponents: [
      'Andromeda FC',
      'Black Hole United',
      'Comet City',
      'Nebula Rovers',
      'Meteor Strikers',
      'Supernova SC',
      'Asteroid Athletic',
      'Quasar Galácticos',
    ],
    // The cosmos channels every real World Cup goal that day into La Galaxy.
    score: (realGoals, _realMatches, seed) => [Math.min(realGoals, 19), seed % 4],
    blurbs: ({ points, lastGoals }) => [
      `🌌 La Galaxy bent spacetime and the real World Cup's ${lastGoals} goals into their own net of glory.`,
      `🛸 Scientists baffled: La Galaxy keep winning matches that don't technically exist.`,
      `✨ ${points} points and counting in a league nobody else can see.`,
      `🌠 La Galaxy's striker scored from another dimension again.`,
    ],
  },
  'Denver Nuggets': {
    team: 'Denver Nuggets',
    emoji: '🏀',
    league: 'the Mile-High Invitational',
    // 2023 NBA champions; a perennial title contender (wrong sport, elite team).
    tier: 'favorite',
    projection: 'Title contender — they’d bully the bracket',
    pedigree: '2023 NBA champions, perennial Western Conference power.',
    opponents: [
      'Lakers Lads',
      'Court Crashers',
      'Rocky Mountain Rovers',
      'Alley-Oop Athletic',
      'Buzzer Beaters',
      'Slam Dunk SC',
      'Three-Point Town',
      'Tip-Off Town',
    ],
    // Basketball scores, and champions usually win. Real WC activity sets pace.
    score: (realGoals, realMatches, seed) => [
      96 + realGoals * 2 + (seed % 18),
      82 + realMatches * 2 + ((seed >> 3) % 14),
    ],
    blurbs: ({ points, lastGoals }) => [
      `🏀 The Nuggets put up ${lastGoals} — wrong sport, right energy.`,
      `📣 Coach insists the Nuggets are "basically dominating" the World Cup.`,
      `🔥 ${points} points. Different kind of points. Still counts here.`,
      `🏔️ Mile-high buzzer-beater seals another one for Denver.`,
    ],
  },
}

/** FNV-1a string hash → unsigned 32-bit. Deterministic stand-in for randomness. */
function hashStr(input: string): number {
  let h = 2166136261
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

/** Distinct match dates in the feed, ascending, with that day's real goal totals. */
function dailyWorldCupActivity(matches: FeedMatch[]): Map<string, { goals: number; count: number }> {
  const byDate = new Map<string, { goals: number; count: number }>()
  for (const m of matches) {
    if (!m.date) continue
    const entry = byDate.get(m.date) ?? { goals: 0, count: 0 }
    entry.count += 1
    const ft = m.score?.ft
    if (ft) entry.goals += ft[0] + ft[1]
    byDate.set(m.date, entry)
  }
  return byDate
}

function standingFor(points: number, played: number, league: string): string {
  if (played === 0) return `Warming up for ${league}`
  const ratio = points / (played * 3)
  if (ratio >= 0.7) return `🔥 Topping ${league}`
  if (ratio >= 0.45) return `Holding mid-table in ${league}`
  if (ratio > 0) return `Scrapping near the bottom of ${league}`
  return `Still chasing a first win in ${league}`
}

export function isJokeTeam(team: string): boolean {
  return team in CONFIGS
}

/**
 * Build a joke team's evolving season up to `now`. Days on or before today are
 * "played"; the next scheduled day is the upcoming fixture.
 */
export function computeJokeProgress(team: string, matches: FeedMatch[], now: Date): JokeProgress {
  const config = CONFIGS[team]
  if (!config) {
    return {
      team,
      emoji: '❓',
      league: 'the unknown',
      tier: 'longshot',
      projection: 'Anyone’s guess',
      pedigree: '',
      record: { won: 0, drawn: 0, lost: 0, points: 0, for: 0, against: 0 },
      form: '',
      recent: [],
      standingLabel: 'Off doing their own thing',
      blurb: '',
      powerScore: 0,
    }
  }

  const activity = dailyWorldCupActivity(matches)
  const dates = [...activity.keys()].sort()
  const today = now.toISOString().slice(0, 10)

  const record = { won: 0, drawn: 0, lost: 0, points: 0, for: 0, against: 0 }
  const played: JokeMatch[] = []
  let next: JokeUpcoming | undefined

  for (const date of dates) {
    const seed = hashStr(`${config.team}|${date}`)
    const opponent = config.opponents[seed % config.opponents.length]
    if (date <= today) {
      const day = activity.get(date)!
      const [scoreFor, scoreAgainst] = config.score(day.goals, day.count, seed)
      const result: JokeMatch['result'] =
        scoreFor > scoreAgainst ? 'W' : scoreFor < scoreAgainst ? 'L' : 'D'
      record.for += scoreFor
      record.against += scoreAgainst
      if (result === 'W') {
        record.won++
        record.points += 3
      } else if (result === 'D') {
        record.drawn++
        record.points += 1
      } else {
        record.lost++
      }
      played.push({ date, opponent, scoreFor, scoreAgainst, result })
    } else if (!next) {
      next = { date, opponent }
    }
  }

  const recent = played.slice(-5)
  const form = recent.map((m) => m.result).join('')
  const lastGoals = played.length ? played[played.length - 1].scoreFor : 0
  const blurbOptions = config.blurbs({ points: record.points, played: played.length, lastGoals })
  const blurb = blurbOptions[hashStr(`${config.team}|${today}`) % blurbOptions.length]

  return {
    team: config.team,
    emoji: config.emoji,
    league: config.league,
    tier: config.tier,
    projection: config.projection,
    pedigree: config.pedigree,
    record,
    form,
    recent,
    next,
    standingLabel: standingFor(record.points, played.length, config.league),
    blurb,
    powerScore: record.points,
  }
}
