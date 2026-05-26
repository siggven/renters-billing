import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  formatPeriodLabel,
  getCurrentPeriod,
  isValidPeriod,
  lastDayOfPeriod,
  periodCompare,
  shiftPeriod,
} from '../lib/period';

describe('isValidPeriod', () => {
  it.each(['2026-01', '1999-12', '2099-06'])('accepts %s', (p) => {
    expect(isValidPeriod(p)).toBe(true);
  });

  it.each(['', '2026', '2026-1', '2026-13', '2026-00', '2026-1-1', '26-01', 'abcd-ef'])(
    'rejects %s',
    (p) => {
      expect(isValidPeriod(p)).toBe(false);
    },
  );
});

describe('lastDayOfPeriod', () => {
  it.each([
    ['2026-01', '2026-01-31'],
    ['2026-02', '2026-02-28'], // not a leap year
    ['2024-02', '2024-02-29'], // leap year
    ['2026-04', '2026-04-30'],
    ['2026-12', '2026-12-31'],
  ])('lastDayOfPeriod(%s) = %s', (period, expected) => {
    expect(lastDayOfPeriod(period)).toBe(expected);
  });

  it('throws on an invalid period', () => {
    expect(() => lastDayOfPeriod('not-a-period')).toThrow(/invalid period/i);
  });
});

describe('periodCompare', () => {
  it('returns negative when a < b', () => {
    expect(periodCompare('2026-01', '2026-02')).toBeLessThan(0);
    expect(periodCompare('2025-12', '2026-01')).toBeLessThan(0);
  });

  it('returns positive when a > b', () => {
    expect(periodCompare('2026-02', '2026-01')).toBeGreaterThan(0);
    expect(periodCompare('2026-01', '2025-12')).toBeGreaterThan(0);
  });

  it('returns 0 when equal', () => {
    expect(periodCompare('2026-05', '2026-05')).toBe(0);
  });

  it('sorts an array correctly', () => {
    const arr = ['2026-12', '2025-01', '2026-05', '2025-12'];
    expect([...arr].sort(periodCompare)).toEqual([
      '2025-01',
      '2025-12',
      '2026-05',
      '2026-12',
    ]);
  });
});

describe('shiftPeriod', () => {
  it.each([
    ['2026-01', -1, '2025-12'],
    ['2026-01', 1, '2026-02'],
    ['2026-12', 1, '2027-01'],
    ['2026-05', 0, '2026-05'],
    ['2026-05', -3, '2026-02'],
    ['2026-05', 12, '2027-05'],
  ])('shiftPeriod(%s, %s) = %s', (period, delta, expected) => {
    expect(shiftPeriod(period, delta)).toBe(expected);
  });
});

describe('formatPeriodLabel', () => {
  it.each([
    ['2026-01', 'January 2026'],
    ['2026-05', 'May 2026'],
    ['2026-12', 'December 2026'],
  ])('formatPeriodLabel(%s) = %s', (period, expected) => {
    expect(formatPeriodLabel(period)).toBe(expected);
  });

  it('throws on an invalid period', () => {
    expect(() => formatPeriodLabel('garbage')).toThrow(/invalid period/i);
  });
});

describe('getCurrentPeriod', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns the current calendar month in 'YYYY-MM' format", () => {
    // Asia/Manila is UTC+8; pick a UTC time that crosses the date boundary
    // there to confirm we're respecting the project time zone.
    vi.useFakeTimers();
    // 2026-05-26T15:30:00Z = 2026-05-26 23:30 in Manila
    vi.setSystemTime(new Date('2026-05-26T15:30:00Z'));
    expect(getCurrentPeriod()).toBe('2026-05');
  });

  it('handles year-end correctly', () => {
    vi.useFakeTimers();
    // 2026-12-31T20:00:00Z = 2027-01-01 04:00 in Manila — already next year
    vi.setSystemTime(new Date('2026-12-31T20:00:00Z'));
    expect(getCurrentPeriod()).toBe('2027-01');
  });

  it('handles month-start in Manila that is still last month in UTC', () => {
    vi.useFakeTimers();
    // 2026-05-31T17:00:00Z = 2026-06-01 01:00 in Manila — June
    vi.setSystemTime(new Date('2026-05-31T17:00:00Z'));
    expect(getCurrentPeriod()).toBe('2026-06');
  });
});
