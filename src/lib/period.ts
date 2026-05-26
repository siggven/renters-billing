/**
 * Period helpers — pure functions that work in 'YYYY-MM' string space.
 *
 * Why string-based? The Postgres schema stores `period` as text 'YYYY-MM' (with
 * a regex CHECK), so working in that representation everywhere avoids JS Date
 * pitfalls (timezone offsets shifting the day, month-zero-indexed, etc.). All
 * date arithmetic is done with explicit construction in UTC and then formatted
 * back to a string.
 *
 * Time zone (TC-9): "current period" is the calendar month in Asia/Manila
 * (UTC+8). All other helpers are timezone-agnostic.
 *
 * SPEC: docs/SPEC.md FR-11..FR-15
 */

const PERIOD_RE = /^\d{4}-(0[1-9]|1[0-2])$/;
const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const;

/** True if `s` matches 'YYYY-MM' with a real month (01..12). */
export function isValidPeriod(s: string): boolean {
  return PERIOD_RE.test(s);
}

function parsePeriod(period: string): { year: number; month: number } {
  if (!isValidPeriod(period)) {
    throw new Error(`Invalid period: ${period}`);
  }
  const [y, m] = period.split('-');
  return { year: Number(y), month: Number(m) };
}

function formatPeriod(year: number, month: number): string {
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}`;
}

/**
 * Returns the last calendar day of `period` as 'YYYY-MM-DD'.
 * Uses the JS trick `new Date(year, month, 0)` — passing day=0 returns the
 * previous month's last day, so passing the *next* month with day=0 returns
 * the current month's last day. We construct in UTC to avoid TZ shifts.
 */
export function lastDayOfPeriod(period: string): string {
  const { year, month } = parsePeriod(period);
  // Day 0 of next month = last day of this month
  const d = new Date(Date.UTC(year, month, 0));
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(d.getUTCDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/** Lexical compare works for 'YYYY-MM' strings too, but be explicit. */
export function periodCompare(a: string, b: string): number {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

/** Add `delta` months to `period`. Negative delta moves backwards. */
export function shiftPeriod(period: string, delta: number): string {
  const { year, month } = parsePeriod(period);
  // month is 1..12; convert to 0..11 for math, then back
  const total = year * 12 + (month - 1) + delta;
  const newYear = Math.floor(total / 12);
  const newMonth = (total % 12) + 1;
  return formatPeriod(newYear, newMonth);
}

/** Human-readable label, e.g. 'May 2026'. */
export function formatPeriodLabel(period: string): string {
  const { year, month } = parsePeriod(period);
  return `${MONTH_NAMES[month - 1]} ${year}`;
}

/**
 * The current period in Asia/Manila. Computed via Intl.DateTimeFormat so we
 * don't depend on the host's local time zone — the user might be on a laptop
 * set to a different zone, but the property is in the Philippines and the
 * billing month tracks the local calendar there.
 */
export function getCurrentPeriod(now: Date = new Date()): string {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Manila',
    year: 'numeric',
    month: '2-digit',
  });
  // en-CA gives 'YYYY-MM' directly when only year+month are requested
  const parts = fmt.formatToParts(now);
  const yyyy = parts.find((p) => p.type === 'year')?.value ?? '0000';
  const mm = parts.find((p) => p.type === 'month')?.value ?? '01';
  return `${yyyy}-${mm}`;
}
