import { mergeOpportunities } from './merge';
import type { CollectResult } from './resilient';
import type { Opportunity, SourceReport, SourceStatus } from './types';

export interface RadarSnapshot {
  generatedAt: string | null;
  sources: SourceReport[];
  items: Opportunity[];
}

export interface CollectorOutcome {
  name: string;
  sources: readonly string[];
  result: CollectResult;
}

const DAY_MS = 86_400_000;
const MAX_STALE_DAYS = 7;
const SUSPICIOUS_EMPTY_THRESHOLD = 3;
const COLLAPSE_MIN_PREVIOUS = 10;
const COLLAPSE_RATIO = 0.3;

const isCollapse = (freshCount: number, previousCount: number): boolean =>
  previousCount >= COLLAPSE_MIN_PREVIOUS && freshCount < previousCount * COLLAPSE_RATIO;

const statusOf = (result: CollectResult, previousCount: number): SourceStatus => {
  const isEmpty = result.items.length === 0;
  if (isEmpty && (result.failures.length > 0 || previousCount >= SUSPICIOUS_EMPTY_THRESHOLD)) return 'down';
  if (result.failures.length > 0 || isCollapse(result.items.length, previousCount)) return 'degraded';
  return 'ok';
};

const isExpired = (lastSuccessAt: string | null, now: Date): boolean =>
  lastSuccessAt !== null && now.getTime() - Date.parse(lastSuccessAt) > MAX_STALE_DAYS * DAY_MS;

export function reconcile(
  previous: RadarSnapshot,
  outcomes: readonly CollectorOutcome[],
  now: Date,
): { snapshot: RadarSnapshot; allDown: boolean } {
  const fresh: Opportunity[] = [];
  const carried: Opportunity[] = [];
  const sources: SourceReport[] = [];

  for (const outcome of outcomes) {
    const before = previous.sources.find((report) => report.name === outcome.name) ?? null;
    const earlier = previous.items.filter((item) => outcome.sources.includes(item.source));
    const { items, failures } = outcome.result;

    const status = statusOf(outcome.result, earlier.length);
    const lastSuccessAt = status === 'down' ? (before?.lastSuccessAt ?? null) : now.toISOString();
    const shouldCarry = status !== 'ok' && !isExpired(lastSuccessAt, now);

    const freshUrls = new Set(items.map((item) => item.url));
    const kept = shouldCarry ? earlier.filter((item) => !freshUrls.has(item.url)) : [];

    fresh.push(...items);
    carried.push(...kept);
    sources.push({
      name: outcome.name,
      status,
      count: items.length,
      carriedOver: kept.length,
      error: status === 'ok' ? null : (failures[0] ?? (items.length === 0 ? 'returned no items' : 'returned far fewer items than before')),
      lastSuccessAt,
      consecutiveFailures: status === 'ok' ? 0 : (before?.consecutiveFailures ?? 0) + 1,
    });
  }

  return {
    snapshot: {
      generatedAt: now.toISOString(),
      sources,
      items: mergeOpportunities([...fresh, ...carried], now),
    },
    allDown: sources.length > 0 && sources.every((source) => source.status === 'down'),
  };
}

const fingerprint = (snapshot: RadarSnapshot): string =>
  JSON.stringify({
    items: snapshot.items,
    sources: snapshot.sources.map(({ name, status, count, carriedOver }) => ({ name, status, count, carriedOver })),
  });

export const hasMeaningfulChange = (before: RadarSnapshot, after: RadarSnapshot): boolean =>
  fingerprint(before) !== fingerprint(after);
