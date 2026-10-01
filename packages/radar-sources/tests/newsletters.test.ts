import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { isWorthFollowing, readFeedPosts, scoreFeed } from '../src/newsletter-score';
import { NEWSLETTERS, newsletterTasks, parseNewsletter } from '../src/newsletters';

const NOW = new Date('2026-10-01T00:00:00.000Z');
const fixture = readFileSync(new URL('./fixtures/substack-fyo.xml', import.meta.url), 'utf8');

describe('readFeedPosts', () => {
  it('extracts titles and dates from an rss feed', () => {
    const posts = readFeedPosts(fixture);
    expect(posts.length).toBeGreaterThan(1);
    expect(posts[0].title).toContain('NVIDIA');
    expect(posts[0].publishedAt).toBe('2026-09-30T20:44:19.000Z');
  });

  it('returns an empty list for garbage', () => {
    expect(readFeedPosts('nope')).toEqual([]);
  });
});

describe('scoreFeed', () => {
  it('measures freshness and opportunity density', () => {
    const score = scoreFeed(readFeedPosts(fixture), NOW);
    expect(score.ageDays).toBe(0);
    expect(score.total).toBeGreaterThan(1);
    expect(score.opportunityRatio).toBeGreaterThan(0.5);
  });

  it('flags a feed with no posts as stale', () => {
    expect(scoreFeed([], NOW).ageDays).toBe(Number.POSITIVE_INFINITY);
  });
});

describe('isWorthFollowing', () => {
  it('follows fresh feeds that are mostly opportunities', () => {
    expect(isWorthFollowing({ ageDays: 3, total: 20, opportunityRatio: 0.9 })).toBe(true);
  });

  it('skips stale feeds', () => {
    expect(isWorthFollowing({ ageDays: 90, total: 20, opportunityRatio: 0.9 })).toBe(false);
  });

  it('skips feeds that are rarely about opportunities', () => {
    expect(isWorthFollowing({ ageDays: 2, total: 20, opportunityRatio: 0.1 })).toBe(false);
  });

  it('skips feeds with too few posts to judge', () => {
    expect(isWorthFollowing({ ageDays: 2, total: 2, opportunityRatio: 1 })).toBe(false);
  });
});

describe('newsletter registry', () => {
  it('has well-formed entries', () => {
    expect(NEWSLETTERS.length).toBeGreaterThan(0);
    for (const entry of NEWSLETTERS) {
      expect(entry.feed.startsWith('https://')).toBe(true);
      expect(['nigeria', 'africa', 'global']).toContain(entry.scope);
      expect(entry.source).toMatch(/^[a-z0-9-]+$/);
    }
  });

  it('has unique sources', () => {
    const sources = NEWSLETTERS.map((entry) => entry.source);
    expect(new Set(sources).size).toBe(sources.length);
  });

  it('builds one task per newsletter', () => {
    expect(newsletterTasks()).toHaveLength(NEWSLETTERS.length);
  });
});

describe('parseNewsletter', () => {
  const base = { source: 'fyo', name: 'Funded Youth', feed: 'https://x.test/feed', scope: 'global' as const, defaultKind: 'fellowship' as const, maxPosts: 5 };

  it('applies the newsletter city to every item', () => {
    const items = parseNewsletter(fixture, { ...base, city: 'Lagos' }, NOW);
    expect(items.length).toBeGreaterThan(0);
    expect(items.every((item) => item.city === 'Lagos')).toBe(true);
  });

  it('drops posts older than three weeks', () => {
    expect(parseNewsletter(fixture, base, NOW)).toHaveLength(1);
  });
});

describe('parseNewsletter digests', () => {
  const entry = { source: 'jobs', name: 'Jobs', feed: 'https://x.test/feed', scope: 'africa' as const, defaultKind: 'job' as const, maxPosts: 5 };
  const feed = (titles: string[]) =>
    `<rss><channel>${titles
      .map((title, index) => `<item><title>${title}</title><link>https://x.test/p${index}</link><pubDate>Wed, ${30 - index} Sep 2026 10:00:00 GMT</pubDate></item>`)
      .join('')}</channel></rss>`;

  it('keeps only the newest post when a digest repeats the same title', () => {
    const items = parseNewsletter(feed(['Roles in Africa', 'Roles in Africa', 'Roles in Africa']), entry, NOW);
    expect(items).toHaveLength(1);
    expect(items[0].url).toBe('https://x.test/p0');
  });

  it('keeps posts with different titles', () => {
    expect(parseNewsletter(feed(['Roles in Africa', 'Senior roles in Africa']), entry, NOW)).toHaveLength(2);
  });

  it('uses the date in an event title as the start date and drops past guides', () => {
    const events = { ...entry, defaultKind: 'event' as const };
    const items = parseNewsletter(feed(['Weekend Guide: 2-4 October 2026', 'Weekend Guide: 25-27 September 2026']), events, NOW);
    expect(items.map((item) => item.startsAt)).toEqual(['2026-10-02T00:00:00.000Z', '2026-09-25T00:00:00.000Z']);
  });
});
