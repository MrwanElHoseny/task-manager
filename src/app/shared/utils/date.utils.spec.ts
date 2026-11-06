import { describe, expect, it } from 'vitest';

import { daysBetween, formatTimeAgo, parseLocalDate, startOfDay, toIsoDate } from './date.utils';

describe('date utils', () => {
  it('parses calendar dates as local midnight, keeping the day stable', () => {
    const date = parseLocalDate('2025-01-15');

    expect(date.getFullYear()).toBe(2025);
    expect(date.getMonth()).toBe(0);
    expect(date.getDate()).toBe(15);
    expect(date.getHours()).toBe(0);
  });

  it('round-trips through toIsoDate with zero padding', () => {
    expect(toIsoDate(parseLocalDate('2025-03-07'))).toBe('2025-03-07');
  });

  it('strips the time in startOfDay', () => {
    expect(startOfDay(new Date(2025, 5, 10, 23, 59)).getHours()).toBe(0);
  });

  it('counts calendar days, ignoring the time of day', () => {
    const lateEvening = new Date(2025, 0, 1, 23, 30);
    const earlyMorning = new Date(2025, 0, 2, 0, 30);

    expect(daysBetween(lateEvening, earlyMorning)).toBe(1);
    expect(daysBetween(earlyMorning, lateEvening)).toBe(-1);
  });

  it('is not thrown off by a daylight saving change', () => {
    expect(daysBetween(new Date(2025, 2, 1), new Date(2025, 3, 1))).toBe(31);
  });

  it.each([
    ['2025-06-10T11:59:40Z', 'just now'],
    ['2025-06-10T11:55:00Z', '5 minutes ago'],
    ['2025-06-10T09:00:00Z', '3 hours ago'],
    ['2025-06-09T12:00:00Z', 'yesterday'],
    ['2025-06-05T12:00:00Z', '5 days ago'],
  ])('formats %s as "%s"', (timestamp, expected) => {
    expect(formatTimeAgo(timestamp, new Date('2025-06-10T12:00:00Z'))).toBe(expected);
  });
});
