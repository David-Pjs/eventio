import { describe, expect, it } from 'vitest';

import { bucketOf, focusLevel, groupTimeline } from '../src/timeline';
import type { Opportunity } from '../src/types';

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

describe('bucketOf', () => {
  it('puts today through day 6 in this week', () => {
    expect(bucketOf(make({ deadline: '2026-10-01T20:00:00.000Z' }), NOW)).toBe('this-week');
    expect(bucketOf(make({ deadline: '2026-10-07T20:00:00.000Z' }), NOW)).toBe('this-week');
  });

  it('puts day 7 through 13 in next week', () => {
    expect(bucketOf(make({ deadline: '2026-10-08T00:00:00.000Z' }), NOW)).toBe('next-week');
  });

  it('puts day 14 through 31 within a month', () => {
    expect(bucketOf(make({ startsAt: '2026-10-25T00:00:00.000Z' }), NOW)).toBe('this-month');
  });

  it('puts anything further out in later', () => {
    expect(bucketOf(make({ deadline: '2026-12-25T00:00:00.000Z' }), NOW)).toBe('later');
  });

  it('puts undated items in undated', () => {
    expect(bucketOf(make({}), NOW)).toBe('undated');
  });
});

describe('focusLevel', () => {
  it('is sharpest within 3 days and softest far out or undated', () => {
    expect(focusLevel(make({ deadline: '2026-10-03T00:00:00.000Z' }), NOW)).toBe(0);
    expect(focusLevel(make({ deadline: '2026-10-06T00:00:00.000Z' }), NOW)).toBe(1);
    expect(focusLevel(make({ deadline: '2026-10-20T00:00:00.000Z' }), NOW)).toBe(2);
    expect(focusLevel(make({ deadline: '2027-01-20T00:00:00.000Z' }), NOW)).toBe(3);
    expect(focusLevel(make({}), NOW)).toBe(3);
  });
});

describe('groupTimeline', () => {
  it('orders buckets in time and drops empty ones', () => {
    const groups = groupTimeline(
      [
        make({ url: 'https://e.com/later', deadline: '2026-12-25T00:00:00.000Z' }),
        make({ url: 'https://e.com/soon', deadline: '2026-10-02T00:00:00.000Z' }),
        make({ url: 'https://e.com/none' }),
      ],
      NOW,
    );
    expect(groups.map((group) => group.bucket)).toEqual(['this-week', 'later', 'undated']);
  });

  it('sorts by date inside a bucket, with nigeria first on the same day', () => {
    const groups = groupTimeline(
      [
        make({ url: 'https://e.com/3', deadline: '2026-10-05T00:00:00.000Z' }),
        make({ url: 'https://e.com/2', scope: 'global', deadline: '2026-10-03T00:00:00.000Z' }),
        make({ url: 'https://e.com/1', scope: 'nigeria', deadline: '2026-10-03T18:00:00.000Z' }),
      ],
      NOW,
    );
    expect(groups[0].items.map((item) => item.url)).toEqual(['https://e.com/1', 'https://e.com/2', 'https://e.com/3']);
  });
});
