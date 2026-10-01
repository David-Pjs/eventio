import type { Opportunity, OpportunityScope } from './types';
import { daysUntil } from './when';

export type Bucket = 'this-week' | 'next-week' | 'this-month' | 'later' | 'undated';
export type FocusLevel = 0 | 1 | 2 | 3;

export const BUCKET_LABEL: Record<Bucket, string> = {
  'this-week': 'This week',
  'next-week': 'Next week',
  'this-month': 'Within a month',
  later: 'Later',
  undated: 'Whenever',
};

const BUCKET_ORDER: Bucket[] = ['this-week', 'next-week', 'this-month', 'later', 'undated'];
const SCOPE_RANK: Record<OpportunityScope, number> = { nigeria: 0, africa: 1, global: 2 };

export const targetDate = (item: Opportunity): string | null => item.deadline ?? item.startsAt;

export function bucketOf(item: Opportunity, now: Date): Bucket {
  const target = targetDate(item);
  if (!target) return 'undated';
  const days = daysUntil(target, now);
  if (days <= 6) return 'this-week';
  if (days <= 13) return 'next-week';
  if (days <= 31) return 'this-month';
  return 'later';
}

export function focusLevel(item: Opportunity, now: Date): FocusLevel {
  const target = targetDate(item);
  if (!target) return 3;
  const days = daysUntil(target, now);
  if (days <= 3) return 0;
  if (days <= 7) return 1;
  if (days <= 31) return 2;
  return 3;
}

const dayKey = (iso: string | null): string => (iso ? iso.slice(0, 10) : '');

const chronological = (a: Opportunity, b: Opportunity): number => {
  const dayDiff = dayKey(targetDate(a)).localeCompare(dayKey(targetDate(b)));
  if (dayDiff !== 0) return dayDiff;
  return SCOPE_RANK[a.scope] - SCOPE_RANK[b.scope];
};

export function groupTimeline(
  items: readonly Opportunity[],
  now: Date,
): Array<{ bucket: Bucket; items: Opportunity[] }> {
  return BUCKET_ORDER.map((bucket) => ({
    bucket,
    items: items.filter((item) => bucketOf(item, now) === bucket).sort(chronological),
  })).filter((group) => group.items.length > 0);
}
