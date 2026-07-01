import { describe, expect, it } from 'vitest'
import { buildOwnerResolver } from '../src/lib/ownership'

describe('buildOwnerResolver', () => {
  it('credits a plain pick for the whole tournament', () => {
    const ownerOf = buildOwnerResolver([{ member: 'A', team: 'Brazil', flag: '' }])
    expect(ownerOf('Brazil', '2026-06-01')?.member).toBe('A')
    expect(ownerOf('Brazil', '2026-07-05')?.member).toBe('A')
  })

  it('honors `since` so a late pick is not back-credited', () => {
    const ownerOf = buildOwnerResolver([
      { member: 'A', team: 'Ecuador', flag: '', since: '2026-06-30' },
    ])
    expect(ownerOf('Ecuador', '2026-06-25')).toBeUndefined()
    expect(ownerOf('Ecuador', '2026-06-30')?.member).toBe('A')
  })

  it('treats a former team without `since` as held from the start', () => {
    const ownerOf = buildOwnerResolver([
      {
        member: 'Aaron',
        team: 'Switzerland',
        flag: '',
        since: '2026-06-29',
        formerTeams: [{ team: 'Curaçao', until: '2026-06-29' }],
      },
    ])
    expect(ownerOf('Curaçao', '2026-06-01')?.member).toBe('Aaron')
    expect(ownerOf('Curaçao', '2026-06-28')?.member).toBe('Aaron')
    expect(ownerOf('Curaçao', '2026-06-29')).toBeUndefined() // switched away
    expect(ownerOf('Switzerland', '2026-06-29')?.member).toBe('Aaron')
  })

  it('keeps a late-picked, then re-dropped former team in its bounded span', () => {
    // Harlan: joke → Ecuador (from 06-30) → Australia (from 07-01). Ecuador’s
    // earlier games (and Australia’s) must not be his; the day Ecuador went out
    // must be.
    const ownerOf = buildOwnerResolver([
      {
        member: 'Harlan',
        team: 'Australia',
        flag: '',
        since: '2026-07-01',
        formerTeams: [{ team: 'Ecuador', since: '2026-06-30', until: '2026-07-01' }],
      },
    ])
    expect(ownerOf('Ecuador', '2026-06-25')).toBeUndefined() // before he had it
    expect(ownerOf('Ecuador', '2026-06-30')?.member).toBe('Harlan') // his stint (KO day)
    expect(ownerOf('Ecuador', '2026-07-02')).toBeUndefined() // after the switch
    expect(ownerOf('Australia', '2026-06-30')).toBeUndefined() // not his yet
    expect(ownerOf('Australia', '2026-07-01')?.member).toBe('Harlan')
  })
})
