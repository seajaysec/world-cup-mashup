import type { FeedMatch, GroupRecord, StageKey, TeamProgress } from '../types'
import { canonicalTeamName, getTeamMeta } from '../data/teams'
import { computeGroupRecords } from './standings'
import { finalScore, matchTimeKey, wasShootout, winnerSide } from './format'

/** Knockout rounds in chronological order, used to find a team's last exit. */
const KO_ROUND_ORDER = [
  'Round of 32',
  'Round of 16',
  'Quarter-final',
  'Semi-final',
  'Match for third place',
  'Final',
] as const

/** Higher = further along. Drives the leaderboard ordering. */
export const STAGE_ORDER: Record<StageKey, number> = {
  notCompeting: -1,
  group: 0,
  round32: 1,
  round16: 2,
  quarter: 3,
  semi: 4,
  fourth: 5,
  third: 6,
  runnerUp: 7,
  final: 8,
  champion: 9,
}

function isKnockoutRound(round: string): boolean {
  return (KO_ROUND_ORDER as readonly string[]).includes(round)
}

function isPlayed(match: FeedMatch): boolean {
  return Boolean(match.score?.ft)
}

/** Canonical winner of a played match (penalty shootouts respected), or null. */
function winnerOf(match: FeedMatch): string | null {
  const side = winnerSide(match)
  if (side === 1) return canonicalTeamName(match.team1)
  if (side === 2) return canonicalTeamName(match.team2)
  return null
}

/** Canonical loser of a played match (penalty shootouts respected), or null. */
function loserOf(match: FeedMatch): string | null {
  const side = winnerSide(match)
  if (side === 1) return canonicalTeamName(match.team2)
  if (side === 2) return canonicalTeamName(match.team1)
  return null
}

/**
 * Knockout slots reference earlier matches as "W74" (winner of match 74) or
 * "L101" (loser of match 101). The feed *sometimes* fills the real name in once
 * the feeder match ends, but not reliably — so we resolve every placeholder
 * ourselves from the match numbers. A placeholder whose feeder hasn't been played
 * is left untouched (e.g. "W75") so the UI can show "Winner of match 75".
 *
 * Returns a new match list with team names resolved to canonical real names
 * wherever possible.
 */
export function resolveMatches(matches: FeedMatch[]): FeedMatch[] {
  const byNum = new Map<number, FeedMatch>()
  for (const m of matches) {
    if (m.num != null) byNum.set(m.num, m)
  }

  const resolveToken = (token: string): string => {
    const win = /^W(\d+)$/.exec(token)
    if (win) {
      const feeder = byNum.get(Number(win[1]))
      return (feeder && winnerOf(feeder)) ?? token
    }
    const lose = /^L(\d+)$/.exec(token)
    if (lose) {
      const feeder = byNum.get(Number(lose[1]))
      return (feeder && loserOf(feeder)) ?? token
    }
    return canonicalTeamName(token)
  }

  return matches.map((m) => ({
    ...m,
    team1: resolveToken(m.team1),
    team2: resolveToken(m.team2),
  }))
}

/** The stage a team has reached when its next match is in `round` (still alive). */
function aliveStage(round: string): StageKey {
  switch (round) {
    case 'Round of 32':
      return 'round32'
    case 'Round of 16':
      return 'round16'
    case 'Quarter-final':
      return 'quarter'
    case 'Semi-final':
      return 'semi'
    case 'Match for third place':
      return 'fourth' // lost the semi; playing for 3rd, so 4th is the floor
    case 'Final':
      return 'final'
    default:
      return 'group'
  }
}

function aliveLabel(round: string): string {
  switch (round) {
    case 'Round of 32':
      return 'Into the Round of 32'
    case 'Round of 16':
      return 'Into the Round of 16'
    case 'Quarter-final':
      return 'Into the quarter-finals'
    case 'Semi-final':
      return 'Into the semi-finals'
    case 'Match for third place':
      return 'Playing for 3rd place'
    case 'Final':
      return 'Into the FINAL'
    default:
      return 'In the group stage'
  }
}

