import { lagosDay } from './dates';
import type { Opportunity, OpportunityScope } from './types';

const SCOPE_ORDER: Record<OpportunityScope, number> = { nigeria: 0, africa: 1, global: 2 };

const MIN_CONTAINMENT_LENGTH = 12;

const relevantDate = (item: Opportunity): string | null => item.deadline ?? item.startsAt;
const targetDate = relevantDate;

const DAY_MS = 86_400_000;
const LAGOS_OFFSET_MS = 3_600_000;
const DATE_ONLY_SUFFIX = 'T00:00:00.000Z';
const DATE_ONLY_GRACE_MS = DAY_MS - LAGOS_OFFSET_MS;

const isUpcoming = (item: Opportunity, now: Date): boolean => {
  const date = relevantDate(item);
  if (date === null) return true;
  const graceMs = date.endsWith(DATE_ONLY_SUFFIX) ? DATE_ONLY_GRACE_MS : 0;
  return new Date(date).getTime() + graceMs >= now.getTime();
};

const byScopeThenDate = (a: Opportunity, b: Opportunity): number => {
  const scopeDiff = SCOPE_ORDER[a.scope] - SCOPE_ORDER[b.scope];
  if (scopeDiff !== 0) return scopeDiff;

  const dateA = relevantDate(a);
  const dateB = relevantDate(b);
  if (dateA === dateB) return 0;
  if (dateA === null) return 1;
  if (dateB === null) return -1;
  return dateA.localeCompare(dateB);
};

const normalizeTitle = (title: string): string =>
  title
    .toLowerCase()
    .replace(/^the\s+/, '')
    .replace(/[^a-z0-9]/g, '');

const dayOf = (item: Opportunity): string => lagosDay(targetDate(item));

const isSameEvent = (a: Opportunity, b: Opportunity): boolean => {
  const day = dayOf(a);
  if (day === '' || day !== dayOf(b)) return false;
  const titleA = normalizeTitle(a.title);
  const titleB = normalizeTitle(b.title);
  if (titleA === titleB) return true;
  const [shorter, longer] = titleA.length <= titleB.length ? [titleA, titleB] : [titleB, titleA];
  return shorter.length >= MIN_CONTAINMENT_LENGTH && longer.startsWith(shorter);
};

export const isHttpUrl = (value: string): boolean => {
  try {
    return ['http:', 'https:'].includes(new URL(value).protocol);
  } catch {
    return false;
  }
};

export function mergeOpportunities(items: readonly Opportunity[], now: Date): Opportunity[] {
  const seen = new Set<string>();
  const unique = items
    .filter((item) => isHttpUrl(item.url))
    .filter((item) => {
      if (seen.has(item.url)) return false;
      seen.add(item.url);
      return true;
    })
    .reduce<Opportunity[]>(
      (kept, item) => (kept.some((existing) => isSameEvent(existing, item)) ? kept : [...kept, item]),
      [],
    );

  return unique.filter((item) => isUpcoming(item, now)).sort(byScopeThenDate);
}
