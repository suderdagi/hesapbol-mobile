import { describe, expect, it } from 'vitest'
import { localDayKey } from './dates'

describe('localDayKey', () => {
  const lateEvening = '2026-11-17T22:30:00.000Z' // 01:30 on 18 November in Istanbul (UTC+3)

  it('moves to the next day for people east of Greenwich', () => {
    expect(localDayKey(lateEvening, 180)).toBe('2026-11-18')
  })

  it('stays on the same day at UTC and west of it', () => {
    expect(localDayKey(lateEvening, 0)).toBe('2026-11-17')
    expect(localDayKey(lateEvening, -300)).toBe('2026-11-17')
  })

  it('changes exactly at local midnight', () => {
    expect(localDayKey('2026-11-17T20:59:59.999Z', 180)).toBe('2026-11-17')
    expect(localDayKey('2026-11-17T21:00:00.000Z', 180)).toBe('2026-11-18')
  })

  it('uses the time zone of the machine when no offset is given', () => {
    const date = new Date(lateEvening)
    const pad = (n: number) => String(n).padStart(2, '0')
    expect(localDayKey(lateEvening)).toBe(`${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`)
  })
})
