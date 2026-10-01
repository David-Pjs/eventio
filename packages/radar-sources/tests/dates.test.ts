import { describe, expect, it } from 'vitest';

import { extractTitleDate, lagosDay, monthIndex } from '../src/dates';

describe('extractTitleDate', () => {
  it('reads a day range with month and year', () => {
    expect(extractTitleDate('Your Lagos Weekend Guide: 25–27 September 2026')).toBe('2026-09-25T00:00:00.000Z');
    expect(extractTitleDate('Guide 2-4 October 2026')).toBe('2026-10-02T00:00:00.000Z');
  });

  it('reads a single day with month first', () => {
    expect(extractTitleDate('Applications close October 12, 2026')).toBe('2026-10-12T00:00:00.000Z');
  });

  it('reads a single day with day first', () => {
    expect(extractTitleDate('Meetup on 5 November 2026')).toBe('2026-11-05T00:00:00.000Z');
  });

  it('returns null when there is no date', () => {
    expect(extractTitleDate('Roles in Africa')).toBeNull();
    expect(extractTitleDate('')).toBeNull();
  });

  it('does not mistake words that start with a month abbreviation for months', () => {
    expect(extractTitleDate('Top 5 Marketing Jobs 2026')).toBeNull();
    expect(extractTitleDate('10 Decoding 2026')).toBeNull();
  });

  it('accepts sept as an abbreviation', () => {
    expect(extractTitleDate('Guide 5 Sept 2026')).toBe('2026-09-05T00:00:00.000Z');
  });
});

describe('monthIndex', () => {
  it('accepts exact names and standard abbreviations only', () => {
    expect(monthIndex('Sep')).toBe(8);
    expect(monthIndex('SEPTEMBER')).toBe(8);
    expect(monthIndex('mar')).toBe(2);
    expect(monthIndex('Marketing')).toBe(-1);
  });
});

describe('lagosDay', () => {
  it('uses the Lagos calendar day, not the utc one', () => {
    expect(lagosDay('2026-10-14T23:30:00.000Z')).toBe('2026-10-15');
    expect(lagosDay('2026-10-15T08:00:00.000Z')).toBe('2026-10-15');
  });

  it('returns an empty string for missing or invalid input', () => {
    expect(lagosDay(null)).toBe('');
    expect(lagosDay('nope')).toBe('');
  });
});
