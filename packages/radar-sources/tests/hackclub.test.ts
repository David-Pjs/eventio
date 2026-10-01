import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { parseHackClubEvents } from '../src/hackclub';

const body = JSON.parse(readFileSync(new URL('./fixtures/hackclub.json', import.meta.url), 'utf8'));

describe('parseHackClubEvents', () => {
  it('keeps only virtual hackathons, which anyone can join from anywhere', () => {
    const items = parseHackClubEvents(body);
    expect(items).toHaveLength(body.filter((event: { virtual: boolean }) => event.virtual).length);
    expect(items.length).toBeGreaterThan(0);
    expect(items.every((item) => item.mode === 'online')).toBe(true);
  });

  it('maps core fields and links to the event website', () => {
    const [first] = parseHackClubEvents(body);
    expect(first.source).toBe('hackclub');
    expect(first.kind).toBe('hackathon');
    expect(first.scope).toBe('global');
    expect(first.url.startsWith('https://')).toBe(true);
    expect(first.startsAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(first.isFree).toBe(true);
  });

  it('tags hack club and mlh events', () => {
    const copy = structuredClone(body);
    copy[0].mlhAssociated = true;
    copy[0].hack_club_event = true;
    const [first] = parseHackClubEvents(copy);
    expect(first.tags).toEqual(expect.arrayContaining(['hack club', 'mlh']));
  });

  it('does not throw on an invalid start date', () => {
    const copy = structuredClone(body);
    copy[0].start = 'not a date';
    expect(parseHackClubEvents(copy)[0].startsAt).toBeNull();
  });

  it('returns an empty list for an unexpected payload', () => {
    expect(parseHackClubEvents({})).toEqual([]);
    expect(parseHackClubEvents(null)).toEqual([]);
  });
});
