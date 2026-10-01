import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import {
  buildCalendarQuery,
  calendarIdsFrom,
  keepNigerianEvents,
  buildLumaQueries,
  parseLumaApiResponse,
  parseLumaPage,
} from '../src/luma';

const html = readFileSync(new URL('./fixtures/luma-lagos.html', import.meta.url), 'utf8');
const api = JSON.parse(readFileSync(new URL('./fixtures/luma-api.json', import.meta.url), 'utf8'));

describe('parseLumaApiResponse', () => {
  it('maps entries and exposes the next cursor', () => {
    const { items, nextCursor } = parseLumaApiResponse(api);
    expect(items.map((item) => item.title)).toEqual([
      'Walure Fit 4.0',
      'Conversations with Technologists: Lagos Edition',
      'NIGERIA GREENTECH ROUNDTABLE',
    ]);
    expect(nextCursor).toBe('cursor-abc');
  });

  it('scopes by country: Nigeria, other African countries, online', () => {
    const { items } = parseLumaApiResponse(api);
    expect(items[0].scope).toBe('nigeria');
    expect(items[1].mode).toBe('online');
    expect(items[2].scope).toBe('africa');
  });

  it('returns no cursor when there are no more pages', () => {
    expect(parseLumaApiResponse({ ...api, has_more: false }).nextCursor).toBeNull();
  });

  it('survives an unexpected payload', () => {
    expect(parseLumaApiResponse({ message: 'nope' })).toEqual({ items: [], nextCursor: null });
  });
});

describe('buildLumaQueries', () => {
  it('queries Lagos by place and by every category, with explicit coordinates', () => {
    const urls = buildLumaQueries();
    expect(urls.some((url) => url.includes('discover_place_api_id=discplace-ARF3ZNcu47bs56x'))).toBe(true);
    const lagosCategories = urls.filter((url) => url.includes('latitude=6.455'));
    expect(lagosCategories.length).toBeGreaterThanOrEqual(4);
    expect(urls.some((url) => url.includes('latitude=5.0377'))).toBe(true);
    expect(urls.some((url) => url.includes('latitude=9.0765') && !url.includes('discover_category_api_id'))).toBe(true);
    expect(urls.every((url) => url.startsWith('https://api.lu.ma/discover/get-paginated-events?'))).toBe(true);
  });
});

describe('parseLumaPage', () => {
  it('returns one opportunity per embedded event', () => {
    const items = parseLumaPage(html, 'global');
    expect(items).toHaveLength(3);
  });

  it('maps core fields and links out to luma', () => {
    const [first] = parseLumaPage(html, 'global');
    expect(first.title).toBe('n8n Lagos: Practical AI & Automation for HR');
    expect(first.url).toBe('https://luma.com/n8n-wkij');
    expect(first.source).toBe('luma');
    expect(first.startsAt).toBe('2026-10-03T12:00:00.000Z');
    expect(first.isFree).toBe(true);
  });

  it('marks events located in Nigeria with the nigeria scope', () => {
    const [first] = parseLumaPage(html, 'global');
    expect(first.scope).toBe('nigeria');
    expect(first.mode).toBe('in-person');
    expect(first.location).toContain('Lagos');
  });

  it('classifies hackathon-style names as hackathons', () => {
    const items = parseLumaPage(
      html.replace('Practical AI & Automation for HR', 'Lagos Hackathon 2026'),
      'global',
    );
    expect(items[0].kind).toBe('hackathon');
  });

  it('returns an empty list when the page has no embedded data', () => {
    expect(parseLumaPage('<html></html>', 'global')).toEqual([]);
  });
});

describe('nigerian city detection on luma events', () => {
  it('tags Lagos events with the Lagos city', () => {
    const [first] = parseLumaPage(html, 'global');
    expect(first.city).toBe('Lagos');
  });

  it('leaves city empty for online events', () => {
    const { items } = parseLumaApiResponse(api);
    expect(items[1].city).toBeNull();
  });
});

describe('organiser calendar follow-up', () => {
  it('records the organiser calendar on every parsed event', () => {
    const { items } = parseLumaApiResponse(api);
    expect(items.map((item) => item.organizerId)).toEqual(['cal-LFC4oLsmaYTtM3j', 'cal-6mGTsM4VnBmQFal', 'cal-CMNMtt7w21IC86I']);
  });

  it('collects unique calendar ids from nigerian events only', () => {
    const { items } = parseLumaApiResponse(api);
    expect(calendarIdsFrom([...items, ...items])).toEqual(['cal-LFC4oLsmaYTtM3j', 'cal-6mGTsM4VnBmQFal']);
  });

  it('caps the number of calendars it will follow', () => {
    const many = Array.from({ length: 80 }, (_, index) => ({
      ...parseLumaApiResponse(api).items[0],
      id: `luma-${index}`,
      organizerId: `cal-${index}`,
    }));
    expect(calendarIdsFrom(many)).toHaveLength(40);
  });

  it('builds a future-events query for a calendar', () => {
    expect(buildCalendarQuery('cal-abc')).toBe(
      'https://api.lu.ma/calendar/get-items?calendar_api_id=cal-abc&period=future&pagination_limit=50',
    );
  });

  it('url-encodes the calendar id', () => {
    expect(buildCalendarQuery('cal a&b')).toContain('calendar_api_id=cal%20a%26b&');
  });

  it('keeps only events located in nigeria', () => {
    const { items } = parseLumaApiResponse(api);
    expect(keepNigerianEvents(items).every((item) => item.scope === 'nigeria')).toBe(true);
    expect(keepNigerianEvents(items)).toHaveLength(2);
  });
});
