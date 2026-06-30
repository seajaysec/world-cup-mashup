import type { RosterEntry } from '../types'

/**
 * The family pick'em roster. Each member picked one team.
 *
 * To change a pick, edit the `team` here. For real World Cup teams, `team` should
 * match the feed spelling (or have an alias in data/teams.ts — e.g. "Congo DR").
 * The two for-fun picks that aren't in the tournament are marked `joke: true`.
 */
export const ROSTER: readonly RosterEntry[] = [
  { member: 'Win', team: 'England', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿' },
  { member: 'Di', team: 'USA', flag: '🇺🇸' },
  { member: 'David', team: 'Argentina', flag: '🇦🇷' },
  { member: 'Sarah', team: 'Portugal', flag: '🇵🇹' },
  {
    member: 'Elizabeth',
    team: 'Algeria',
    flag: '🇩🇿',
    since: '2026-06-30',
    formerTeams: [{ team: 'Germany', until: '2026-06-30' }],
  },
  { member: 'Hilary', team: 'Brazil', flag: '🇧🇷' },
  { member: 'Margaret', team: 'Spain', flag: '🇪🇸' },
  {
    member: 'Aaron',
    team: 'Switzerland',
    flag: '🇨🇭',
    since: '2026-06-29',
    formerTeams: [{ team: 'Curaçao', until: '2026-06-29' }],
  },
  { member: 'Chris', team: 'France', flag: '🇫🇷' },
  { member: 'Harlan', team: 'Galaxy', flag: '🌌', joke: true },
  { member: 'April', team: 'Croatia', flag: '🇭🇷' },
  { member: 'Charlie', team: 'Denver Nuggets', flag: '🏀', joke: true },
  { member: 'Carol', team: 'Morocco', flag: '🇲🇦' },
  { member: 'KarrLynn', team: 'Egypt', flag: '🇪🇬' },
  { member: 'Preston', team: 'Congo DR', flag: '🇨🇩' },
  { member: 'Kim', team: 'Mexico', flag: '🇲🇽' },
  { member: 'Claire', team: 'New Zealand', flag: '🇳🇿' },
  { member: 'Nate', team: 'South Korea', flag: '🇰🇷' },
  { member: 'Marla', team: 'Cape Verde', flag: '🇨🇻' },
  { member: 'Ethan', team: 'Norway', flag: '🇳🇴' },
  { member: 'Dwight', team: 'Belgium', flag: '🇧🇪' },
  {
    member: 'Kyle',
    team: 'Canada',
    flag: '🇨🇦',
    since: '2026-06-30',
    formerTeams: [{ team: 'Netherlands', until: '2026-06-30' }],
  },
  { member: 'Eli', team: 'Colombia', flag: '🇨🇴' },
  { member: 'Jon', team: 'Uruguay', flag: '🇺🇾' },
]
