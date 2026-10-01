import { fetchJson } from './http';
import { detectNigerianCity } from './cities';
import { skipOnStatus } from './resilient';
import type { Task } from './resilient';
import type { Opportunity, OpportunityScope } from './types';

const LUMA_ORIGIN = 'https://luma.com';
const LUMA_API = 'https://api.lu.ma/discover/get-paginated-events';
const PAGE_SIZE = 50;
const MAX_PAGES = 4;
const MAX_FOLLOWED_CALENDARS = 40;
const PRIVATE_CALENDAR_STATUSES = [401, 403, 404];
const REQUEST_GAP_MS = 400;
const HACKATHON_PATTERN = /hackathon|hack\s?day|hack\s?night|buildathon|build\s?day/i;
const NEXT_DATA_PATTERN = /<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/;

const AFRICAN_COUNTRY_CODES = new Set([
  'DZ', 'AO', 'BJ', 'BW', 'BF', 'BI', 'CV', 'CM', 'CF', 'TD', 'KM', 'CG', 'CD', 'CI', 'DJ', 'EG', 'GQ', 'ER',
  'SZ', 'ET', 'GA', 'GM', 'GH', 'GN', 'GW', 'KE', 'LS', 'LR', 'LY', 'MG', 'MW', 'ML', 'MR', 'MU', 'MA', 'MZ',
  'NA', 'NE', 'RW', 'ST', 'SN', 'SC', 'SL', 'SO', 'ZA', 'SS', 'SD', 'TZ', 'TG', 'TN', 'UG', 'ZM', 'ZW',
]);

const LAGOS_PLACE_ID = 'discplace-ARF3ZNcu47bs56x';

const CATEGORIES = ['cat-tech', 'cat-ai', 'cat-crypto', 'cat-climate'];

const ANY_CATEGORY = null;

const CITIES: ReadonlyArray<{
  name: string;
  latitude: number;
  longitude: number;
  categories: ReadonlyArray<string | null>;
}> = [
  { name: 'Lagos', latitude: 6.455, longitude: 3.3841, categories: CATEGORIES },
  { name: 'Abuja', latitude: 9.0765, longitude: 7.3986, categories: [ANY_CATEGORY] },
  { name: 'Port Harcourt', latitude: 4.8156, longitude: 7.0498, categories: [ANY_CATEGORY] },
  { name: 'Ibadan', latitude: 7.3775, longitude: 3.947, categories: [ANY_CATEGORY] },
  { name: 'Uyo', latitude: 5.0377, longitude: 7.9128, categories: [ANY_CATEGORY] },
];

interface LumaEntry {
  event?: {
    api_id?: string;
    name?: string;
    url?: string;
    start_at?: string;
    location_type?: string;
    cover_url?: string;
    geo_address_info?: {
      country_code?: string;
      region?: string;
      city?: string;
      city_state?: string;
      address?: string;
    };
  };
  calendar?: { api_id?: string };
  hosts?: Array<{ name?: string }>;
  ticket_info?: { is_free?: boolean };
}

const scopeFor = (countryCode: string | undefined, fallback: OpportunityScope): OpportunityScope => {
  if (countryCode === 'NG') return 'nigeria';
  if (countryCode && AFRICAN_COUNTRY_CODES.has(countryCode)) return 'africa';
  return fallback;
};

const toOpportunity = (entry: LumaEntry, defaultScope: OpportunityScope): Opportunity | null => {
  const event = entry.event;
  if (!event?.api_id || !event.name || !event.url) return null;

  const geo = event.geo_address_info;
  const isOnline = event.location_type === 'online';
  const hostNames = (entry.hosts ?? []).map((host) => host.name).filter(Boolean);

  const scope = scopeFor(geo?.country_code, defaultScope);
  const city =
    scope === 'nigeria' && !isOnline
      ? detectNigerianCity([geo?.region, geo?.city, geo?.city_state, geo?.address].filter(Boolean).join(', '))
      : null;

  return {
    id: `luma-${event.api_id}`,
    title: event.name,
    kind: HACKATHON_PATTERN.test(event.name) ? 'hackathon' : 'event',
    scope,
    city,
    organizerId: entry.calendar?.api_id ?? null,
    mode: isOnline ? 'online' : 'in-person',
    startsAt: event.start_at ?? null,
    deadline: null,
    location: isOnline ? 'Online' : [geo?.address, geo?.city_state].filter(Boolean).join(', ') || null,
    url: `${LUMA_ORIGIN}/${event.url}`,
    source: 'luma',
    summary: hostNames.length > 0 ? `Hosted by ${hostNames.join(', ')}` : null,
    image: event.cover_url ?? null,
    tags: [],
    isFree: entry.ticket_info?.is_free ?? null,
    prize: null,
  };
};

