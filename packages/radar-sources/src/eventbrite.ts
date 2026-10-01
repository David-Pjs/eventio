import { detectNigerianCity } from './cities';
import { fetchText } from './http';
import type { Task } from './resilient';
import type { Opportunity } from './types';

const EVENTBRITE_ORIGIN = 'https://www.eventbrite.com/d';
const CITY_SLUGS = ['lagos', 'abuja', 'port-harcourt', 'ibadan', 'uyo'];
const SEARCH_TERMS = ['tech', 'developer'];
const SUMMARY_LENGTH = 220;

const LD_JSON_PATTERN = /<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g;
const TICKET_ID_PATTERN = /-(\d{6,})(?:[/?#]|$)/;
const HACKATHON_PATTERN = /hackathon|hack\s?day|buildathon/i;
const JOB_PATTERN = /join our team|we are hiring|we're hiring|now hiring|vacanc|recruit/i;

const RELEVANT_PATTERN =
  /tech|developer|software|hack|start-?up|\bai\b|artificial intelligence|machine learning|innovation|digital|\bdata\b|cyber|blockchain|web3|crypto|fintech|engineer|coding|programming|career|\bjobs?\b|fellowship|grant|scholarship|funding|training|workshop|bootcamp|entrepreneur|business|finance|masterclass/i;

const EXCLUDED_PATTERN =
  /church|crusade|convention|worship|wedding|reunion|anniversary|birthday|movie|concert|party|prayer|revival|thanksgiving|gospel|praise|ministers|impartation|prophet|apostle|pastor|rev|deliverance|fasting|music|photo|fashion|beauty|comedy|festival|dating|independence day|afroculture/i;

const REGION_CODE_TO_CITY: Record<string, string> = {
  LA: 'Lagos',
  FC: 'Abuja',
  RI: 'Port Harcourt',
  OY: 'Ibadan',
  AK: 'Uyo',
};

interface LdEvent {
  name?: string;
  description?: string;
  url?: string;
  image?: string;
  startDate?: string;
  eventAttendanceMode?: string;
  location?: {
    name?: string;
    address?: {
      addressCountry?: string;
      addressLocality?: string;
      addressRegion?: string;
      streetAddress?: string;
    };
  };
}

export const kindOf = (title: string): Opportunity['kind'] => {
  if (HACKATHON_PATTERN.test(title)) return 'hackathon';
  if (JOB_PATTERN.test(title)) return 'job';
  if (/fellowship/i.test(title)) return 'fellowship';
  return /scholarship/i.test(title) ? 'scholarship' : 'event';
};

export const isRelevantEvent = (title: string, description: string): boolean => {
  const text = `${title} ${description}`;
  return RELEVANT_PATTERN.test(text) && !EXCLUDED_PATTERN.test(`${title} ${description}`);
};

const collectEvents = (node: unknown, found: LdEvent[]): void => {
  if (Array.isArray(node)) {
    node.forEach((child) => collectEvents(child, found));
    return;
  }
  if (!node || typeof node !== 'object') return;
  const record = node as Record<string, unknown>;
  if (record.startDate && record.name) {
    found.push(record as LdEvent);
    return;
  }
  Object.values(record).forEach((child) => collectEvents(child, found));
};

const readEvents = (html: string): LdEvent[] => {
  const found: LdEvent[] = [];
  for (const match of html.matchAll(LD_JSON_PATTERN)) {
    try {
      collectEvents(JSON.parse(match[1]), found);
    } catch {
      continue;
    }
  }
  return found;
};

const toIso = (value: string): string | null => {
  const time = Date.parse(value.length === 10 ? `${value}T00:00:00.000Z` : value);
  return Number.isNaN(time) ? null : new Date(time).toISOString();
};

const stripHtml = (value: string) => value.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

const modeOf = (attendance: string | undefined): Opportunity['mode'] => {
  if (attendance?.includes('Mixed')) return 'hybrid';
  return attendance?.includes('Online') ? 'online' : 'in-person';
};

const toOpportunity = (event: LdEvent): Opportunity | null => {
  const address = event.location?.address;
  const ticketId = event.url ? TICKET_ID_PATTERN.exec(event.url)?.[1] : undefined;
  const startsAt = event.startDate ? toIso(event.startDate) : null;
  if (!event.name || !event.url || !ticketId || !startsAt || address?.addressCountry !== 'NG') return null;

  const description = stripHtml(event.description ?? '');
  if (!isRelevantEvent(event.name, description)) return null;

  const place = [event.location?.name, address.streetAddress, address.addressLocality].filter(Boolean).join(', ');
  const city =
    detectNigerianCity(`${address.addressLocality ?? ''} ${event.location?.name ?? ''}`) ??
    (address.addressRegion ? (REGION_CODE_TO_CITY[address.addressRegion] ?? null) : null);

  return {
    id: `eventbrite-${ticketId}`,
    title: event.name,
    kind: kindOf(event.name),
    scope: 'nigeria',
    city,
    mode: modeOf(event.eventAttendanceMode),
    startsAt,
    deadline: null,
    location: place || null,
    url: event.url,
    source: 'eventbrite',
    summary: description.slice(0, SUMMARY_LENGTH) || null,
    image: event.image ?? null,
    tags: [],
    isFree: null,
    prize: null,
  };
};

export function parseEventbritePage(html: string): Opportunity[] {
  return readEvents(html)
    .map(toOpportunity)
    .filter((item): item is Opportunity => item !== null);
}

export const buildEventbriteQueries = (): string[] =>
  CITY_SLUGS.flatMap((city) => SEARCH_TERMS.map((term) => `${EVENTBRITE_ORIGIN}/nigeria--${city}/${term}/`));

export const eventbriteTasks = (): Task[] =>
  buildEventbriteQueries().map((url) => ({
    label: url.replace(`${EVENTBRITE_ORIGIN}/`, 'eventbrite '),
    run: async () => {
      const html = await fetchText(url);
      if (!html.includes('application/ld+json')) throw new Error('no structured data on page');
      return parseEventbritePage(html);
    },
  }));
