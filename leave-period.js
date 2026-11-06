export function validateLeavePeriod(value) {
  if (!['full', 'morning', 'afternoon'].includes(value)) throw new Error('Choose a valid leave period.')
  return value
}

export function getLeaveDayCount(startDate, endDate, period) {
  validateLeavePeriod(period)
  if (endDate < startDate) throw new Error('Leave end date must be on or after the start date.')
  if (period !== 'full') {
    if (startDate !== endDate) throw new Error('Half-day leave must be for one date only.')
    return 0.5
  }
  return Math.round((Date.parse(`${endDate}T00:00:00Z`) - Date.parse(`${startDate}T00:00:00Z`)) / 86_400_000) + 1
}

export function validateBreakTimes(breakStartTime, breakEndTime, workStartTime, workEndTime) {
  if (breakStartTime <= workStartTime || breakEndTime >= workEndTime || breakStartTime >= breakEndTime) {
    throw new Error('Break times must fall between work start and end, with break end after break start.')
  }
}

export function getClockLeaveError(period, action, time, breakStartTime, breakEndTime, checkIn = '') {
  if (period === 'full') return 'You have approved leave today and cannot clock in or out.'
  if (period === 'morning' && action === 'clock-in' && time < breakEndTime) {
    return `You have morning leave. Clock in at or after ${breakEndTime}.`
  }
  if (period === 'afternoon' && action === 'clock-in' && time >= breakStartTime) {
    return `You have afternoon leave. Clock in before ${breakStartTime}.`
  }
  if (period === 'afternoon' && action === 'clock-out' && time > breakStartTime) {
    return `You have afternoon leave. Clock out by ${breakStartTime}.`
  }
  if (period === 'morning' && action === 'clock-out' && checkIn < breakEndTime) {
    return `You have morning leave. Clock in at or after ${breakEndTime}.`
  }
  return null
}

export function attendanceConflictsWithLeave(period, record, breakStartTime, breakEndTime) {
  if (period === 'full') return true
  if (period === 'morning') return record.checkIn < breakEndTime
  return record.checkIn >= breakStartTime || Boolean(record.checkOut && record.checkOut > breakStartTime)
}