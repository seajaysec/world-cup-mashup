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
  {
    member: 'Harlan',
    team: 'Australia',
    flag: '🇦🇺',
    since: '2026-07-01',
    formerTeams: [{ team: 'Ecuador', since: '2026-06-30', until: '2026-07-01' }],
  },
  { member: 'April', team: 'Croatia', flag: '🇭🇷' },
  { member: 'Charlie', team: 'Denver Nuggets', flag: '🏀', joke: true },
  { member: 'Carol', team: 'Morocco', flag: '🇲🇦' },
  { member: 'KarrLynn', team: 'Egypt', flag: '🇪🇬' },
  {
    member: 'Preston',
    team: 'Ghana',
    flag: '🇬🇭',
    since: '2026-07-02',
    formerTeams: [{ team: 'Congo DR', until: '2026-07-02' }],
  },
  { member: 'Kim', team: 'Mexico', flag: '🇲🇽' },
  { member: 'Claire', team: 'Senegal', flag: '🇸🇳' },
  {
    member: 'Nate',
    team: 'Bosnia & Herzegovina',
    flag: '🇧🇦',
    since: '2026-07-01',
    formerTeams: [{ team: 'South Korea', until: '2026-07-01' }],
  },
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
  {
    member: 'Jon',
    team: 'Paraguay',
    flag: '🇵🇾',
    since: '2026-07-01',
    formerTeams: [{ team: 'Uruguay', until: '2026-07-01' }],
  },
  { member: 'FK', team: 'Austria', flag: '🇦🇹' },
]
