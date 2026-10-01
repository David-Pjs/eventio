import registry from '../config/newsletters.json';
import { extractTitleDate } from './dates';
import { fetchText } from './http';
import type { Task } from './resilient';
import { parseOpportunityFeed } from './rss';
import type { Opportunity, OpportunityKind, OpportunityScope } from './types';

const MAX_POST_AGE_DAYS = 21;

export interface Newsletter {
  source: string;
  name: string;
  feed: string;
  scope: OpportunityScope;
  defaultKind: OpportunityKind;
  city?: string;
  maxPosts: number;
}

export const NEWSLETTERS: readonly Newsletter[] = registry as Newsletter[];

export function parseNewsletter(xml: string, newsletter: Newsletter, now: Date): Opportunity[] {
  return parseOpportunityFeed(
    xml,
    {
      source: newsletter.source,
      defaultScope: newsletter.scope,
      defaultKind: newsletter.defaultKind,
      maxAgeDays: MAX_POST_AGE_DAYS,
      maxPosts: newsletter.maxPosts,
    },
    now,
  )
    .filter((item, index, all) => all.findIndex((other) => other.title === item.title) === index)
    .map((item) => ({
      ...item,
      city: newsletter.city ?? item.city,
      startsAt: item.kind === 'event' ? (extractTitleDate(item.title) ?? item.startsAt) : item.startsAt,
    }));
}

export const newsletterTasks = (): Task[] =>
  NEWSLETTERS.map((newsletter) => ({
    label: `newsletter ${newsletter.source}`,
    run: async () => {
      const xml = await fetchText(newsletter.feed);
      if (!/<item[\s>]/.test(xml)) throw new Error('response is not an rss feed');
      return parseNewsletter(xml, newsletter, new Date());
    },
  }));
