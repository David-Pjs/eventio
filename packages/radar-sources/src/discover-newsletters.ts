import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { fetchText } from './http';
import { isWorthFollowing, readFeedPosts, scoreFeed } from './newsletter-score';

const SEARCH_API = 'https://substack.com/api/v1/publication/search';
const OUTPUT_PATH = fileURLToPath(new URL('../config/newsletters.discovered.json', import.meta.url));
const QUERIES = [
  'hackathon', 'fellowship', 'opportunities', 'scholarships', 'grants', 'bounty', 'nigeria', 'lagos', 'africa',
  'funding', 'remote jobs', 'web3', 'accelerator', 'internship', 'competitions', 'call for applications',
  'funded', 'developer', 'startup', 'ai safety', 'events lagos', 'jobs africa', 'prizes', 'awards',
];
const PAGES_PER_QUERY = 2;
const WORKERS = 8;

interface SearchResult {
  name?: string;
  subdomain?: string;
  custom_domain?: string;
}

const baseUrlOf = (result: SearchResult): string | null =>
  result.custom_domain ? `https://${result.custom_domain}` : result.subdomain ? `https://${result.subdomain}.substack.com` : null;

async function searchQuery(query: string, page: number): Promise<Array<{ name: string; base: string }>> {
  const url = `${SEARCH_API}?query=${encodeURIComponent(query)}&page=${page}&includePlatformResults=false`;
  try {
    const { results = [] } = JSON.parse(await fetchText(url)) as { results?: SearchResult[] };
    return results.flatMap((result) => {
      const base = baseUrlOf(result);
      return base ? [{ name: result.name ?? base, base }] : [];
    });
  } catch {
    return [];
  }
}

async function inPool<T, R>(items: readonly T[], work: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = [];
  let cursor = 0;
  await Promise.all(
    Array.from({ length: WORKERS }, async () => {
      while (cursor < items.length) {
        const item = items[cursor++];
        results.push(await work(item));
      }
    }),
  );
  return results;
}

async function main() {
  const searches = QUERIES.flatMap((query) => Array.from({ length: PAGES_PER_QUERY }, (_, page) => ({ query, page })));
  const found = (await inPool(searches, ({ query, page }) => searchQuery(query, page))).flat();
  const unique = [...new Map(found.map((entry) => [entry.base, entry])).values()];
  console.log(`discovered ${unique.length} newsletters from ${searches.length} searches`);

  const now = new Date();
  const scored = await inPool(unique, async ({ name, base }) => {
    try {
      const posts = readFeedPosts(await fetchText(`${base}/feed`, 15_000));
      return { name, feed: `${base}/feed`, sample: posts.slice(0, 2).map((post) => post.title), ...scoreFeed(posts, now) };
    } catch {
      return null;
    }
  });

  const worthFollowing = scored
    .filter((entry): entry is NonNullable<typeof entry> => entry !== null && isWorthFollowing(entry))
    .sort((a, b) => b.opportunityRatio - a.opportunityRatio || a.ageDays - b.ageDays);

  await mkdir(dirname(OUTPUT_PATH), { recursive: true });
  await writeFile(OUTPUT_PATH, JSON.stringify({ generatedAt: now.toISOString(), newsletters: worthFollowing }, null, 2));
  console.log(`${worthFollowing.length} worth following. Wrote ${OUTPUT_PATH}`);
}

await main();
