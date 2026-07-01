import { describe, expect, it } from 'vitest'
import type { FeedMatch } from '../src/types'
import { finalScore, isSameLocalDay, localDayKey, wasShootout, winnerSide } from '../src/lib/format'

const ko = (score: FeedMatch['score']): FeedMatch => ({
  round: 'Round of 32',
  date: '2026-07-01',
  time: '13:00 UTC-7',
  team1: 'Belgium',
  team2: 'Senegal',
  num: 82,
  score,
})

describe('finalScore / winnerSide (result resolution)', () => {
  it('reads full time when there was no extra time', () => {
    expect(finalScore(ko({ ft: [2, 0] }))).toEqual([2, 0])
    expect(winnerSide(ko({ ft: [2, 0] }))).toBe(1)
  })

  it('treats a level group-stage score as a draw', () => {
    expect(winnerSide(ko({ ft: [1, 1] }))).toBe(0)
  })

  it('resolves an extra-time win the ft draw would have hidden (Belgium 3–2 aet)', () => {
    // The real regression: ft is a 2–2 draw, et is the decisive 3–2, no penalties.
    const m = ko({ et: [3, 2], ft: [2, 2], ht: [0, 1] })
    expect(finalScore(m)).toEqual([3, 2])
    expect(winnerSide(m)).toBe(1) // Belgium, not a draw
    expect(wasShootout(m)).toBe(false)
  })

  it('resolves a penalty shootout after a level extra time', () => {
    const m = ko({ p: [3, 4], et: [1, 1], ft: [1, 1] })
    expect(winnerSide(m)).toBe(2) // Senegal on penalties
    expect(wasShootout(m)).toBe(true)
  })

  it('returns no winner before a match is played', () => {
    expect(finalScore(ko(null))).toBeUndefined()
    expect(winnerSide(ko(null))).toBe(0)
  })
})

describe('localDayKey', () => {
  it('uses the local calendar day, not UTC', () => {
    // Constructed in local time, so this is the viewer's Jun 30 regardless of the
    // machine's timezone — the whole point is to not drift to the UTC day.
    const d = new Date(2026, 5, 30, 2, 0, 0)
    expect(localDayKey(d)).toBe('2026-06-30')
  })

  it('zero-pads month and day', () => {
    expect(localDayKey(new Date(2026, 0, 5, 12, 0))).toBe('2026-01-05')
  })
})

describe('isSameLocalDay', () => {
  it('treats two instants on the same local day as equal', () => {
    const morning = new Date(2026, 5, 30, 1, 0)
    const night = new Date(2026, 5, 30, 23, 0)
    expect(isSameLocalDay(morning, night)).toBe(true)
  })

  it('treats different local days as not equal', () => {
    const jun30 = new Date(2026, 5, 30, 23, 0)
    const jul1 = new Date(2026, 6, 1, 1, 0)
    expect(isSameLocalDay(jun30, jul1)).toBe(false)
  })
})
