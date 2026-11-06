import { describe, expect, it } from 'vitest'
import { attendanceConflictsWithLeave, getClockLeaveError, getLeaveDayCount, validateBreakTimes } from './leave-period.js'

describe('half-day leave rules', () => {
  it('deducts half a day and keeps full-day ranges unchanged', () => {
    expect(getLeaveDayCount('2026-11-04', '2026-11-04', 'morning')).toBe(0.5)
    expect(getLeaveDayCount('2026-11-04', '2026-11-04', 'afternoon')).toBe(0.5)
    expect(getLeaveDayCount('2026-11-04', '2026-11-06', 'full')).toBe(3)
  })

  it('requires half-day leave to cover only one date', () => {
    expect(() => getLeaveDayCount('2026-11-04', '2026-11-05', 'morning')).toThrow('one date only')
  })

  it('validates the configured lunch break within the work schedule', () => {
    expect(() => validateBreakTimes('12:00', '13:00', '08:00', '17:00')).not.toThrow()
    expect(() => validateBreakTimes('17:00', '13:00', '08:00', '17:00')).toThrow('Break times must fall')
  })

  it('allows clocking only during the worked half', () => {
    expect(getClockLeaveError('morning', 'clock-in', '13:00', '12:00', '13:00')).toBeNull()
    expect(getClockLeaveError('morning', 'clock-in', '12:59', '12:00', '13:00')).toContain('13:00')
    expect(getClockLeaveError('afternoon', 'clock-in', '08:00', '12:00', '13:00')).toBeNull()
    expect(getClockLeaveError('afternoon', 'clock-out', '12:00', '12:00', '13:00')).toBeNull()
    expect(getClockLeaveError('afternoon', 'clock-out', '12:01', '12:00', '13:00')).toContain('12:00')
  })

  it('only treats attendance during the leave period as a conflict', () => {
    expect(attendanceConflictsWithLeave('morning', { checkIn: '08:00', checkOut: '17:00' }, '12:00', '13:00')).toBe(true)
    expect(attendanceConflictsWithLeave('morning', { checkIn: '13:00', checkOut: '17:00' }, '12:00', '13:00')).toBe(false)
    expect(attendanceConflictsWithLeave('afternoon', { checkIn: '08:00', checkOut: '17:00' }, '12:00', '13:00')).toBe(true)
    expect(attendanceConflictsWithLeave('afternoon', { checkIn: '08:00', checkOut: '12:00' }, '12:00', '13:00')).toBe(false)
  })
})