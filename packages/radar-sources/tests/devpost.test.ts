import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { LOCAL_SEARCH_TERMS, parseDevpostDates, parseDevpostResponse } from '../src/devpost';

const body = JSON.parse(readFileSync(new URL('./fixtures/devpost.json', import.meta.url), 'utf8'));

describe('parseDevpostDates', () => {
  it('parses a same-month range', () => {
    expect(parseDevpostDates('Sep 05 - 30, 2026')).toEqual({
      start: '2026-09-05T00:00:00.000Z',
      end: '2026-09-30T00:00:00.000Z',
    });
  });

  it('parses a cross-month range', () => {
    expect(parseDevpostDates('Jul 11 - Oct 01, 2026')).toEqual({
      start: '2026-07-11T00:00:00.000Z',
      end: '2026-10-01T00:00:00.000Z',
    });
  });

  it('parses a range that crosses the year boundary', () => {
    expect(parseDevpostDates('Dec 20 - Jan 05, 2027')).toEqual({
      start: '2026-12-20T00:00:00.000Z',
      end: '2027-01-05T00:00:00.000Z',
    });
  });

  it('returns null for unparseable text', () => {
    expect(parseDevpostDates('soon')).toBeNull();
  });
});

describe('parseDevpostResponse', () => {
  it('maps hackathons with deadline, prize and link', () => {
    const items = parseDevpostResponse(body);
    expect(items).toHaveLength(body.hackathons.length);
    const first = items[0];
    expect(first.kind).toBe('hackathon');
    expect(first.source).toBe('devpost');
    expect(first.scope).toBe('global');
    expect(first.mode).toBe('online');
    expect(first.deadline).toBe('2026-09-30T00:00:00.000Z');
    expect(first.prize).toBe('$100');
    expect(first.url).toBe('https://next-byte-hacks-v4.devpost.com/');
    expect(first.image?.startsWith('https://')).toBe(true);
  });

  it('skips invite-only hackathons', () => {
    const copy = structuredClone(body);
    copy.hackathons[0].invite_only = true;
    expect(parseDevpostResponse(copy)).toHaveLength(body.hackathons.length - 1);
  });

  it('returns an empty list for an unexpected payload', () => {
    expect(parseDevpostResponse({})).toEqual([]);
  });

  it('scopes hackathons held in a Nigerian city to nigeria, with the city', () => {
    const copy = structuredClone(body);
    copy.hackathons[0].displayed_location = { location: 'NCC Digital Park, University of Ibadan' };
    const [first] = parseDevpostResponse(copy);
    expect(first.scope).toBe('nigeria');
    expect(first.city).toBe('Ibadan');
    expect(first.mode).toBe('in-person');
  });

  it('recognises a bare Nigeria location without a known city', () => {
    const copy = structuredClone(body);
    copy.hackathons[0].displayed_location = { location: 'Kano, Nigeria' };
    const [first] = parseDevpostResponse(copy);
    expect(first.scope).toBe('nigeria');
    expect(first.city).toBeNull();
  });

  it('does not double the scheme when the thumbnail is already absolute', () => {
    const copy = structuredClone(body);
    copy.hackathons[0].thumbnail_url = 'https://cdn.example.com/a.png';
    expect(parseDevpostResponse(copy)[0].image).toBe('https://cdn.example.com/a.png');
  });

  it('keeps online hackathons global', () => {
    const [first] = parseDevpostResponse(body);
    expect(first.scope).toBe('global');
    expect(first.city).toBeNull();
  });
});

describe('localSearchTerms', () => {
  it('searches nigeria plus each supported city', () => {
    expect(LOCAL_SEARCH_TERMS).toEqual(['nigeria', 'lagos', 'abuja', 'port harcourt', 'ibadan', 'uyo']);
  });
});
