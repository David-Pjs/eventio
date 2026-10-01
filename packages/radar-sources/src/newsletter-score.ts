import { XMLParser } from 'fast-xml-parser';

const DAY_MS = 86_400_000;
const MAX_AGE_DAYS = 30;
const MIN_POSTS = 5;
const MIN_OPPORTUNITY_RATIO = 0.4;

const OPPORTUNITY_PATTERN =
  /hackathon|fellowship|scholarship|grant|bounty|apply|application|deadline|opportunit|competition|funding|funded|internship|call for|roles|\bjobs?\b|hiring|vacanc|prize|award|accelerator|\bevents?\b|weekend guide/i;

export interface FeedPost {
  title: string;
  publishedAt: string | null;
}

export interface FeedScore {
  ageDays: number;
  total: number;
  opportunityRatio: number;
}

const asArray = <T>(value: T | T[] | undefined): T[] =>
  value === undefined ? [] : Array.isArray(value) ? value : [value];

export function readFeedPosts(xml: string): FeedPost[] {
  try {
    const items = asArray(new XMLParser().parse(xml)?.rss?.channel?.item) as Array<Record<string, unknown>>;
    return items.map((item) => {
      const published = Date.parse(String(item.pubDate ?? ''));
      return {
        title: String(item.title ?? ''),
        publishedAt: Number.isNaN(published) ? null : new Date(published).toISOString(),
      };
    });
  } catch {
    return [];
  }
}

export function scoreFeed(posts: readonly FeedPost[], now: Date): FeedScore {
  const newest = posts
    .map((post) => (post.publishedAt ? Date.parse(post.publishedAt) : Number.NaN))
    .filter((time) => !Number.isNaN(time))
    .sort((a, b) => b - a)[0];

  const matching = posts.filter((post) => OPPORTUNITY_PATTERN.test(post.title)).length;

  return {
    ageDays: newest === undefined ? Number.POSITIVE_INFINITY : Math.floor((now.getTime() - newest) / DAY_MS),
    total: posts.length,
    opportunityRatio: posts.length === 0 ? 0 : matching / posts.length,
  };
}

export const isWorthFollowing = (score: FeedScore): boolean =>
  score.ageDays <= MAX_AGE_DAYS && score.total >= MIN_POSTS && score.opportunityRatio >= MIN_OPPORTUNITY_RATIO;
