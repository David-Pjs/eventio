import { fetchJson } from './http';
import type { Task } from './resilient';
import type { Opportunity } from './types';

const HACKCLUB_API = 'https://hackathons.hackclub.com/api/events/upcoming';

interface HackClubEvent {
  id?: string;
  name?: string;
  website?: string;
  start?: string;
  end?: string;
  logo?: string;
  banner?: string;
  virtual?: boolean;
  mlhAssociated?: boolean;
  hack_club_event?: boolean;
}

const toIso = (value: string | undefined): string | null => {
  const time = Date.parse(value ?? '');
  return Number.isNaN(time) ? null : new Date(time).toISOString();
};

export function parseHackClubEvents(body: unknown): Opportunity[] {
  if (!Array.isArray(body)) return [];

  return (body as HackClubEvent[])
    .filter((event) => event.virtual && event.id && event.name && event.website?.startsWith('https://'))
    .map((event) => ({
      id: `hackclub-${event.id}`,
      title: event.name as string,
      kind: 'hackathon',
      scope: 'global',
      mode: 'online',
      startsAt: toIso(event.start),
      deadline: null,
      location: 'Online',
      url: event.website as string,
      source: 'hackclub',
      summary: 'Online hackathon for students and teens',
      image: event.banner ?? event.logo ?? null,
      tags: ['student', ...(event.hack_club_event ? ['hack club'] : []), ...(event.mlhAssociated ? ['mlh'] : [])],
      isFree: true,
      prize: null,
    }));
}

export const hackClubTasks = (): Task[] => [
  {
    label: 'hack club upcoming hackathons',
    run: async () => {
      const body = await fetchJson<unknown>(HACKCLUB_API);
      if (!Array.isArray(body)) throw new Error('unexpected Hack Club response shape');
      return parseHackClubEvents(body);
    },
  },
];