const toOpportunities = (entries: LumaEntry[], defaultScope: OpportunityScope): Opportunity[] =>
  entries
    .map((entry) => toOpportunity(entry, defaultScope))
    .filter((item): item is Opportunity => item !== null);

export function parseLumaPage(html: string, defaultScope: OpportunityScope): Opportunity[] {
  const raw = NEXT_DATA_PATTERN.exec(html)?.[1];
  if (!raw) return [];
  try {
    const entries = JSON.parse(raw)?.props?.pageProps?.initialData?.data?.events;
    return Array.isArray(entries) ? toOpportunities(entries, defaultScope) : [];
  } catch {
    return [];
  }
}

interface LumaApiResponse {
  entries?: LumaEntry[];
  has_more?: boolean;
  next_cursor?: string;
}

export function parseLumaApiResponse(body: unknown): { items: Opportunity[]; nextCursor: string | null } {
  const response = body as LumaApiResponse;
  if (!Array.isArray(response?.entries)) return { items: [], nextCursor: null };
  return {
    items: toOpportunities(response.entries, 'global'),
    nextCursor: response.has_more && response.next_cursor ? response.next_cursor : null,
  };
}

export function buildLumaQueries(): string[] {
  const placeQuery = `${LUMA_API}?discover_place_api_id=${LAGOS_PLACE_ID}&pagination_limit=${PAGE_SIZE}`;
  const categoryQueries = CITIES.flatMap((city) =>
    city.categories.map(
      (category) =>
        `${LUMA_API}?${category ? `discover_category_api_id=${category}&` : ''}latitude=${city.latitude}` +
        `&longitude=${city.longitude}&pagination_limit=${PAGE_SIZE}`,
    ),
  );
  return [placeQuery, ...categoryQueries];
}

const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function collectQuery(baseUrl: string): Promise<Opportunity[]> {
  const collected: Opportunity[] = [];
  let cursor: string | null = null;

  for (let page = 0; page < MAX_PAGES; page += 1) {
    const url: string = cursor ? `${baseUrl}&pagination_cursor=${encodeURIComponent(cursor)}` : baseUrl;
    const body = await fetchJson<unknown>(url);
    if (!Array.isArray((body as LumaApiResponse)?.entries)) throw new Error('unexpected Luma response shape');

    const { items, nextCursor } = parseLumaApiResponse(body);
    collected.push(...items);
    if (!nextCursor) break;
    cursor = nextCursor;
    await pause(REQUEST_GAP_MS);
  }

  return collected;
}

export const lumaTasks = (): Task[] =>
  buildLumaQueries().map((url) => ({ label: url.replace(`${LUMA_API}?`, 'luma '), run: () => collectQuery(url) }));

export const calendarIdsFrom = (items: readonly Opportunity[]): string[] => {
  const ids = items
    .filter((item) => item.scope === 'nigeria' && item.organizerId)
    .map((item) => item.organizerId as string);
  return [...new Set(ids)].slice(0, MAX_FOLLOWED_CALENDARS);
};

export const buildCalendarQuery = (calendarId: string): string =>
  `https://api.lu.ma/calendar/get-items?calendar_api_id=${encodeURIComponent(calendarId)}&period=future&pagination_limit=${PAGE_SIZE}`;

export const keepNigerianEvents = (items: readonly Opportunity[]): Opportunity[] =>
  items.filter((item) => item.scope === 'nigeria');

export const lumaFollowUpTasks = (found: readonly Opportunity[]): Task[] =>
  calendarIdsFrom(found).map((calendarId) => ({
    label: `luma calendar ${calendarId}`,
    run: skipOnStatus(PRIVATE_CALENDAR_STATUSES, async () => {
      const body = await fetchJson<unknown>(buildCalendarQuery(calendarId));
      if (!Array.isArray((body as LumaApiResponse)?.entries)) throw new Error('unexpected Luma response shape');
      return keepNigerianEvents(parseLumaApiResponse(body).items);
    }),
  }));
