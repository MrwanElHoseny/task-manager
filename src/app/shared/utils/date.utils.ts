const MS_PER_DAY = 86_400_000;

/**
 * Parses YYYY-MM-DD as local midnight. `new Date('2025-01-15')` is UTC midnight, which
 * lands on the previous day anywhere west of Greenwich.
 */
export function parseLocalDate(isoDate: string): Date {
  const [year, month, day] = isoDate.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function toIsoDate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

export function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/** Whole calendar days from `from` to `to`; rounding absorbs daylight-saving shifts. */
export function daysBetween(from: Date, to: Date): number {
  return Math.round((startOfDay(to).getTime() - startOfDay(from).getTime()) / MS_PER_DAY);
}

const RELATIVE_UNITS: readonly [Intl.RelativeTimeFormatUnit, number][] = [
  ['day', 86_400],
  ['hour', 3_600],
  ['minute', 60],
];

const relativeFormat = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });

export function formatTimeAgo(isoTimestamp: string, now = new Date()): string {
  const elapsedSeconds = (new Date(isoTimestamp).getTime() - now.getTime()) / 1000;
  for (const [unit, secondsInUnit] of RELATIVE_UNITS) {
    if (Math.abs(elapsedSeconds) >= secondsInUnit) {
      return relativeFormat.format(Math.trunc(elapsedSeconds / secondsInUnit), unit);
    }
  }
  return 'just now';
}
