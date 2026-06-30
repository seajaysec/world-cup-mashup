import { describe, expect, it } from 'vitest'
import { isSameLocalDay, localDayKey } from '../src/lib/format'

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
