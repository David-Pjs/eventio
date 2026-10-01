import { XMLParser } from 'fast-xml-parser';

import { monthIndex, utcDate } from './dates';
import { fetchText } from './http';
import type { Task } from './resilient';
import type { Opportunity, OpportunityKind, OpportunityScope } from './types';

const SUMMARY_LENGTH = 240;
const DAY_MS = 86_400_000;

const LEAD = String.raw`deadline(?:\s+(?:is|on|by))?[^A-Za-z0-9]{0,6}`;
const MONTH_FIRST = new RegExp(LEAD + String.raw`([A-Za-z]{3,9})\.?\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(\d{4})`, 'i');
const DAY_FIRST = new RegExp(LEAD + String.raw`(\d{1,2})(?:st|nd|rd|th)?\s+([A-Za-z]{3,9})\.?,?\s+(\d{4})`, 'i');

const KIND_RULES: ReadonlyArray<[RegExp, OpportunityKind]> = [
  [/scholar/i, 'scholarship'],
  [/fellow/i, 'fellowship'],
  [/hackathon/i, 'hackathon'],
  [/grant|funding|\bfund\b|prize|award|competition|contest|challenge/i, 'grant'],
  [/intern|\bjobs?\b|vacanc|recruit|career|hiring/i, 'job'],
];

const stripHtml = (value: string) =>
  value
    .replace(/<[^>]*>/g, ' ')
    .replace(/&#8230;|&hellip;/g, '…')
    .replace(/&amp;/g, '&')
    .replace(/&#8217;|&rsquo;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();

export function extractDeadline(text: string): string | null {
  const monthFirst = MONTH_FIRST.exec(text);
  if (monthFirst) {
    return utcDate(Number(monthFirst[3]), monthIndex(monthFirst[1]), Number(monthFirst[2]));
  }
  const dayFirst = DAY_FIRST.exec(text);
  if (dayFirst) {
    return utcDate(Number(dayFirst[3]), monthIndex(dayFirst[2]), Number(dayFirst[1]));
  }
  return null;
}

const classify = (text: string): OpportunityKind | null =>
  KIND_RULES.find(([pattern]) => pattern.test(text))?.[1] ?? null;

const pickScope = (text: string, fallback: OpportunityScope): OpportunityScope => {
  if (/nigeria/i.test(text)) return 'nigeria';
  if (/africa/i.test(text)) return 'africa';
  return fallback;
};

const asArray = <T>(value: T | T[] | undefined): T[] =>
  value === undefined ? [] : Array.isArray(value) ? value : [value];

export interface FeedConfig {
  source: string;
  defaultScope: OpportunityScope;
  defaultKind?: OpportunityKind;
  maxAgeDays?: number;
  maxPosts?: number;
}

const isTooOld = (pubDate: unknown, maxAgeDays: number | undefined, now: Date): boolean => {
  if (maxAgeDays === undefined) return false;
  const published = Date.parse(String(pubDate ?? ''));
  return Number.isNaN(published) || now.getTime() - published > maxAgeDays * DAY_MS;
};

export function parseOpportunityFeed(xml: string, config: FeedConfig, now: Date = new Date()): Opportunity[] {
  let rawItems: Array<Record<string, unknown>>;
  try {
    const parsed = new XMLParser({ processEntities: true }).parse(xml);
    rawItems = asArray(parsed?.rss?.channel?.item);
  } catch {
    return [];
  }

  const parsed = rawItems.flatMap((item) => {
    const title = stripHtml(String(item.title ?? ''));
    const url = String(item.link ?? '');
    const categories = asArray(item.category as string | string[]).map(String);
    if (!title || !url || categories.includes('Our Blog')) return [];

    const description = String(item.description ?? '');
    const searchable = `${title} ${categories.join(' ')}`;
    const kind = classify(searchable) ?? config.defaultKind ?? null;
    if (!kind || isTooOld(item.pubDate, config.maxAgeDays, now)) return [];

    return [
      {
        id: `${config.source}-${url}`,
        title,
        kind,
        scope: pickScope(searchable, config.defaultScope),
        mode: 'unknown',
        startsAt: null,
        deadline: extractDeadline(stripHtml(description)),
        location: null,
        url,
        source: config.source,
        summary: stripHtml(description).slice(0, SUMMARY_LENGTH) || null,
        image: null,
        tags: categories.slice(0, 4),
        isFree: null,
        prize: null,
      } satisfies Opportunity,
    ];
  });

  return config.maxPosts === undefined ? parsed : parsed.slice(0, config.maxPosts);
}

interface FeedSource extends FeedConfig {
  url: string;
}

const categoryFeeds = (
  source: string,
  origin: string,
  categories: readonly string[],
  defaultScope: OpportunityScope,
): FeedSource[] =>
  categories.map((category) => ({ source, defaultScope, url: `${origin}/category/${category}/feed/` }));

export const FEEDS: readonly FeedSource[] = [
  { source: 'opportunitiesforafricans', defaultScope: 'africa', url: 'https://www.opportunitiesforafricans.com/feed/' },
  ...categoryFeeds(
    'opportunitiesforafricans',
    'https://www.opportunitiesforafricans.com',
    ['fellowships', 'grants', 'jobs', 'scholarships', 'internships', 'call-for-applications', 'entrepreneurship', 'awards', 'contests'],
    'africa',
  ),
  ...categoryFeeds('opportunitiesforafricans', 'https://www.opportunitiesforafricans.com', ['nigeria'], 'nigeria'),
  { source: 'opportunitydesk', defaultScope: 'global', url: 'https://opportunitydesk.org/feed/' },
  ...categoryFeeds('opportunitydesk', 'https://opportunitydesk.org', ['fellowships', 'grants', 'internships', 'training', 'contests'], 'global'),
  ...categoryFeeds('opportunitydesk', 'https://opportunitydesk.org', ['africa'], 'africa'),
  { source: 'fundsforngos', defaultScope: 'global', url: 'https://www2.fundsforngos.org/feed/' },
  { source: 'opportunitiescorners', defaultScope: 'global', url: 'https://opportunitiescorners.com/feed/' },
  { source: 'opportunitiesforyouth', defaultScope: 'global', url: 'https://www.opportunitiesforyouth.org/feed/' },
  ...categoryFeeds('opportunitiesforyouth', 'https://www.opportunitiesforyouth.org', ['grants', 'jobs', 'scholarships', 'conferences', 'awards', 'training'], 'global'),
  ...categoryFeeds('opportunitiesforyouth', 'https://www.opportunitiesforyouth.org', ['africa'], 'africa'),
];

export const feedTasks = (): Task[] =>
  FEEDS.map((feed) => ({
    label: `feed ${feed.url}`,
    run: async () => {
      const xml = await fetchText(feed.url);
      if (!/<item[\s>]/.test(xml)) throw new Error('response is not an rss feed');
      return parseOpportunityFeed(xml, feed);
    },
  }));
