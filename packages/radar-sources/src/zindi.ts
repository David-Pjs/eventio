import { fetchJson } from './http';
import type { Task } from './resilient';
import type { Opportunity } from './types';

const ZINDI_API = 'https://api.zindi.world/v1/competitions';
const PAGE_SIZE = 5;
const PAGES = 3;

interface ZindiCompetition {
  id: string;
  title: string;
  image?: string;
  open?: boolean;
  reward?: string | null;
  start_time?: string;
  end_time?: string;
  is_beginner_friendly?: boolean;
}

export function parseZindiResponse(body: unknown, now: Date): Opportunity[] {
  const competitions = (body as { data?: ZindiCompetition[] } | null)?.data;
  if (!Array.isArray(competitions)) return [];

  return competitions
    .filter((item) => item.open && item.end_time && Date.parse(item.end_time) >= now.getTime())
    .map((item) => ({
      id: `zindi-${item.id}`,
      title: item.title,
      kind: 'hackathon',
      scope: 'africa',
      mode: 'online',
      startsAt: item.start_time ?? null,
      deadline: item.end_time ?? null,
      location: 'Online',
      url: `https://zindi.africa/competitions/${item.id}`,
      source: 'zindi',
      summary: item.is_beginner_friendly ? 'Beginner friendly data science competition' : 'Data science competition',
      image: item.image ?? null,
      tags: ['data science', ...(item.is_beginner_friendly ? ['beginner friendly'] : [])],
      isFree: true,
      prize: item.reward?.replace(/\s+/g, ' ').trim() || null,
    }));
}

export const zindiTasks = (): Task[] =>
  Array.from({ length: PAGES }, (_, index) => ({
    label: `zindi page ${index + 1}`,
    run: async () => {
      const body = await fetchJson<unknown>(`${ZINDI_API}?page=${index + 1}&per_page=${PAGE_SIZE}`);
      if (!Array.isArray((body as { data?: unknown })?.data)) throw new Error('unexpected Zindi response shape');
      return parseZindiResponse(body, new Date());
    },
  }));
