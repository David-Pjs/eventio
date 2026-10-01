import { describe, expect, it } from 'vitest';

import type { Opportunity } from '../src/types';
import { describeWhen, urgencyOf } from '../src/when';

const NOW = new Date('2026-10-01T10:00:00.000Z');

const make = (overrides: Partial<Opportunity>): Opportunity => ({
  id: 'a',
  title: 'Thing',
  kind: 'event',
  scope: 'global',
  mode: 'online',
  startsAt: null,
  deadline: null,
  location: null,
  url: 'https://example.com/a',
  source: 'test',
  summary: null,
  image: null,
  tags: [],
  isFree: null,
  prize: null,
  ...overrides,
});

describe('describeWhen', () => {
  it('says closes today for a same-day deadline', () => {
    expect(describeWhen(make({ deadline: '2026-10-01T20:00:00.000Z' }), NOW)).toBe('Closes today');
  });

  it('counts the lagos day: 23:00 utc is already tomorrow in lagos', () => {
    expect(describeWhen(make({ deadline: '2026-10-01T23:00:00.000Z' }), NOW)).toBe('Closes tomorrow');
  });

  it('shows a late-night lagos event on the lagos weekday', () => {
    expect(describeWhen(make({ startsAt: '2026-10-02T23:30:00.000Z' }), NOW)).toBe('Sat, Oct 3');
  });

  it('says closes tomorrow', () => {
    expect(describeWhen(make({ deadline: '2026-10-02T12:00:00.000Z' }), NOW)).toBe('Closes tomorrow');
  });

  it('counts days for near deadlines', () => {
    expect(describeWhen(make({ deadline: '2026-10-08T10:00:00.000Z' }), NOW)).toBe('Closes in 7 days');
  });

  it('uses a calendar date for far deadlines', () => {
    expect(describeWhen(make({ deadline: '2026-12-25T00:00:00.000Z' }), NOW)).toBe('Closes Dec 25');
  });

  it('uses the start date for events without a deadline', () => {
    expect(describeWhen(make({ startsAt: '2026-10-03T12:00:00.000Z' }), NOW)).toBe('Sat, Oct 3');
  });

  it('falls back when there are no dates', () => {
    expect(describeWhen(make({}), NOW)).toBe('Dates on the site');
  });
});

describe('urgencyOf', () => {
  it('is hot within 3 days', () => {
    expect(urgencyOf(make({ deadline: '2026-10-03T10:00:00.000Z' }), NOW)).toBe('hot');
  });

  it('is soon within a week', () => {
    expect(urgencyOf(make({ deadline: '2026-10-07T10:00:00.000Z' }), NOW)).toBe('soon');
  });

  it('is later otherwise, and when undated', () => {
    expect(urgencyOf(make({ deadline: '2026-11-30T10:00:00.000Z' }), NOW)).toBe('later');
    expect(urgencyOf(make({}), NOW)).toBe('later');
  });
});
