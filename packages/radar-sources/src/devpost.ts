import { detectNigerianCity } from './cities';
import { monthIndex, utcDate } from './dates';
import { fetchJson } from './http';
import type { Task } from './resilient';
import type { Opportunity } from './types';

const DEVPOST_API = 'https://devpost.com/api/hackathons';
const PAGE_SIZE = 50;
export const LOCAL_SEARCH_TERMS = ['nigeria', 'lagos', 'abuja', 'port harcourt', 'ibadan', 'uyo'];
const MAX_PAGES = 3;
const DATE_RANGE = /^([A-Za-z]{3}) (\d{1,2})(?:, (\d{4}))? - (?:([A-Za-z]{3}) )?(\d{1,2}), (\d{4})$/;

interface DevpostHackathon {
  id: number;
  title: string;
  url: string;
  invite_only?: boolean;
  thumbnail_url?: string;
  organization_name?: string;
  submission_period_dates?: string;
  prize_amount?: string;
  displayed_location?: { location?: string };
  themes?: Array<{ name: string }>;
}

interface DevpostResponse {
  hackathons?: DevpostHackathon[];
  meta?: { total_count?: number };
}

export function parseDevpostDates(text: string): { start: string; end: string } | null {
  const match = DATE_RANGE.exec(text.trim());
  if (!match) return null;

  const [, startMonthName, startDay, startYearText, endMonthName, endDay, endYearText] = match;
  const endYear = Number(endYearText);
  const startMonth = monthIndex(startMonthName);
  const endMonth = endMonthName ? monthIndex(endMonthName) : startMonth;
  const startYear = startYearText
    ? Number(startYearText)
    : startMonth > endMonth
      ? endYear - 1
      : endYear;

  const start = utcDate(startYear, startMonth, Number(startDay));
  const end = utcDate(endYear, endMonth, Number(endDay));
  return start && end ? { start, end } : null;
}

const absoluteImage = (url: string | undefined): string | null => {
  if (!url) return null;
  return url.startsWith('//') ? `https:${url}` : url;
};

const stripTags = (value: string) => value.replace(/<[^>]*>/g, '').trim();

export function parseDevpostResponse(body: unknown): Opportunity[] {
  const hackathons = (body as DevpostResponse)?.hackathons;
  if (!Array.isArray(hackathons)) return [];

  return hackathons
    .filter((item) => !item.invite_only)
    .map((item) => {
      const dates = item.submission_period_dates ? parseDevpostDates(item.submission_period_dates) : null;
      const location = item.displayed_location?.location ?? null;
      const prize = item.prize_amount ? stripTags(item.prize_amount) : '';
      const city = location ? detectNigerianCity(location) : null;
      const isNigerian = city !== null || (location ? /nigeria/i.test(location) : false);

      return {
        id: `devpost-${item.id}`,
        title: item.title,
        kind: 'hackathon',
        scope: isNigerian ? 'nigeria' : 'global',
        city,
        mode: location && /online/i.test(location) ? 'online' : 'in-person',
        startsAt: dates?.start ?? null,
        deadline: dates?.end ?? null,
        location,
        url: item.url,
        source: 'devpost',
        summary: item.organization_name ? `By ${item.organization_name}` : null,
        image: absoluteImage(item.thumbnail_url),
        tags: (item.themes ?? []).map((theme) => theme.name),
        isFree: true,
        prize: prize || null,
      } satisfies Opportunity;
    });
}

const listUrl = (filters: string, page: number) =>
  `${DEVPOST_API}?${filters}&status[]=upcoming&status[]=open&order_by=deadline&per_page=${PAGE_SIZE}&page=${page}`;

async function collectPaged(filters: string): Promise<Opportunity[]> {
  const collected: Opportunity[] = [];

  for (let page = 1; page <= MAX_PAGES; page += 1) {
    const body = await fetchJson<DevpostResponse>(listUrl(filters, page));
    if (!Array.isArray(body?.hackathons)) throw new Error('unexpected Devpost response shape');
    const items = parseDevpostResponse(body);
    collected.push(...items);

    const total = body.meta?.total_count ?? 0;
    if (items.length === 0 || page * PAGE_SIZE >= total) break;
  }

  return collected;
}

export const devpostTasks = (): Task[] => [
  { label: 'devpost online', run: () => collectPaged('challenge_type[]=online') },
  ...LOCAL_SEARCH_TERMS.map((term) => ({
    label: `devpost search ${term}`,
    run: async () =>
      (await collectPaged(`search=${encodeURIComponent(term)}`)).filter((item) => item.scope === 'nigeria'),
  })),
];
