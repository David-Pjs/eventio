import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { FEEDS, extractDeadline, parseOpportunityFeed } from '../src/rss';

const ofa = readFileSync(new URL('./fixtures/ofa.xml', import.meta.url), 'utf8');
const od = readFileSync(new URL('./fixtures/od.xml', import.meta.url), 'utf8');
const substack = readFileSync(new URL('./fixtures/substack-fyo.xml', import.meta.url), 'utf8');
const NOW = new Date('2026-10-01T00:00:00.000Z');

describe('extractDeadline', () => {
  it('reads "Application Deadline: October 12, 2026"', () => {
    expect(extractDeadline('Application Deadline: October 12, 2026 Apply now')).toBe(
      '2026-10-12T00:00:00.000Z',
    );
  });

  it('reads day-first dates', () => {
    expect(extractDeadline('Deadline: 5 November 2026')).toBe('2026-11-05T00:00:00.000Z');
  });

  it('reads phrasing like "Deadline is March 5, 2026" and "Deadline on 5 March 2026"', () => {
    expect(extractDeadline('The deadline is March 5, 2026 for all applicants')).toBe('2026-03-05T00:00:00.000Z');
    expect(extractDeadline('Deadline on 5 March 2026')).toBe('2026-03-05T00:00:00.000Z');
  });

  it('returns null when there is no deadline', () => {
    expect(extractDeadline('Applications are open all year')).toBeNull();
  });
});

describe('parseOpportunityFeed', () => {
  it('turns scholarship posts into scholarship opportunities with a deadline', () => {
    const items = parseOpportunityFeed(ofa, { source: 'opportunitiesforafricans', defaultScope: 'africa' });
    const rwanda = items.find((i) => i.title.includes('University of Rwanda'));
    expect(rwanda).toBeDefined();
    expect(rwanda?.kind).toBe('scholarship');
    expect(rwanda?.deadline).toBe('2026-10-12T00:00:00.000Z');
    expect(rwanda?.scope).toBe('africa');
    expect(rwanda?.url).toContain('opportunitiesforafricans.com');
  });

  it('drops blog posts that are not opportunities', () => {
    const items = parseOpportunityFeed(od, { source: 'opportunitydesk', defaultScope: 'global' });
    expect(items.some((i) => i.title.includes('Young Person of the Month'))).toBe(false);
  });

  it('strips html from summaries', () => {
    const items = parseOpportunityFeed(ofa, { source: 'opportunitiesforafricans', defaultScope: 'africa' });
    for (const item of items) {
      expect(item.summary ?? '').not.toMatch(/<[a-z]/i);
    }
  });

  it('returns an empty list for malformed xml', () => {
    expect(parseOpportunityFeed('not xml', { source: 'x', defaultScope: 'global' })).toEqual([]);
  });
});

describe('parseOpportunityFeed with newsletter options', () => {
  const config = { source: 'funded-youth', defaultScope: 'global' as const, maxAgeDays: 21 };

  it('drops posts older than the age limit', () => {
    const items = parseOpportunityFeed(substack, config, NOW);
    expect(items).toHaveLength(1);
    expect(items[0].title).toContain('NVIDIA');
  });

  it('classifies a fellowship announcement from its title', () => {
    const [first] = parseOpportunityFeed(substack, config, NOW);
    expect(first.kind).toBe('fellowship');
    expect(first.url).toContain('substack.com');
  });

  it('keeps only the newest posts up to maxPosts', () => {
    const items = parseOpportunityFeed(substack, { source: 'x', defaultScope: 'global', maxPosts: 2 }, NOW);
    expect(items).toHaveLength(2);
    expect(items[0].title).toContain('NVIDIA');
  });

  it('keeps old posts when no age limit is set', () => {
    const items = parseOpportunityFeed(substack, { source: 'x', defaultScope: 'global' }, NOW);
    expect(items.length).toBeGreaterThan(1);
  });

  it('falls back to the newsletter default kind when the title has no keyword', () => {
    const xml = substack.replace('NVIDIA’s 2027–2028 Graduate Fellowship Program', 'Weekly roundup').replace('Calls for applications', 'Weekly roundup');
    const withDefault = parseOpportunityFeed(xml, { ...config, defaultKind: 'job' }, NOW);
    expect(withDefault[0].kind).toBe('job');
    expect(parseOpportunityFeed(xml, config, NOW)).toEqual([]);
  });
});

describe('FEEDS', () => {
  it('has unique https urls', () => {
    const urls = FEEDS.map((feed) => feed.url);
    expect(new Set(urls).size).toBe(urls.length);
    expect(urls.every((url) => url.startsWith('https://'))).toBe(true);
  });

  it('includes the nigeria-specific category feed scoped to nigeria', () => {
    const feed = FEEDS.find((entry) => entry.url.includes('opportunitiesforafricans.com/category/nigeria/'));
    expect(feed?.defaultScope).toBe('nigeria');
  });

  it('includes category feeds beyond the latest ten posts', () => {
    expect(FEEDS.length).toBeGreaterThan(20);
  });
});