/** Classify a team that has no more matches to play (eliminated or medalled). */
function classifyFinished(
  team: string,
  koPlayed: FeedMatch[],
): { stage: StageKey; status: 'out' | 'champion'; label: string } {
  if (koPlayed.length === 0) {
    return { stage: 'group', status: 'out', label: 'Knocked out in the group stage' }
  }
  const last = koPlayed[koPlayed.length - 1]
  const won = winnerOf(last) === team

  switch (last.round) {
    case 'Final':
      return won
        ? { stage: 'champion', status: 'champion', label: '🏆 World Champions!' }
        : { stage: 'runnerUp', status: 'out', label: 'Runners-up 🥈' }
    case 'Match for third place':
      return won
        ? { stage: 'third', status: 'out', label: 'Finished 3rd 🥉' }
        : { stage: 'fourth', status: 'out', label: 'Finished 4th' }
    case 'Semi-final':
      // No 3rd-place game on record — treat a semi exit as 4th.
      return { stage: 'fourth', status: 'out', label: 'Knocked out in the semi-finals' }
    case 'Quarter-final':
      return { stage: 'quarter', status: 'out', label: 'Knocked out in the quarter-finals' }
    case 'Round of 16':
      return { stage: 'round16', status: 'out', label: 'Knocked out in the Round of 16' }
    case 'Round of 32':
    default:
      return { stage: 'round32', status: 'out', label: 'Knocked out in the Round of 32' }
  }
}

/**
 * Work out where one team stands. A team is "alive" if it still has an unplayed
 * match somewhere in the feed under its real name — because the feed propagates
 * winners' names into the next round's slot as soon as the feeder match ends,
 * this is a reliable signal. Otherwise it has either won the tournament or been
 * knocked out, which we read off its last played knockout match.
 */
export function computeTeamProgress(
  teamName: string,
  matches: FeedMatch[],
  groupRecords: Map<string, GroupRecord>,
): TeamProgress {
  const team = canonicalTeamName(teamName)
  const meta = getTeamMeta(team)

  if (!meta) {
    // A for-fun pick that isn't actually in the World Cup.
    return {
      team,
      status: 'notCompeting',
      stage: 'notCompeting',
      standingLabel: 'Not in the World Cup',
    }
  }

  const groupRecord = groupRecords.get(team)
  const mine = matches.filter(
    (m) => canonicalTeamName(m.team1) === team || canonicalTeamName(m.team2) === team,
  )

  const upcoming = mine.filter((m) => !isPlayed(m)).sort((a, b) => matchTimeKey(a) - matchTimeKey(b))
  if (upcoming.length > 0) {
    const next = upcoming[0]
    return {
      team,
      status: 'alive',
      stage: aliveStage(next.round),
      standingLabel: aliveLabel(next.round),
      nextMatch: next,
      groupRecord,
    }
  }

  const koPlayed = mine
    .filter((m) => isKnockoutRound(m.round) && isPlayed(m))
    .sort((a, b) => KO_ROUND_ORDER.indexOf(a.round as never) - KO_ROUND_ORDER.indexOf(b.round as never))

  const { stage, status, label } = classifyFinished(team, koPlayed)

  // Capture how a knockout casualty went out (their last KO match, which they lost).
  let exit: TeamProgress['exit']
  const lastKo = koPlayed[koPlayed.length - 1]
  if (status === 'out' && lastKo && winnerOf(lastKo) !== team) {
    const final = finalScore(lastKo) ?? [0, 0]
    const teamIsHome = canonicalTeamName(lastKo.team1) === team
    const opponentRaw = teamIsHome ? lastKo.team2 : lastKo.team1
    const opponent = canonicalTeamName(opponentRaw)
    exit = {
      opponent,
      opponentFlag: getTeamMeta(opponent)?.flag ?? '🏳️',
      scoreFor: teamIsHome ? final[0] : final[1],
      scoreAgainst: teamIsHome ? final[1] : final[0],
      pens: wasShootout(lastKo),
      round: lastKo.round,
      date: lastKo.date,
    }
  }

  return {
    team,
    status,
    stage,
    standingLabel: label,
    eliminatedLabel: status === 'out' ? label : undefined,
    groupRecord,
    exit,
  }
}

/**
 * Compute progress for every distinct team named in the roster, keyed by
 * canonical name. Resolves bracket placeholders first (idempotent), so it is
 * safe to pass either raw or already-resolved matches.
 */
export function computeAllProgress(
  teamNames: string[],
  matches: FeedMatch[],
): Map<string, TeamProgress> {
  const resolved = resolveMatches(matches)
  const groupRecords = computeGroupRecords(resolved)
  const result = new Map<string, TeamProgress>()
  for (const name of teamNames) {
    const canonical = canonicalTeamName(name)
    if (!result.has(canonical)) {
      result.set(canonical, computeTeamProgress(canonical, resolved, groupRecords))
    }
  }
  return result
}
