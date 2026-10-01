import { fetchJson } from './http';
import type { Task } from './resilient';
import type { Opportunity } from './types';

const EARN_API = 'https://superteam.fun/api/listings?take=100';
const EARN_LISTING_URL = 'https://superteam.fun/earn/listing';
const HACKATHON_PATTERN = /hackathon|hack\s?day|buildathon/i;

interface EarnListing {
  id: string;
  title: string;
  slug: string;
  status?: string;
  deadline?: string | null;
  rewardAmount?: number | null;
  token?: string | null;
  sponsor?: { name?: string; slug?: string; logo?: string };
}

const formatPrize = (amount: number | null | undefined, token: string | null | undefined): string | null =>
  amount ? `$${amount.toLocaleString('en-US')}${token ? ` ${token}` : ''}` : null;

export function parseEarnResponse(body: unknown): Opportunity[] {
  if (!Array.isArray(body)) return [];

  return (body as EarnListing[])
    .filter((item) => item.id && item.slug && item.title && item.status === 'OPEN')
    .map((item) => {
      const mentionsNigeria = /nigeria/i.test(`${item.title} ${item.sponsor?.name ?? ''} ${item.sponsor?.slug ?? ''}`);
      return {
        id: `earn-${item.id}`,
        title: item.title,
        kind: HACKATHON_PATTERN.test(item.title) ? 'hackathon' : 'grant',
        scope: mentionsNigeria ? 'nigeria' : 'global',
        mode: 'online',
        startsAt: null,
        deadline: item.deadline ?? null,
        location: 'Online',
        url: `${EARN_LISTING_URL}/${item.slug}`,
        source: 'superteam-earn',
        summary: item.sponsor?.name ? `By ${item.sponsor.name}` : null,
        image: item.sponsor?.logo ?? null,
        tags: ['bounty'],
        isFree: true,
        prize: formatPrize(item.rewardAmount, item.token),
      } satisfies Opportunity;
    });
}

export const earnTasks = (): Task[] => [
  {
    label: 'superteam earn listings',
    run: async () => {
      const body = await fetchJson<unknown>(EARN_API);
      if (!Array.isArray(body)) throw new Error('unexpected Superteam Earn response shape');
      return parseEarnResponse(body);
    },
  },
];
