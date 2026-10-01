import { describe, expect, it } from 'vitest';

import { mergeOpportunities } from '../src/merge';
import type { Opportunity } from '../src/types';

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

const NOW = new Date('2026-10-01T00:00:00.000Z');

describe('mergeOpportunities', () => {
  it('removes duplicates by url, keeping the first', () => {
    const result = mergeOpportunities([make({ id: 'a' }), make({ id: 'b', title: 'Dup' })], NOW);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('a');
  });

  it('drops items whose deadline has passed', () => {
    const past = make({ url: 'https://example.com/p', deadline: '2026-09-01T00:00:00.000Z' });
    expect(mergeOpportunities([past], NOW)).toEqual([]);
  });

  it('drops events that already started when they have no deadline', () => {
    const started = make({ url: 'https://example.com/s', startsAt: '2026-09-20T00:00:00.000Z' });
    expect(mergeOpportunities([started], NOW)).toEqual([]);
  });

  it('keeps items with no dates', () => {
    expect(mergeOpportunities([make({})], NOW)).toHaveLength(1);
  });

  it('puts nigeria first, then africa, then global, and soonest first within a scope', () => {
    const items = [
      make({ url: 'https://e.com/1', scope: 'global', deadline: '2026-10-05T00:00:00.000Z' }),
      make({ url: 'https://e.com/2', scope: 'nigeria', deadline: '2026-10-20T00:00:00.000Z' }),
      make({ url: 'https://e.com/3', scope: 'nigeria', deadline: '2026-10-10T00:00:00.000Z' }),
      make({ url: 'https://e.com/4', scope: 'africa', deadline: '2026-10-02T00:00:00.000Z' }),
    ];
    expect(mergeOpportunities(items, NOW).map((i) => i.url)).toEqual([
      'https://e.com/3',
      'https://e.com/2',
      'https://e.com/4',
      'https://e.com/1',
    ]);
  });

  it('does not mutate its input', () => {
    const input = [make({ url: 'https://e.com/x' }), make({ url: 'https://e.com/y' })];
    const snapshot = [...input];
    mergeOpportunities(input, NOW);
    expect(input).toEqual(snapshot);
  });

  it('merges the same event listed on two sources, keeping the first', () => {
    const luma = make({ id: 'l', url: 'https://luma.com/x', source: 'luma', title: 'NIGERIA GREENTECH ROUNDTABLE', startsAt: '2026-10-15T08:00:00.000Z' });
    const eventbrite = make({ id: 'e', url: 'https://eventbrite.com/y-123456', source: 'eventbrite', title: 'THE NIGERIA GREENTECH ROUNDTABLE  2.0', startsAt: '2026-10-15T00:00:00.000Z' });
    const result = mergeOpportunities([luma, eventbrite], NOW);
    expect(result).toHaveLength(1);
    expect(result[0].source).toBe('luma');
  });

  it('keeps events with similar names on different days', () => {
    const a = make({ url: 'https://e.com/a', title: 'Lagos AI Meetup', startsAt: '2026-10-15T08:00:00.000Z' });
    const b = make({ url: 'https://e.com/b', title: 'Lagos AI Meetup', startsAt: '2026-11-15T08:00:00.000Z' });
    expect(mergeOpportunities([a, b], NOW)).toHaveLength(2);
  });

  it('does not merge short unrelated titles that merely overlap', () => {
    const a = make({ url: 'https://e.com/a', title: 'AI Summit', startsAt: '2026-10-15T08:00:00.000Z' });
    const b = make({ url: 'https://e.com/b', title: 'AI Summit for Healthcare Workers in Abuja', startsAt: '2026-10-15T08:00:00.000Z' });
    expect(mergeOpportunities([a, b], NOW)).toHaveLength(2);
  });

  it('drops items whose link is not a plain http(s) url', () => {
    const bad = ['javascript:alert(1)', 'data:text/html,hi', 'ftp://x.test/a', 'not a url', '//evil.test/x'];
    const items = [...bad.map((url, index) => make({ id: `b${index}`, url })), make({ id: 'ok', url: 'https://ok.test/a' })];
    expect(mergeOpportunities(items, NOW).map((item) => item.id)).toEqual(['ok']);
  });

  it('keeps a date-only deadline alive for the whole of that day', () => {
    const today = make({ url: 'https://e.com/today', deadline: '2026-10-01T00:00:00.000Z' });
    expect(mergeOpportunities([today], NOW)).toHaveLength(1);
  });

  it('drops a date-only deadline once the next day has started', () => {
    const yesterday = make({ url: 'https://e.com/yesterday', deadline: '2026-09-30T00:00:00.000Z' });
    expect(mergeOpportunities([yesterday], NOW)).toHaveLength(0);
  });

  it('merges one event reported on different utc days but the same lagos day', () => {
    const late = make({ id: 'l', url: 'https://e.com/late', source: 'luma', title: 'Abuja AI Forum 2026', startsAt: '2026-10-14T23:30:00.000Z' });
    const dateOnly = make({ id: 'd', url: 'https://eb.com/x-123456', source: 'eventbrite', title: 'Abuja AI Forum 2026', startsAt: '2026-10-15T00:00:00.000Z' });
    expect(mergeOpportunities([late, dateOnly], NOW)).toHaveLength(1);
  });
});
