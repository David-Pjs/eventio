import type { Opportunity } from './types';

const DAY_MS = 86_400_000;
const HOT_DAYS = 3;
const SOON_DAYS = 7;
const NEAR_DAYS = 30;

export type Urgency = 'hot' | 'soon' | 'later';

const LAGOS_OFFSET_MS = 3_600_000;

const dayIndex = (time: number): number => Math.floor((time + LAGOS_OFFSET_MS) / DAY_MS);

export const daysUntil = (iso: string, now: Date): number =>
  dayIndex(new Date(iso).getTime()) - dayIndex(now.getTime());

const formatDate = (iso: string, options: Intl.DateTimeFormatOptions): string =>
  new Intl.DateTimeFormat('en-US', { timeZone: 'Africa/Lagos', ...options }).format(new Date(iso));

export function describeWhen(item: Opportunity, now: Date): string {
  if (item.deadline) {
    const days = daysUntil(item.deadline, now);
    if (days <= 0) return 'Closes today';
    if (days === 1) return 'Closes tomorrow';
    if (days <= NEAR_DAYS) return `Closes in ${days} days`;
    return `Closes ${formatDate(item.deadline, { month: 'short', day: 'numeric' })}`;
  }

  if (item.startsAt) {
    return formatDate(item.startsAt, { weekday: 'short', month: 'short', day: 'numeric' });
  }

  return 'Dates on the site';
}

export function urgencyOf(item: Opportunity, now: Date): Urgency {
  const target = item.deadline ?? item.startsAt;
  if (!target) return 'later';
  const days = daysUntil(target, now);
  if (days <= HOT_DAYS) return 'hot';
  if (days <= SOON_DAYS) return 'soon';
  return 'later';
}
